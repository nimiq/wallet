import { type SignedTransaction } from '@nimiq/hub-api';

import { usePolicy } from '../composables/usePolicy';
import { signSwitchValidatorTransactions, signUnstakingTransactions } from '../hub';
import { getNetworkClient, sendTransaction as sendTx, waitForTransactionConfirmation } from '../network';
import { useNetworkStore } from '../stores/Network';
import { Stake, useStakingStore } from '../stores/Staking';
import { useTransactionsStore } from '../stores/Transactions';
import { startSwitchValidator, startUnstaking } from './AlbatrossWatchtower';
import { reportToSentry } from './Sentry';
import { ValidatorRef, validatorLabel } from './StakingUtils';

/**
 * The two watchtower flows: several transactions signed in one interaction, the first broadcast now
 * and the rest handed to the watchtower, which sends them once the deactivation has matured. Both
 * are started from more than one place — unstaking from the staking graph and from a payout blocked
 * by sub-minimum stake, a switch from the validator list and from a switch that lost its race with
 * new staking rewards — so what happens on chain lives here rather than in the components.
 *
 * What the user is shown is left to the caller, which is the only part that differs between entry
 * points.
 */

// 'cancelled' — the user closed the Hub without signing; nothing happened on chain.
// 'registered' — the deactivation is on chain and the watchtower accepted the follow-up.
// 'manual'     — the deactivation is on chain but nobody will send the follow-up, so once the
//                cooldown ends the user has to finish by hand.
export type WatchtowerOperationResult = 'cancelled' | 'registered' | 'manual';

type Policy = Awaited<ReturnType<typeof usePolicy>>;

// The watchtower broadcasts the follow-up one full epoch after the deactivation lands, and rejects a
// transaction that is not valid at that height with a misleading "Transaction has invalid value".
function followUpHeightAfter(deactivationHeight: number, policy: Policy): number {
    return policy.electionBlockAfter(deactivationHeight) + policy.blocksPerEpoch();
}

async function prepare(stakerAddress: string) {
    const [{ Address, TransactionBuilder }, networkId, policy] = await Promise.all([
        import('@nimiq/core'),
        getNetworkClient().then((client) => client.getNetworkId()),
        usePolicy(),
    ]);
    // Read after the awaits so the height is the one the transactions are actually built against.
    const currentHeight = useNetworkStore().state.height;

    return {
        Address,
        builder: TransactionBuilder,
        networkId,
        policy,
        height: currentHeight,
        sender: Address.fromUserFriendlyAddress(stakerAddress),
        // Derived from the current height rather than the deactivation's own (still unknown) block, which
        // keeps ours <= the watchtower's `must_be_valid_at`, since the deactivation lands at this height or
        // later.
        followUpHeight: followUpHeightAfter(currentHeight, policy),
    };
}

/**
 * The tail both flows share, once their transactions are signed: broadcast the deactivation, record
 * the operation, wait for it to be final, hand the follow-up to the watchtower, record how that went.
 */
async function broadcastAndRegister<R extends { deactivationTxHash: string }>(
    deactivation: SignedTransaction,
    record: R,
    save: (record: R & { watchtowerRegistered?: boolean, watchtowerJobId?: string }) => void,
    register: () => Promise<string | undefined | null>,
): Promise<WatchtowerOperationResult> {
    const deactivationResult = await sendTx(deactivation);
    if (!deactivationResult || deactivationResult.executionResult === false) {
        throw new Error('Deactivation transaction failed');
    }

    // Record before talking to the watchtower: the deactivation is on-chain and the follow-up is
    // signed, so the gates must hold even if the registration below fails. Recording also supersedes
    // the record and the cached job of whatever operation this one replaces.
    save(record);

    // The watchtower won't accept the request before the deactivation is finalized.
    try {
        await waitForTransactionConfirmation(record.deactivationTxHash, { requireConfirmed: true });
    } catch (confirmationError: any) {
        // Not fatal on its own: the watchtower may still accept it, and a rejection is handled below.
        reportToSentry(confirmationError);
        // eslint-disable-next-line no-console
        console.warn('Transaction confirmation timeout:', confirmationError);
    }

    let watchtowerRegistered = false;
    let watchtowerJobId: string | undefined;
    try {
        // `null` is the watchtower answering that it is not configured, so nothing was sent — the
        // opposite of an accepted job, and it must not read as one. An id-less answer did queue it.
        const jobId = await register();
        watchtowerRegistered = jobId !== null;
        watchtowerJobId = jobId ?? undefined;
    } catch (watchtowerError: any) {
        // The deactivation went through; the watchtower is only the automation on top of it, and the
        // user can still finish by hand once the cooldown ends.
        reportToSentry(watchtowerError);
        // eslint-disable-next-line no-console
        console.warn('Watchtower registration failed:', watchtowerError);
    }
    save({ ...record, watchtowerRegistered, watchtowerJobId });

    return watchtowerRegistered ? 'registered' : 'manual';
}

/**
 * Deactivate stake, then have the watchtower retire and remove it once the cooldown ends.
 *
 * `activeBalanceAfter` is what stays staked: 0 for a full unstake, the remainder for a partial one.
 * Retire and remove name totals rather than deltas, so existing inactive and retired balances are
 * swept along with the newly deactivated amount.
 */
export async function startWatchtowerUnstaking(input: {
    // One snapshot for both the balances and the staker address, captured by the caller before the
    // Hub round-trip during which the active address can change.
    stake: Stake,
    validator: ValidatorRef,
    activeBalanceAfter: number,
}): Promise<WatchtowerOperationResult> {
    const { stake, validator, activeBalanceAfter } = input;
    const { setUnstakingOperation } = useStakingStore();
    const { builder, networkId, height, sender, followUpHeight } = await prepare(stake.address);

    const deactivatedAmount = stake.activeBalance - activeBalanceAfter;
    const totalInactiveAfterDeactivation = stake.inactiveBalance + deactivatedAmount;
    const totalRetiredAfterRetire = stake.retiredBalance + totalInactiveAfterDeactivation;

    const deactivationTx = builder.newSetActiveStake(
        sender,
        BigInt(activeBalanceAfter),
        BigInt(0),
        height,
        networkId,
    );
    const retireTx = builder.newRetireStake(
        sender,
        BigInt(totalInactiveAfterDeactivation),
        BigInt(0),
        followUpHeight,
        networkId,
    );
    // It is only allowed to remove the complete retired balance, not parts of it, and the remove can
    // only be included after the retire it depends on.
    const removeTx = builder.newRemoveStake(
        sender,
        BigInt(totalRetiredAfterRetire),
        BigInt(0),
        followUpHeight + 1,
        networkId,
    );

    const signedTxs = await signUnstakingTransactions({
        sender: stake.address,
        // FROM = validator (rendered on the dashed "current" card in the keyguard).
        // TO = user wallet — the Hub sets the signer label.
        senderLabel: validatorLabel(validator),
        transactions: [deactivationTx.serialize(), retireTx.serialize(), removeTx.serialize()],
        validatorAddress: validator.address,
        validatorImageUrl: validator.logo,
    }).catch((error) => {
        throw new Error(error?.data || error?.message || error);
    });

    if (!signedTxs) return 'cancelled';

    return broadcastAndRegister(
        signedTxs[0],
        { startedAtBlock: height, deactivationTxHash: signedTxs[0].hash },
        (record) => setUnstakingOperation(stake.address, record),
        () => startUnstaking({
            stakerAddress: stake.address,
            inactiveStakeTxHash: signedTxs[0].hash,
            retireTx: signedTxs[1].serializedTx,
            unstakeTx: signedTxs[2].serializedTx,
        }),
    );
}

/**
 * Deactivate all stake, then have the watchtower re-delegate it to `target` once the cooldown ends.
 *
 * Works from a standing stake and from a switch that has to be started over: `set-active-stake` to
 * zero sweeps whatever is active — including staking rewards that arrived mid-cooldown and made the
 * previous update-staker unsendable — back into the inactive balance it re-delegates.
 */
export async function startWatchtowerSwitch(input: {
    stakerAddress: string,
    from: ValidatorRef,
    target: ValidatorRef,
}): Promise<WatchtowerOperationResult> {
    const { stakerAddress, from, target } = input;
    const { getSwitchOperation, setSwitchOperation } = useStakingStore();
    // The switch this one supersedes, if any, read before the Hub round-trip like the staker address.
    const replaced = getSwitchOperation(stakerAddress);
    const { Address, builder, networkId, policy, height, sender, followUpHeight } = await prepare(stakerAddress);

    const deactivateTx = builder.newSetActiveStake(
        sender,
        BigInt(0),
        BigInt(0),
        height,
        networkId,
    );
    const updateTx = builder.newUpdateStaker(
        sender,
        Address.fromUserFriendlyAddress(target.address),
        true, // reactivateAllStake
        BigInt(0),
        followUpHeight,
        networkId,
    );

    const signedTxs = await signSwitchValidatorTransactions({
        sender: stakerAddress,
        transactions: [deactivateTx.serialize(), updateTx.serialize()],
        senderLabel: validatorLabel(from),
        recipientLabel: validatorLabel(target),
        validatorImageUrl: target.logo,
        fromValidatorAddress: from.address,
        fromValidatorImageUrl: from.logo,
    }).catch((error) => {
        throw new Error(error?.data || error?.message || error);
    });

    if (!signedTxs) return 'cancelled';

    return broadcastAndRegister(
        signedTxs[0],
        {
            targetValidatorAddress: target.address,
            targetValidatorName: target.name,
            startedAtBlock: height,
            deactivationTxHash: signedTxs[0].hash,
        },
        (record) => setSwitchOperation(stakerAddress, record),
        () => {
            // Restarting towards the same target within the epoch of the deactivation being replaced signs the
            // very update-staker the watchtower already holds: same validity height, and signatures are
            // deterministic. The watchtower refuses the duplicate (417, which it also answers for its own
            // errors), yet its job still sends that transaction, since a deactivation landing in that epoch
            // leaves the release height unchanged. So that job is kept rather than registered again. One that
            // landed past the next election block moved the release instead: the watchtower then rejects the
            // request as invalid, which reports the manual step. A block not known yet (the confirmation wait
            // timed out) keeps the job, which the sync follows by id like any other.
            const landedAt = useTransactionsStore().state.transactions[signedTxs[0].hash]?.blockHeight;
            const hasSameFollowUp = (block: number) => followUpHeightAfter(block, policy) === followUpHeight;
            if (replaced?.watchtowerJobId && replaced.targetValidatorAddress === target.address
                && hasSameFollowUp(replaced.startedAtBlock)
                && (landedAt === undefined || hasSameFollowUp(landedAt))) {
                return Promise.resolve(replaced.watchtowerJobId);
            }
            return startSwitchValidator({
                stakerAddress,
                deactivationTxHash: signedTxs[0].hash,
                updateStakerTx: signedTxs[1].serializedTx,
            });
        },
    );
}

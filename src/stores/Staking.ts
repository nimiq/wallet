import { nonReactive } from '@vue/composition-api';
import Vue from 'vue';
import { getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';
import { useFiatStore } from './Fiat';
import { useNetworkStore } from './Network';
import { TransactionState, useTransactionsStore } from './Transactions';
import { usePolicy } from '../composables/usePolicy';
import { calculateStakingReward } from '../lib/AlbatrossMath';
import { fetchWatchtowerJob, fetchWatchtowerJobsForStaker, WatchtowerJob } from '../lib/AlbatrossWatchtower';
import {
    CryptoCurrency,
    FiatCurrency,
    FIAT_API_PROVIDER_TX_HISTORY,
    FIAT_PRICE_UNAVAILABLE,
} from '../lib/Constants';
import {
    getEndOfMonthTimestamp,
    isCurrentMonthAndYear,
    toValidatorRef,
    validatorLabel,
    ValidatorRef,
} from '../lib/StakingUtils';

export type StakingState = {
    chainValidators: Record<string, RawValidator>,
    apiValidators: Record<string, ApiValidator>,
    stakeByAddress: Record<string, Stake>,
    stakingEventsByAddress: Record<string, AggregatedRestakingEvent[]>,
    cachedMonthlyRewardsByAddress: Record<string, Map<string, MonthlyReward>>,
    // What the watchtower holds for a staker's pending payout: a job (possibly started from another
    // browser, which then has no record of its own), or `null` once the watchtower conclusively
    // holds none. Absent while not asked or inconclusive. Not persisted (see storage.ts): it is
    // re-derived from the watchtower after every start.
    watchtowerJobByAddress: Record<string, WatchtowerJob | null>,
}

export type AggregatedRestakingEvent = {
    /* eslint-disable camelcase */
    sender_address: string,
    time_window: string, // ISO 8601 encoded
    aggregated_value: number,
    /* eslint-enable camelcase */
}

export interface MonthlyReward {
    total: number;
    count: number;
    validators: string[];
    fiatValue?: Partial<Record<FiatCurrency, number | typeof FIAT_PRICE_UNAVAILABLE>>;
}

export type Stake = {
    address: string,
    activeBalance: number, // activeBalance (does not include inactiveBalance)
    inactiveBalance: number,
    inactiveRelease?: number,
    // Election block at which the last deactivation takes effect (at or after its confirming macro
    // block). Absent on stakes stored before it was recorded.
    inactiveFrom?: number,
    validator?: string,
    retiredBalance: number,
}

export type ApiValidator = {
    id: number,
    name: string,
    address: string,
    description: string | null,
    fee: number,
    payoutType: 'none' | 'direct' | 'restake',
    payoutSchedule: string,
    isMaintainedByNimiq: boolean,
    website: string | null,
    logo?: string,
    hasDefaultLogo: boolean,
    accentColor: string,
    unstableScore: number | null,
    dominanceRatioViaBalance: number,
    dominanceRatioViaSlots: number,
    // contact?: Record<string, string> | null,
    score: {
        total: number | null,
        dominance: 0,
        availability: number | null,
        reliability: number | null,
    },
}

export type RawValidator = {
    address: string,
    active: boolean,
    balance: number,
    rewardAddress?: string,

    // Calculated fields
    dominance: number, // Percentage
}

export type RegisteredValidator = RawValidator & ApiValidator & {
    // Calculated fields
    annualReward: number, // Percentage
}

export type Validator = RawValidator | RegisteredValidator;

// Both records are written as soon as the deactivation is on-chain, so the gates hold while the
// watchtower is still being asked. `watchtowerRegistered` is the outcome of that request: `true`
// once it accepted the queued follow-up, `false` when the request failed (rejected or never
// answered), and left undefined while it is unknown — still in flight, or a record written before
// the flag existed. Only an explicit `false` counts as a failed registration.
// `watchtowerJobId` is the job the watchtower answered with; `syncWatchtowerOperation` follows it
// in `watchtowerJobByAddress`, as an accepted job can still fail on-chain.
export type SwitchValidatorRecord = {
    targetValidatorAddress: string,
    targetValidatorName?: string,
    startedAtBlock: number,
    deactivationTxHash: string,
    watchtowerRegistered?: boolean,
    watchtowerJobId?: string,
}

export type UnstakingRecord = {
    startedAtBlock: number,
    deactivationTxHash: string,
    watchtowerRegistered?: boolean,
    watchtowerJobId?: string,
}

// Retired-but-not-removed stake (inactive 0, retired > 0) is still the watchtower's job: only a
// snapshot with neither balance means the payout went through.
function hasPendingPayout(stake: Stake): boolean {
    return stake.inactiveBalance > 0 || stake.retiredBalance > 0;
}

// Watchtower operations in flight, keyed per staker address. They live in localStorage (not in the
// persisted store state, see storage.ts) and are reconciled against every fresh chain snapshot.
const SWITCH_VALIDATOR_LS_PREFIX = 'switchValidator:';
const UNSTAKING_LS_PREFIX = 'unstaking:';

// "No job for this staker" is only conclusive once every flow that could still register one has
// had its chance. A flow registers when the deactivation is confirmed (the macro block after its
// transaction) and gives up waiting for that 120 s after broadcast, registering anyway, so past the
// confirming macro block plus this margin (blocks, at about one per second: the timeout, network
// latency and slack) nothing more can arrive.
const WATCHTOWER_REGISTRATION_MARGIN = 300;

type Policy = Awaited<ReturnType<typeof usePolicy>>;

// The current deactivation's transaction: the `set-active-stake` this address sent whose election
// block is the stake's `inactiveFrom` — that is how the contract derives it — so a previous cycle's
// transaction can't stand in while the current one is still missing from our history. A later
// set-active-stake in the same epoch only moves the anchor later. A block height means included;
// a failed one registers nothing and is skipped.
function currentDeactivationBlock(stake: Stake, policy: Policy): number | undefined {
    if (stake.inactiveFrom === undefined) return undefined;
    const heights = Object.values(useTransactionsStore().state.transactions)
        .filter((tx) => tx.sender === stake.address && tx.data.type === 'set-active-stake'
            && tx.blockHeight !== undefined && tx.executionResult !== false
            && policy.electionBlockAfter(tx.blockHeight) === stake.inactiveFrom)
        .map((tx) => tx.blockHeight!);
    return heights.length ? Math.max(...heights) : undefined;
}

// Without the deactivation in our history the answer is "not yet" — the last answer stands, as for a
// missing job or capped lists. (`inactiveFrom` alone is no anchor: it is the next election block,
// up to an epoch after the deactivation.)
function isDeactivationSettled(stake: Stake, policy: Policy): boolean {
    if (!stake.inactiveBalance) return true; // retired-only stake: its retire already went through
    const deactivationBlock = currentDeactivationBlock(stake, policy);
    if (deactivationBlock === undefined) return false;
    return useNetworkStore().state.height > policy.macroBlockAfter(deactivationBlock) + WATCHTOWER_REGISTRATION_MARGIN;
}

// A job from an operation that is already over (the user re-delegated or paid out by hand, and its
// queued transaction failed later) must not be taken for the payout pending now.
function belongsToCurrentPayout(job: WatchtowerJob, stake: Stake): boolean {
    if (job.status === 'pending') return true;
    if (job.status !== 'failed' || job.atHeight === undefined || stake.inactiveFrom === undefined) return false;
    return job.atHeight > stake.inactiveFrom;
}

// One sync per address at a time, so a slow answer can't overwrite a newer one.
const syncingAddresses = new Set<string>();

function readRecord<T>(prefix: string, address: string): T | null {
    try {
        const raw = localStorage.getItem(`${prefix}${address}`);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

// Both writers return whether anything changed, so callers bump the reactivity trigger — and re-run
// every getter reading these records — only on a real change. A storage error (quota, private mode)
// costs the record, never a staking flow whose transactions are already on-chain.
function writeRecord<T>(prefix: string, address: string, record: T): boolean {
    const key = `${prefix}${address}`;
    const serialized = JSON.stringify(record);
    try {
        if (localStorage.getItem(key) === serialized) return false;
        localStorage.setItem(key, serialized);
        return true;
    } catch {
        return false;
    }
}

function removeRecord(prefix: string, address: string): boolean {
    const key = `${prefix}${address}`;
    try {
        if (localStorage.getItem(key) === null) return false;
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function isTransactionPending(hash: string): boolean {
    const tx = useTransactionsStore().state.transactions[hash];
    return !!tx && (tx.state === TransactionState.NEW || tx.state === TransactionState.PENDING);
}

function hasTransactionFailed(hash: string): boolean {
    const tx = useTransactionsStore().state.transactions[hash];
    return !!tx && (tx.state === TransactionState.EXPIRED || tx.state === TransactionState.INVALIDATED);
}

export type StakingScoringRules = any

export const useStakingStore = createStore({
    id: 'staking',
    state: () => ({
        chainValidators: {},
        apiValidators: {},
        stakeByAddress: {},
        stakingEventsByAddress: {},
        cachedMonthlyRewardsByAddress: {},
        watchtowerJobByAddress: {},
        // Bumped on every switch/unstaking-record write so the getters reading those records from
        // localStorage re-evaluate. Drop once the records move into reactive state.
        operationRecordTrigger: 0,
    } as StakingState & { operationRecordTrigger: number }),
    getters: {
        validators: (state): Readonly<Record<string, Validator>> => {
            const validators: Record<string, Validator> = {};

            const validatorEntries = Object.entries(state.chainValidators);
            const activeStake = validatorEntries.reduce((sum, entry) => sum + entry[1].balance, 0);

            for (const [address, validator] of validatorEntries) {
                const apiValidator = state.apiValidators[address];
                validators[address] = {
                    ...validator,
                    ...apiValidator,
                    ...(apiValidator ? {
                        annualReward: calculateStakingReward(apiValidator.fee, activeStake),
                    } : {}),
                };
            }

            return validators;
        },
        validatorsList: (state, { validators }): Readonly<Validator[]> => Object.values(validators.value),

        // stake object for each addresses
        stakesByAddress: (state): Readonly<Record<string, Stake>> => state.stakeByAddress,
        // total stake amount for each address
        totalStakesByAddress: (state): Readonly<Record<string, number>> => {
            const totals: Record<string, number> = {};
            for (const [address, stake] of Object.entries(state.stakeByAddress)) {
                totals[address] = stake.activeBalance + stake.inactiveBalance + stake.retiredBalance;
            }
            return totals;
        },

        // stake object for the active address
        activeStake: (state): Readonly<Stake | null> => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;

            return state.stakeByAddress[activeAddress.value] || null;
        },
        // total stake amount for the active address
        totalActiveStake: (state, { activeStake }): Readonly<number> => {
            const stake = activeStake.value as Stake | null;

            return stake
                ? stake.activeBalance + stake.inactiveBalance + stake.retiredBalance
                : 0;
        },

        // cumulated stake object for each account
        stakesByAccount: (state): Readonly<Record<string, Stake>> => {
            const { accountInfos } = useAccountStore();
            const accounts = Object.values(accountInfos.value);

            const stakes: Record<string, Stake> = {};
            for (const accountInfo of accounts) { // for each account
                for (const address of accountInfo.addresses) { // for each address
                    if (state.stakeByAddress[address]) { // if there is a stake for this address
                        if (!stakes[accountInfo.id]) { // if there is no stake for this account
                            stakes[accountInfo.id] = { ...state.stakeByAddress[address] }; // create a new stake object
                        } else { // if there is a stake for this account
                            stakes[accountInfo.id].activeBalance += state.stakeByAddress[address].activeBalance;
                            stakes[accountInfo.id].inactiveBalance += state.stakeByAddress[address].inactiveBalance;
                            stakes[accountInfo.id].retiredBalance += state.stakeByAddress[address].retiredBalance;
                        }
                    }
                }
                if (!stakes[accountInfo.id]) {
                    stakes[accountInfo.id] = {
                        address: accountInfo.id,
                        activeBalance: 0,
                        inactiveBalance: 0,
                        retiredBalance: 0,
                    };
                }
            }
            return stakes;
        },
        // total stake amount for each account
        totalStakesByAccount: (state, { stakesByAccount }): Readonly<Record<string, number>> => {
            const stakes = Object.entries(stakesByAccount.value as Record<string, Stake>);
            const stakeByAccount: Record<string, number> = {};

            for (const [accountId, stake] of stakes) {
                stakeByAccount[accountId] = stake.activeBalance + stake.inactiveBalance + stake.retiredBalance;
            }

            return stakeByAccount;
        },

        // cumulated stake object for the active account
        accountStake: (state, { stakesByAccount }): Readonly<Stake | null> => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return null;

            return (stakesByAccount.value as Record<string, Stake>)[activeAccountId.value] ?? null;
        },
        // total stake amount for the active account
        totalAccountStake: (state, { totalStakesByAccount }) => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return 0;

            return (totalStakesByAccount.value as Record<string, number>)[activeAccountId.value] ?? 0;
        },

        // validator object for the active address, if staking
        activeValidator: (state, { activeStake, validators }): Validator | null => {
            const stake = activeStake.value as Stake | null;
            if (!stake || !stake.validator) return null;

            return validators.value[stake.validator] || {
                address: stake.validator,
                dominance: 0,
                active: false,
            };
        },

        activeWatchtowerJob: (state): WatchtowerJob | null | undefined => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return undefined;
            return state.watchtowerJobByAddress[activeAddress.value];
        },
        activeSwitchOperation: (state): Readonly<SwitchValidatorRecord | null> => {
            void state.operationRecordTrigger; // eslint-disable-line no-void
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;
            return readRecord<SwitchValidatorRecord>(SWITCH_VALIDATOR_LS_PREFIX, activeAddress.value);
        },
        // Deactivated stake still at the old validator per our record, or with a watchtower switch job. Not
        // keyed on `activeBalance === 0`: a reward landing as active stake mid-cooldown must not read
        // as "switch done" (it makes the queued update-staker fail on-chain, the record stays relevant).
        isSwitchingValidator: (state, { activeStake, activeSwitchOperation, activeWatchtowerJob }): boolean => {
            const record = activeSwitchOperation.value as SwitchValidatorRecord | null;
            const stake = activeStake.value as Stake | null;
            if (!stake || stake.inactiveBalance <= 0) return false;
            if (record) return stake.validator !== record.targetValidatorAddress;
            // Started in another browser: no record here, only the watchtower's job.
            return (activeWatchtowerJob.value as WatchtowerJob | null | undefined)?.kind === 'switch';
        },
        canManuallyActivateSwitch: (state, { activeStake, activeSwitchOperation }) => {
            const record = activeSwitchOperation.value as SwitchValidatorRecord | null;
            const stake = activeStake.value as Stake | null;
            const { state: networkState } = useNetworkStore();
            if (!record || !stake) return false;
            if (stake.activeBalance !== 0 || stake.inactiveBalance <= 0) return false;
            if (!stake.inactiveRelease || stake.inactiveRelease > networkState.height) return false;
            return stake.validator !== record.targetValidatorAddress;
        },
        activeUnstakingOperation: (state): Readonly<UnstakingRecord | null> => {
            void state.operationRecordTrigger; // eslint-disable-line no-void
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;
            return readRecord<UnstakingRecord>(UNSTAKING_LS_PREFIX, activeAddress.value);
        },
        // True while the watchtower still owes the payout. The record or job alone is not enough — a
        // deactivation that never landed must not block anything.
        isUnstaking: (state, { activeStake, activeUnstakingOperation, activeWatchtowerJob }): boolean => {
            const record = activeUnstakingOperation.value as UnstakingRecord | null;
            const stake = activeStake.value as Stake | null;
            if (!stake) return false;
            const job = activeWatchtowerJob.value as WatchtowerJob | null | undefined;
            if (!record && job?.kind !== 'unstake') return false;
            return hasPendingPayout(stake);
        },
        // The watchtower operation that currently owns the stake, if any. Starting another staking
        // operation on top would orphan its queued transactions, and the watchtower does not reject
        // overlapping requests itself — so this is what every such entry point must be gated on.
        pendingOperation: (state, { activeStake, isSwitchingValidator, isUnstaking }): 'switch' | 'unstake' | null => {
            if (isUnstaking.value) return 'unstake';
            if (isSwitchingValidator.value) {
                // Once the cooldown has elapsed the queued update-staker is due any block, and if the
                // watchtower never sends it the user must be able to re-delegate by hand — an immediate
                // switch supersedes it (the chain rejects whichever update-staker comes second).
                const stake = activeStake.value as Stake;
                const { state: networkState } = useNetworkStore();
                if (!stake.inactiveRelease || stake.inactiveRelease > networkState.height) return 'switch';
            }
            return null;
        },
        // Nobody is going to send the queued follow-up (retire/remove, or update-staker), so once the
        // cooldown ends the user has to: the registration with the watchtower failed, the watchtower
        // conclusively holds no job for this stake (deactivated from another wallet, or by hand), or
        // the job it accepted failed on-chain.
        pendingOperationNeedsManualStep: (
            state,
            { pendingOperation, activeStake, activeWatchtowerJob, activeSwitchOperation, activeUnstakingOperation },
        ): boolean => {
            const stake = activeStake.value as Stake | null;
            if (!stake || !hasPendingPayout(stake)) return false;
            const job = activeWatchtowerJob.value as WatchtowerJob | null | undefined;
            if (job === null || job?.status === 'failed') return true;
            const operation = pendingOperation.value as 'switch' | 'unstake' | null;
            if (!operation) return false;
            const record = (operation === 'unstake' ? activeUnstakingOperation : activeSwitchOperation)
                .value as UnstakingRecord | SwitchValidatorRecord | null;
            return record?.watchtowerRegistered === false;
        },
        switchTargetLabel: (state, { activeSwitchOperation, validators }): string => {
            const record = activeSwitchOperation.value as SwitchValidatorRecord | null;
            if (!record) return '';
            const known = (validators.value as Record<string, Validator>)[record.targetValidatorAddress];
            const target: ValidatorRef = known
                ? toValidatorRef(known)
                : { address: record.targetValidatorAddress, name: record.targetValidatorName };
            return validatorLabel(target);
        },
        stakingEvents: (state): Readonly<AggregatedRestakingEvent[] | null> => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;

            const events = state.stakingEventsByAddress[activeAddress.value] || null;
            if (!events || !Array.isArray(events)) return null;
            return events;
        },
        restakingRewards: (state, { stakingEvents, activeStake, activeValidator }): Readonly<number | null> => {
            const events: Readonly<AggregatedRestakingEvent[] | null> = stakingEvents.value;
            if (!events || !Array.isArray(events)) return null;

            // If we have validator API data and it's not a restaking validator, return 0 (no restaking rewards)
            if (activeValidator.value
                && (activeValidator.value as RegisteredValidator).payoutType
                && (activeValidator.value as RegisteredValidator).payoutType !== 'restake') {
                return 0;
            }

            let totalRestakingRewards = 0;
            // Cache values, to avoid repeatedly accessing them with the overhead of Vue's reactivity system, which
            // is quite noticeable here as we're processing potentially tens of thousands of staking events.
            const eventCount = events.length;

            // Get validator address from stake (blockchain data) if available
            const stake = activeStake.value as Stake | null;
            const validatorAddress = stake?.validator;

            // Get rewardAddress from activeValidator if available (from API), but don't wait for it
            const validatorRewardAddress = activeValidator.value
                ? (activeValidator.value as RegisteredValidator).rewardAddress
                : undefined;

            // If we don't have validator info yet, sum all events (will be refined once validator data loads)
            if (!validatorAddress) {
                for (let i = 0; i < eventCount; ++i) {
                    totalRestakingRewards += events[i].aggregated_value;
                }
                return totalRestakingRewards;
            }

            // Filter by validator address
            for (let i = 0; i < eventCount; ++i) {
                const event = events[i];
                const { sender_address: rewardSenderAddress } = event;
                if (rewardSenderAddress === validatorAddress
                    || (validatorRewardAddress
                        ? rewardSenderAddress === validatorRewardAddress
                        // TODO ideally, we should somehow get the validator reward address, if it's not known. The
                        //  current behavior of including the reward by default is probably not ideal, as a validator
                        //  could use it to artificially inflate its reported rewards. Consider getting the appropriate
                        //  validator reward address, or removing true as default value.
                        : true
                    )) {
                    totalRestakingRewards += event.aggregated_value;
                }
            }

            return totalRestakingRewards;
        },
        // monthly rewards grouped by month
        monthlyRewards: (state, { stakingEvents }): Readonly<Map<string, MonthlyReward>> => {
            const events: Readonly<AggregatedRestakingEvent[] | null> = stakingEvents.value;
            const rewardsByMonth = new Map<string, MonthlyReward>();
            if (!events) return rewardsByMonth;

            // Get previously cached monthly rewards for the ACTIVE ADDRESS to preserve fiatValue
            const { activeAddress } = useAddressStore();
            const cachedRewards = (activeAddress.value && state.cachedMonthlyRewardsByAddress[activeAddress.value])
                || new Map<string, MonthlyReward>();

            // Cache event count, to avoid repeatedly accessing it with the overhead of Vue's reactivity system, which
            // can become noticeable here as we're processing potentially tens of thousands of staking events.
            const eventCount = events.length;

            // Group by month
            let previousEventMonth: string | undefined;
            let previousEventMonthReward: MonthlyReward | undefined;
            for (let i = 0; i < eventCount; ++i) {
                const event = events[i];
                const monthKey = event.time_window.substring(0, 7); // extract YYYY-MM part from date
                let monthRewards;
                if (monthKey === previousEventMonth) {
                    // Use cached entry to avoid a more expensive lookup from the map.
                    monthRewards = previousEventMonthReward!;
                } else {
                    monthRewards = rewardsByMonth.get(monthKey);
                    if (!monthRewards) {
                        // Create new month rewards entry only once, if it doesn't exist yet.
                        // Preserve cached fiatValue from previous calculation
                        const cachedMonth = cachedRewards.get(monthKey);
                        monthRewards = {
                            total: 0,
                            count: 0,
                            validators: [],
                            ...(cachedMonth?.fiatValue ? { fiatValue: cachedMonth.fiatValue } : {}),
                        };
                        rewardsByMonth.set(monthKey, monthRewards);
                    }

                    previousEventMonth = monthKey;
                    previousEventMonthReward = monthRewards;
                }

                // Update totals
                monthRewards.total += event.aggregated_value;
                monthRewards.count += 1;

                // Add validator if not already present
                // Cache the senderAddress, to avoid accessing it twice, with the overhead of Vue's reactivity system.
                const senderAddress = event.sender_address;
                if (!monthRewards.validators.includes(senderAddress)) {
                    monthRewards.validators.push(senderAddress);
                }
            }

            return rewardsByMonth;
        },
    },
    actions: {
        setStake(stake: Stake) {
            const previous = this.state.stakeByAddress[stake.address] as Stake | undefined;
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new stake in Vue 3.
            this.state.stakeByAddress = {
                ...this.state.stakeByAddress,
                [stake.address]: stake,
            };
            this.reconcileOperationRecords(stake.address, stake);
            // A payout that just became pending is worth asking about right away (the periodic sync
            // covers the rest): on a browser that did not start the operation, this is what reveals it.
            if (hasPendingPayout(stake) && !(previous && hasPendingPayout(previous))) {
                this.syncWatchtowerOperation(stake.address);
            }
        },
        setStakes(stakes: Stake[]) {
            const newStakes: {[address: string]: Stake} = {};

            for (const stake of stakes) {
                newStakes[stake.address] = stake;
            }

            this.state.stakeByAddress = newStakes;

            for (const stake of stakes) {
                this.reconcileOperationRecords(stake.address, stake);
            }
        },
        patchStake(address: string, patch: Partial<Omit<Stake, 'address'>>) {
            if (!this.state.stakeByAddress[address]) return;

            this.setStake({
                ...this.state.stakeByAddress[address],
                ...patch,
            });
        },
        removeStake(address: string) {
            if (!(address in this.state.stakeByAddress)) return;
            const stakes = { ...this.state.stakeByAddress };
            delete stakes[address];
            this.state.stakeByAddress = stakes;
        },
        setValidator(validator: RawValidator) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new validator in Vue 3.
            this.state.chainValidators = {
                ...this.state.chainValidators,
                [validator.address]: validator,
            };
        },
        setValidators(validators: RawValidator[]) {
            const newValidators: {[address: string]: RawValidator} = {};

            for (const validator of validators) {
                newValidators[validator.address] = validator;
            }

            this.state.chainValidators = newValidators;
        },
        setApiValidators(apiValidators: ApiValidator[]) {
            const newApiValidators: {[address: string]: ApiValidator} = {};

            for (const validator of apiValidators) {
                newApiValidators[validator.address] = validator;
            }

            this.state.apiValidators = newApiValidators;
        },
        // At most one operation per staker: recording one kind supersedes whatever the other kind
        // still held (e.g. a switch record kept as a manual-recovery handle).
        setSwitchOperation(address: string, record: SwitchValidatorRecord) {
            const clearedOther = removeRecord(UNSTAKING_LS_PREFIX, address);
            const written = writeRecord(SWITCH_VALIDATOR_LS_PREFIX, address, record);
            if (clearedOther || written) this.state.operationRecordTrigger++;
            // An operation of our own supersedes whatever the watchtower said about the stake before.
            Vue.delete(this.state.watchtowerJobByAddress, address);
        },
        clearSwitchOperation(address: string) {
            if (removeRecord(SWITCH_VALIDATOR_LS_PREFIX, address)) this.state.operationRecordTrigger++;
        },
        setUnstakingOperation(address: string, record: UnstakingRecord) {
            const clearedOther = removeRecord(SWITCH_VALIDATOR_LS_PREFIX, address);
            const written = writeRecord(UNSTAKING_LS_PREFIX, address, record);
            if (clearedOther || written) this.state.operationRecordTrigger++;
            Vue.delete(this.state.watchtowerJobByAddress, address);
        },
        clearUnstakingOperation(address: string) {
            if (removeRecord(UNSTAKING_LS_PREFIX, address)) this.state.operationRecordTrigger++;
        },
        // `stake` is the latest chain snapshot; `null` means the staker no longer exists on chain (a full
        // unstake has paid out), so nothing can be pending anymore.
        reconcileOperationRecords(address: string, stake: Stake | null) {
            // Nothing left to pay out means nothing the watchtower could still owe.
            if (!stake || !hasPendingPayout(stake)) Vue.delete(this.state.watchtowerJobByAddress, address);
            if (!stake) {
                this.clearSwitchOperation(address);
                this.clearUnstakingOperation(address);
                return;
            }
            const switchRecord = readRecord<SwitchValidatorRecord>(SWITCH_VALIDATOR_LS_PREFIX, address);
            const unstakingRecord = readRecord<UnstakingRecord>(UNSTAKING_LS_PREFIX, address);
            // An operation whose deactivation never made it on-chain never started: its record would
            // otherwise outlive the flow and relabel the next plain deactivation as this operation.
            if (switchRecord && hasTransactionFailed(switchRecord.deactivationTxHash)) {
                this.clearSwitchOperation(address);
            }
            if (unstakingRecord && hasTransactionFailed(unstakingRecord.deactivationTxHash)) {
                this.clearUnstakingOperation(address);
            }
            if (switchRecord && stake.activeBalance > 0) {
                // Don't clear until active stake is at the target — the user's manual recovery
                // handle would otherwise be lost if balance reappears at the old validator.
                if (stake.validator === switchRecord.targetValidatorAddress) {
                    this.clearSwitchOperation(address);
                }
            }
            if (unstakingRecord && !hasPendingPayout(stake)) {
                // A snapshot from before the deactivation landed looks just like a finished payout;
                // don't clear while that transaction is still in the mempool.
                if (!isTransactionPending(unstakingRecord.deactivationTxHash)) {
                    this.clearUnstakingOperation(address);
                }
            }
        },
        // Two answers, in order: the fate of the job behind our own record (an accepted job can still
        // fail on-chain), else a job another browser started, for which this one has no record. Never
        // throws — on any error the last answer stands and the next sync retries.
        async syncWatchtowerOperation(address: string) {
            if (syncingAddresses.has(address)) return;
            const stake = this.state.stakeByAddress[address];
            if (!stake || !hasPendingPayout(stake)) return;

            const unstakingRecord = readRecord<UnstakingRecord>(UNSTAKING_LS_PREFIX, address);
            const switchRecord = readRecord<SwitchValidatorRecord>(SWITCH_VALIDATOR_LS_PREFIX, address);
            const record = unstakingRecord || switchRecord;
            // A record without a job id is either a flow in this browser still waiting for the
            // watchtower's answer (querying now would only race it), a registration that failed, or a
            // record from before job ids existed — in every case the outcome is known locally.
            if (record && !record.watchtowerJobId) return;

            // The payout may have gone through (and the entry been dropped) while a request was out,
            // or a new deactivation landed: decisions are taken on the current snapshot.
            const currentStake = () => this.state.stakeByAddress[address] as Stake | undefined;
            const stillPending = () => {
                const current = currentStake();
                return !!current && hasPendingPayout(current);
            };

            syncingAddresses.add(address);
            try {
                if (record) {
                    const kind = unstakingRecord ? 'unstake' : 'switch';
                    const job = await fetchWatchtowerJob(kind, record.watchtowerJobId!);
                    if (!stillPending()) return;
                    // The watchtower answers 204 for an unknown id but also for its own internal
                    // errors, so a missing job is inconclusive: the last answer stands.
                    if (!job) return;
                    if (job.status !== 'confirmed') {
                        Vue.set(this.state.watchtowerJobByAddress, address, job);
                        return;
                    }
                    // Our operation is over, yet a payout is pending: it was deactivated again from
                    // elsewhere. The stale record would otherwise mask that forever.
                    if (kind === 'unstake') this.clearUnstakingOperation(address);
                    else this.clearSwitchOperation(address);
                }

                const { jobs, complete } = await fetchWatchtowerJobsForStaker(address);
                if (!stillPending()) return;
                // Only a job that belongs to the payout pending now (not a confirmed one from a previous cycle).
                const job = jobs.find((candidate) => belongsToCurrentPayout(candidate, currentStake()!));
                if (job) {
                    Vue.set(this.state.watchtowerJobByAddress, address, job);
                    return;
                }
                // Capped lists prove nothing — the job may have fallen off them — so the last answer
                // stands in that case.
                if (!complete) return;
                // Loaded only here: a job found above must not depend on the policy constants loading.
                const policy = await usePolicy();
                if (!stillPending()) return;
                if (isDeactivationSettled(currentStake()!, policy)) {
                    Vue.set(this.state.watchtowerJobByAddress, address, null);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn('watchtower: sync failed for', address, error);
            } finally {
                syncingAddresses.delete(address);
            }
        },
        syncWatchtowerOperations() {
            for (const stake of Object.values(this.state.stakeByAddress) as Stake[]) {
                if (hasPendingPayout(stake)) this.syncWatchtowerOperation(stake.address);
            }
        },

        setStakingEvents(address: string, events: AggregatedRestakingEvent[]) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new stake in Vue 3.
            // We mark the staking events as non-reactive, as they're static data anyways. This avoids the significant
            // overhead, that Vue's reactivity system would add when setting the data, and on any data access. The
            // change of the stakingEventsByAddress property itself is still detected and correctly triggers the
            // recalculation of all computed composables.
            this.state.stakingEventsByAddress = nonReactive({
                ...this.state.stakingEventsByAddress,
                [address]: events,
            });

            // Calculate and cache fiat values for the newly loaded events
            // This is called here (not just on address change) because staking events are loaded
            // asynchronously after address changes, so we need to wait until they're actually available
            const { activeAddress } = useAddressStore();
            if (activeAddress.value === address) {
                // Only calculate if this is for the currently active address
                this.calculateMonthlyFiatValues();
            }
        },

        async calculateMonthlyFiatValues(fiatCurrency?: FiatCurrency) {
            const fiatStore = useFiatStore();
            const { activeAddress } = useAddressStore();

            // Need an active address to know which cache to update
            if (!activeAddress.value) return;

            fiatCurrency = fiatCurrency || fiatStore.currency.value;
            const historyFiatCurrency = isHistorySupportedFiatCurrency(fiatCurrency, FIAT_API_PROVIDER_TX_HISTORY)
                ? fiatCurrency
                : FiatCurrency.USD;

            // Get monthly rewards from getter (already filtered by active address)
            const monthlyRewards = (this.monthlyRewards as any).value as Map<string, MonthlyReward>;
            if (!monthlyRewards || monthlyRewards.size === 0) return;

            // Filter months that need fiat value calculation
            const monthsToUpdate: Array<{ monthKey: string, monthData: MonthlyReward, timestamp: number }> = [];

            for (const [monthKey, monthData] of monthlyRewards.entries()) {
                const { isCurrentMonth } = isCurrentMonthAndYear(monthKey);

                // Skip current month (calculated in real-time by composables)
                // Only calculate for past months that don't have cached value for this currency
                if (!isCurrentMonth
                    && typeof monthData.fiatValue?.[fiatCurrency] !== 'number'
                    && typeof monthData.fiatValue?.[historyFiatCurrency] !== 'number') {
                    const endOfMonthTimestamp = getEndOfMonthTimestamp(monthKey);
                    monthsToUpdate.push({ monthKey, monthData, timestamp: endOfMonthTimestamp });
                }
            }

            if (!monthsToUpdate.length) return;

            // Batch fetch all needed exchange rates
            const historicExchangeRates = await getHistoricExchangeRates(
                CryptoCurrency.NIM,
                historyFiatCurrency,
                monthsToUpdate.map((m) => m.timestamp),
                FIAT_API_PROVIDER_TX_HISTORY,
            );

            // Get or create the cache for this address
            const addressCache = this.state.cachedMonthlyRewardsByAddress[activeAddress.value] || new Map();
            const newCachedMonthlyRewards = new Map(addressCache);

            for (const { monthKey, monthData, timestamp } of monthsToUpdate) {
                const exchangeRate = historicExchangeRates.get(timestamp);

                // Initialize fiatValue object if needed
                monthData.fiatValue ||= {};

                // Set via Vue.set for reactivity
                Vue.set(
                    monthData.fiatValue!,
                    historyFiatCurrency,
                    exchangeRate !== undefined
                        ? exchangeRate * (monthData.total / 1e5)
                        : FIAT_PRICE_UNAVAILABLE,
                );

                // Update cached rewards for this address
                newCachedMonthlyRewards.set(monthKey, { ...monthData });
            }

            // Update the cached monthly rewards for this address in state
            // Need to use Vue.set for proper reactivity in Vue 2
            Vue.set(this.state.cachedMonthlyRewardsByAddress, activeAddress.value, newCachedMonthlyRewards);

            // Manually notify the store of deep changes to trigger subscriptions
            // TODO this hack is likely not necessary in newer pinia versions
            this.patch({});
        },
    },
});

// Test case for evaluating the performance of staking event handling. Optimizing the performance of staking event
// handling is crucial, as potentially tens of thousands of staking events have to be processed, which can freeze up the
// Wallet.
// // @ts-expect-error assigning a method on window for testing purposes
// window.testStakingEventsPerformance = async function testStakingEventsPerformance() {
//     const TEST_USE_CACHED_API_RESPONSE = true;
//     const TEST_ADDRESS = 'NQ51 VQXG TDUX R3TN M0HV 15VQ CLHU BU84 E9S6';
//     const TEST_EVENT_COUNT = 40000;
//     const TEST_VUE_TICKS_TO_AWAIT = 2;
//     const [
//         { default: Vue },
//         { useConfig },
//     ] = await Promise.all([import('vue'), import('@/composables/useConfig')]);
//     const { activeAddress } = useAddressStore();
//     const { state: stakingState, setStakingEvents } = useStakingStore();
//
//     if (activeAddress.value !== TEST_ADDRESS) {
//         // eslint-disable-next-line no-alert
//         alert('Please run the test with NQ51 VQXG TDUX R3TN M0HV 15VQ CLHU BU84 E9S6 as active address '
//             + '("Green Address" of Matheo\'s "Green Account").');
//         return;
//     }
//
//     // Utilities
//     function logDuration(activity: string, start: number) {
//         // eslint-disable-next-line no-console
//         console.log(`testStakingEventsPerformance: ${activity} took ${(Date.now() - start) / 1000}s`);
//     }
//     async function awaitVueTicks(count: number, logDurations: boolean) {
//         for (let i = 1; i <= count; ++i) {
//             const start = Date.now();
//             await Vue.nextTick(); // eslint-disable-line no-await-in-loop
//             if (!logDurations) continue;
//             logDuration(`Vue.nextTick() ${i} of ${count}`, start);
//         }
//     }
//
//     // Clear existing events for a clean state. Run in a named method for nicer labeling in performance profiler
//     let cachedApiResponse: AggregatedRestakingEvent[] = [];
//     await (async function prepareTest() {
//         cachedApiResponse = stakingState.stakingEventsByAddress[TEST_ADDRESS];
//         const knownStakingEventAddresses = Object.keys(stakingState.stakingEventsByAddress);
//         for (const address of knownStakingEventAddresses) {
//             setStakingEvents(address, []);
//         }
//         // Wait for changes to take effect
//         await awaitVueTicks(TEST_VUE_TICKS_TO_AWAIT, false);
//     }());
//
//     let stakingEvents: AggregatedRestakingEvent[] = [];
//     await (async function runTest() {
//         let start: number;
//         await (async function fetchStakingEvents() {
//             if (TEST_USE_CACHED_API_RESPONSE) {
//                 // eslint-disable-next-line no-console
//                 console.warn('testStakingEventsPerformance: using cached events from store');
//                 stakingEvents = [...cachedApiResponse];
//             } else {
//                 const { config } = useConfig();
//                 const endpoint = config.staking.stakeEventsEndpoint;
//                 const url = endpoint.replace('ADDRESS', TEST_ADDRESS.replaceAll(' ', '+'));
//                 start = Date.now();
//                 const stakingEventsFetchResponse = await fetch(url);
//                 logDuration('Fetching staking events', start);
//                 start = Date.now();
//                 stakingEvents = await stakingEventsFetchResponse.json();
//                 logDuration(`Parsing ${stakingEvents.length} staking events`, start);
//             }
//             // Restrict number of events for comparable test cases
//             if (stakingEvents.length < TEST_EVENT_COUNT) {
//                 // eslint-disable-next-line no-console
//                 console.warn(`testStakingEventsPerformance: Only ${stakingEvents.length} events available instead `
//                     + `of desired ${TEST_EVENT_COUNT}`);
//             } else {
//                 stakingEvents.splice(TEST_EVENT_COUNT, stakingEvents.length - TEST_EVENT_COUNT);
//             }
//         }());
//
//         await (async function applyStatkingEvents() {
//             start = Date.now();
//             setStakingEvents(TEST_ADDRESS, stakingEvents);
//             logDuration('setStakingEvents', start);
//             await awaitVueTicks(TEST_VUE_TICKS_TO_AWAIT, true);
//         }());
//     }());
//
//     (function checkSorting() {
//         let unsortedStakingEventCount = 0;
//         let previousTimestamp = 0;
//         for (const event of stakingEvents) {
//             const timestamp = new Date(event.time_window).getTime();
//             if (timestamp < previousTimestamp) {
//                 unsortedStakingEventCount++;
//                 // console.log( // eslint-disable-line no-console
//                 //     'testStakingEventsPerformance: event not sorted by timestamp:',
//                 //     event,
//                 //     new Date(previousTimestamp),
//                 //     new Date(timestamp),
//                 // );
//             }
//             previousTimestamp = timestamp;
//         }
//         // eslint-disable-next-line no-console
//         console.log(`testStakingEventsPerformance: ${unsortedStakingEventCount} of ${stakingEvents.length} staking `
//             + 'events are not sorted by date.');
//
//         // Test how long sorting takes. Work on a shallow copy, to not modify the original data in the store.
//         const sortedStakingEvents = [...stakingEvents];
//         const start = Date.now();
//         sortedStakingEvents.sort((a, b) => new Date(b.time_window).getTime() - new Date(a.time_window).getTime());
//         logDuration('sorting (with Date parsing)', start);
//     }());
//
//     console.log('testStakingEventsPerformance: tests finished'); // eslint-disable-line no-console
// };

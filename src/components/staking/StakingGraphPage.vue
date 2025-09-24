<template>
    <div class="stake-graph-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template v-if="!activeStake || !activeStake.activeBalance" #default>
                {{ $t('Set an Amount') }}
            </template>
            <template v-else #default>
                {{ $t('Adjust your stake') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Use the slider to lock your NIM and earn rewards.') }}
                </p>
                <div class="validator-info-bar flex-row" v-if="validator">
                    <ValidatorInfoBar :validator="validator" @click="$emit('selectValidator', validator)" />
                </div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <span class="estimated-rewards-overlay">
                <Tooltip
                    preferredPosition="bottom right"
                    :styles="{'width': '32rem', 'margin-left': '-6rem'}"
                    :container="tooltipContainer"
                >
                    <div slot="trigger" class="flex-row">
                        Estimated rewards <InfoCircleSmallIcon />
                    </div>

                    <img src="/img/staking/estimated-rewards-projection.svg" alt="Estimated Rewards Projection" />
                    <p>
                        Your reward is depending on how many people stake.
                        The less people stake, the higher your rewards.
                    </p>
                    <p class="explainer">
                        The corridor assumes that between 20% and 80% of all NIM holders stake.
                    </p>
                </Tooltip>
            </span>

            <StakingGraph
                :stakedAmount="newStake"
                :fee="validator && 'fee' in validator ? validator.fee : 0"
            />

            <AmountSlider
                :stakedAmount="activeStake ? activeStake.activeBalance : 0"
                @amount-staked="updateStaked"
            />

            <div>
                <button
                    class="nq-button light-blue stake-button"
                    :disabled="!stakeDelta || isStakeBelowMinimum"
                    @click="performStaking"
                >
                    {{ $t('Confirm stake') }}
                </button>

                <MessageTransition>
                    <div class="disclaimer minimum-stake-disclaimer" v-if="newStake !== 0 && isStakeBelowMinimum">
                        {{ $t('Stake must be at least {minStake}.', { minStake: `${MIN_STAKE / 1e5} NIM` }) }}
                    </div>
                    <div class="disclaimer stake-disclaimer" v-else-if="stakeDelta >= 0">
                        {{ $t('Unlock at any time. Your NIM will be available within ~24 hours.') }}
                    </div>
                    <div class="disclaimer unstake-disclaimer" v-else>
                        <Amount :amount="Math.abs(stakeDelta)" :decimals="DISPLAYED_DECIMALS" />
                        {{ $t('will be available within ~24 hours.') }}
                    </div>
                </MessageTransition>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';

import { useI18n } from '../../lib/useI18n';
import { CryptoCurrency, MIN_STAKE } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { getNetworkClient } from '../../network';
import { sendStaking, signStakingRaw } from '../../hub';
import { startUnstaking } from '../../lib/AlbatrossWatchtower';
import { useTransactionsStore, TransactionState } from '../../stores/Transactions';

import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';
import { useNetworkStore } from '../../stores/Network';

import ValidatorInfoBar from './tooltips/ValidatorInfoBar.vue';

import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';
import AmountSlider from './AmountSlider.vue';
import { StatusChangeType } from './StakingModal.vue';
import MessageTransition from '../MessageTransition.vue';
import StakingGraph from './StakingGraph.vue';
import { reportToSentry } from '../../lib/Sentry';

export default defineComponent({
    setup(props, context) {
        const { $t } = useI18n();
        const { activeAddress } = useAddressStore();
        const { activeStake, activeValidator } = useStakingStore();

        const newStake = ref(activeStake.value ? activeStake.value.activeBalance : 0);
        const stakeDelta = ref(0);
        const tooltipContainer = ref<HTMLElement | null>(null);

        function updateStaked(amount: unknown) {
            if (typeof amount === 'number') {
                newStake.value = amount;
                stakeDelta.value = amount - (activeStake.value?.activeBalance || 0);
            }
        }

        async function waitForMacroConfirmation(hash: string) {
            const { state: transactions$, addTransactions } = useTransactionsStore();

            console.debug('[unstake] macro-confirmation: start waiting', { hash });

            // Seed store with tx details if missing
            if (!transactions$.transactions[hash]) {
                try {
                    const client = await getNetworkClient();
                    const details = await client.getTransaction(hash);
                    console.debug('[unstake] macro-confirmation: seeded tx from network', {
                        hash,
                        state: details.state,
                    });
                    addTransactions([details]);
                } catch (e) {
                    // Not yet retrievable, continue and poll
                    console.debug('[unstake] macro-confirmation: tx not retrievable yet', { hash });
                }
            }

            // Resolve immediately if already confirmed
            if (transactions$.transactions[hash]?.state === TransactionState.CONFIRMED) {
                console.debug('[unstake] macro-confirmation: already confirmed', { hash });
                return;
            }

            await new Promise<void>((resolve, reject) => {
                let stopped = false;
                const stop = watch(
                    () => transactions$.transactions[hash]?.state,
                    (state) => {
                        console.debug('[unstake] macro-confirmation: watcher state update', { hash, state });
                        if (state === TransactionState.CONFIRMED) {
                            if (!stopped) { stopped = true; stop(); }
                            console.debug('[unstake] macro-confirmation: resolved confirmed', { hash });
                            resolve();
                        } else if (
                            state === TransactionState.INVALIDATED
                            || state === TransactionState.EXPIRED
                        ) {
                            if (!stopped) { stopped = true; stop(); }
                            console.error('[unstake] macro-confirmation: tx invalidated/expired', { hash, state });
                            reject(new Error('Deactivation transaction was invalidated or expired'));
                        }
                    },
                );

                // Polling fallback: fetch tx details periodically and re-add to store
                let tries = 0;
                const interval = window.setInterval(async () => {
                    if (stopped) { window.clearInterval(interval); return; }
                    const current = transactions$.transactions[hash]?.state;
                    console.debug('[unstake] macro-confirmation: polling status', { hash, state: current, tries });
                    if (
                        current === TransactionState.CONFIRMED
                        || current === TransactionState.INVALIDATED
                        || current === TransactionState.EXPIRED
                    ) {
                        // Let the watcher handle resolve/reject on next tick
                        return;
                    }
                    try {
                        const client = await getNetworkClient();
                        const details = await client.getTransaction(hash);
                        addTransactions([details]);
                        console.debug('[unstake] macro-confirmation: refreshed tx from network', {
                            hash,
                            state: details.state,
                        });
                    } catch (e) {
                        // Ignore until available
                        console.debug('[unstake] macro-confirmation: still not retrievable', { hash });
                    }
                    tries += 1;
                }, 5000);
            });
        }

        async function performStaking() {
            if (isStakeBelowMinimum.value) return;

            const validatorLabelOrAddress = 'name' in activeValidator.value!
                ? activeValidator.value.name
                : activeValidator.value!.address;

            const { Address, TransactionBuilder } = await import('@nimiq/core');
            const client = await getNetworkClient();

            try {
                if (stakeDelta.value > 0) {
                    context.emit('statusChange', {
                        type: StatusChangeType.STAKING,
                        state: State.LOADING,
                        title: $t('Sending Staking Transaction') as string,
                    });

                    if (!activeStake.value
                        || (!activeStake.value.activeBalance && !activeStake.value.inactiveBalance)) {
                        const transaction = TransactionBuilder.newCreateStaker(
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            Address.fromUserFriendlyAddress(activeValidator.value!.address),
                            BigInt(stakeDelta.value),
                            BigInt(0),
                            useNetworkStore().state.height,
                            await client.getNetworkId(),
                        );
                        const txs = await sendStaking({
                            transaction: transaction.serialize(),
                            recipientLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                            // @ts-expect-error Not typed yet in Hub
                            validatorImageUrl: 'logo' in activeValidator.value!
                                && !activeValidator.value.hasDefaultLogo
                                ? activeValidator.value.logo
                                : undefined,
                        }).catch((error) => {
                            throw new Error(error.data);
                        });

                        if (!txs) {
                            context.emit('statusChange', {
                                type: StatusChangeType.NONE,
                            });
                            return;
                        }

                        if (txs.some((tx) => tx.executionResult === false)) {
                            throw new Error('The transaction did not succeed');
                        }

                        context.emit('statusChange', {
                            state: State.SUCCESS,
                            title: $t(
                                'Successfully staked {amount} NIM with {validator}',
                                {
                                    amount: Math.abs(stakeDelta.value / 1e5),
                                    validator: validatorLabelOrAddress,
                                },
                            ),
                        });
                    } else {
                        // TODO: Differentiate between adding and reactivating stake
                        const transaction = TransactionBuilder.newAddStake(
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            BigInt(stakeDelta.value),
                            BigInt(0),
                            useNetworkStore().state.height,
                            await client.getNetworkId(),
                        );
                        const txs = await sendStaking({
                            transaction: transaction.serialize(),
                            recipientLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                            // @ts-expect-error Not typed yet in Hub
                            validatorAddress: activeValidator.value!.address,
                            validatorImageUrl: ('logo' in activeValidator.value!
                                && !activeValidator.value.hasDefaultLogo)
                                ? activeValidator.value.logo
                                : undefined,
                        }).catch((error) => {
                            throw new Error(error.data);
                        });

                        if (!txs) {
                            context.emit('statusChange', {
                                type: StatusChangeType.NONE,
                            });
                            return;
                        }

                        if (txs.some((tx) => tx.executionResult === false)) {
                            throw new Error('The transaction did not succeed');
                        }

                        context.emit('statusChange', {
                            state: State.SUCCESS,
                            title: $t(
                                'Successfully added {amount} NIM to your stake with {validator}',
                                {
                                    amount: Math.abs(stakeDelta.value / 1e5),
                                    validator: validatorLabelOrAddress,
                                },
                            ),
                        });
                    }
                } else {
                    context.emit('statusChange', {
                        type: StatusChangeType.DEACTIVATING,
                        state: State.LOADING,
                        title: $t('Sending Staking Transaction') as string,
                    });

                    // First sign and send deactivation, then sign retire+remove together and schedule with watchtower
                    const transaction = TransactionBuilder.newSetActiveStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(activeStake.value!.activeBalance + stakeDelta.value),
                        BigInt(0),
                        useNetworkStore().state.height,
                        await client.getNetworkId(),
                    );
                    // eslint-disable-next-line no-console
                    console.debug('[unstake] staking: deactivation tx prepared', {
                        delta: stakeDelta.value,
                        newActive: activeStake.value!.activeBalance + stakeDelta.value,
                    });
                    const txs = await sendStaking({
                        transaction: transaction.serialize(),
                        recipientLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                        // @ts-expect-error Not typed yet in Hub
                        validatorAddress: activeValidator.value!.address,
                        validatorImageUrl: 'logo' in activeValidator.value! && !activeValidator.value.hasDefaultLogo
                            ? activeValidator.value.logo
                            : undefined,
                        amount: Math.abs(stakeDelta.value),
                    }).catch((error) => {
                        throw new Error(error.data);
                    });

                    if (!txs) {
                        context.emit('statusChange', {
                            type: StatusChangeType.NONE,
                        });
                        // eslint-disable-next-line no-console
                        console.error('[unstake] staking: deactivation send returned null');
                        return;
                    }

                    if (txs.some((tx) => tx.executionResult === false)) {
                        // eslint-disable-next-line no-console
                        console.error('[unstake] staking: deactivation executionResult=false');
                        throw new Error('The transaction did not succeed');
                    }

                    try {
                        const deactivationHash = txs[0]?.transactionHash;
                        // Wait until the deactivation tx is macro-confirmed before notifying the watchtower
                        console.debug('[unstake] watchtower: waiting for macro-confirmation', {
                            deactivationHash,
                        });
                        await waitForMacroConfirmation(deactivationHash);

                        // Fetch deactivation details to align validity heights with watchtower expectations
                        const deactivationDetails = await client.getTransaction(deactivationHash);
                        const deactHeight = deactivationDetails.blockHeight!;

                        // Build retire and remove and sign together (2 tx max)
                        // Compute validity start heights exactly as the watchtower expects (without relying on
                        // Policy network defaults): retire at end of current epoch + one epoch; unstake at retire + 1.
                        const { usePolicy } = await import('@/composables/usePolicy');
                        const policy = await usePolicy();
                        const nextElection = policy.electionBlockAfter(deactHeight);
                        const targetValidAt = nextElection + policy.blocksPerEpoch();

                        // Use exact macro-final height for retire, unstake at retire + 1
                        const retireStart = targetValidAt;
                        const removeStart = retireStart + 1;

                        // eslint-disable-next-line no-console
                        console.debug('[unstake] watchtower: computed validity starts', {
                            deactHeight,
                            targetValidAt,
                            retireStart,
                            removeStart,
                        });

                        let retireSerialized: string;
                        let removeSerialized: string;
                        {
                            const retireUnsigned = TransactionBuilder.newRetireStake(
                                Address.fromUserFriendlyAddress(activeAddress.value!),
                                BigInt(Math.abs(stakeDelta.value)),
                                BigInt(0),
                                retireStart,
                                await client.getNetworkId(),
                            );
                            const removeUnsigned = TransactionBuilder.newRemoveStake(
                                Address.fromUserFriendlyAddress(activeAddress.value!),
                                BigInt(Math.abs(stakeDelta.value)),
                                BigInt(0),
                                removeStart,
                                await client.getNetworkId(),
                            );
                            // eslint-disable-next-line no-console
                            console.debug('[unstake] watchtower: signing retire+remove (initial)');
                            const signed = await signStakingRaw({
                                transaction: [retireUnsigned.serialize(), removeUnsigned.serialize()],
                                recipientLabel:
                                    'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                                // @ts-expect-error Not typed yet in Hub
                                validatorAddress: activeValidator.value!.address,
                                validatorImageUrl: 'logo' in activeValidator.value!
                                    && !activeValidator.value.hasDefaultLogo
                                    ? activeValidator.value.logo
                                    : undefined,
                            });
                            if (!signed || !Array.isArray(signed) || signed.length < 2) {
                                // eslint-disable-next-line no-console
                                console.error('[unstake] watchtower: signing retire+remove returned empty');
                                return;
                            }
                            retireSerialized = signed[0].serializedTx;
                            removeSerialized = signed[1].serializedTx;
                        }

                        // eslint-disable-next-line no-console
                        console.debug('[unstake] watchtower: startUnstaking after macro-confirmation', {
                            deactivationHash,
                        });

                        try {
                            await startUnstaking({
                                staker_address: activeAddress.value!,
                                transactions: {
                                    inactive_stake_tx_hash: deactivationHash,
                                    retire_tx: retireSerialized,
                                    unstake_tx: removeSerialized,
                                },
                            });
                            // eslint-disable-next-line no-console
                            console.debug('[unstake] watchtower: startUnstaking posted');
                        } catch (postErr: any) {
                            const errMsg = String(postErr?.message || '');
                            const is406 = errMsg.startsWith('HTTP 406');
                            // eslint-disable-next-line no-console
                            console.debug('[unstake] watchtower: post failed', {
                                is406,
                                err: errMsg,
                            });
                            throw postErr;
                        }
                    } catch (wtError) {
                        // Non-fatal: deactivation succeeded; watchtower scheduling failed
                        // Report but do not block UX
                        reportToSentry(wtError as any);
                        // eslint-disable-next-line no-console
                        console.error(
                            '[unstake] watchtower: scheduling failed',
                            wtError instanceof Error ? wtError.message : String(wtError),
                        );
                    }

                    context.emit('statusChange', {
                        state: State.SUCCESS,
                        title: $t(
                            'Successfully deactivated {amount} NIM from your stake with {validator}',
                            {
                                amount: Math.abs((activeStake.value!.inactiveBalance - stakeDelta.value) / 1e5),
                                validator: validatorLabelOrAddress,
                            },
                        ),
                    });

                    // if (Math.abs(stakeDelta.value) === activeStake.value!.activeBalance) {
                    //     // Close staking modal
                    //     router.back();
                    // }
                }

                window.setTimeout(() => {
                    context.emit('statusChange', { type: StatusChangeType.NONE });
                    context.emit('next');
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                reportToSentry(error);

                // Show error screen
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: $t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

        const isStakeBelowMinimum = computed(() => newStake.value < MIN_STAKE && newStake.value > 0);

        return {
            // NOW,
            // MONTH,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(stakeDelta.value, CryptoCurrency.NIM),
            activeStake,
            validator: activeValidator,
            newStake,
            stakeDelta,
            updateStaked,
            performStaking,
            isStakeBelowMinimum,
            MIN_STAKE,
            tooltipContainer,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorInfoBar,
        StakingGraph,
        AmountSlider,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
        MessageTransition,
    },
});
</script>

<style lang="scss" scoped>
    .stake-graph-page { flex-grow: 1 }

    .page-header {
        padding-bottom: 3rem;

        .tooltip-bar {
            justify-content: center;

            > * + * {
                margin-left: 0.75rem;
            }
        }

        .validator-info-bar {
            justify-content: center;
        }
    }

    .page-body {
        padding: 0 0 2rem 0;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;

        .estimated-rewards-overlay {
            position: absolute;
            z-index: 1;
            top: 2.4rem;
            left: 2.4rem;

            ::v-deep .trigger {
                line-height: 1.2;
                font-size: var(--small-size);
                font-weight: 600;
                color: var(--text-30);
                background: white;
                padding: 0 .25rem;
                cursor: pointer;

                div {
                    align-items: center;

                    svg { margin-left: 0.5rem }
                }
            }
        }

        .staking-graph {
            margin-top: -2.8rem;
            z-index: 0;
        }

        .amount-slider {
            margin: 4rem 3rem 0;
            z-index: 0;
        }

        .stake-button { width: 40.5rem }

        .disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: var(--small-size);
            text-align: center;
        }

        .minimum-stake-disclaimer { color: var(--nimiq-orange) }
        .stake-disclaimer { color: var(--text-50) }
        .unstake-disclaimer { color: var(--nimiq-light-blue) }
    }

    .nq-text {
        margin: 1rem 0 1.5rem;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

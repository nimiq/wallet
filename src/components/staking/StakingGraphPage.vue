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
import { sendStaking, unstakeFlow } from '../../hub';
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

                    // One-shot signing flow via Hub: deactivation then retire+remove
                    const transaction = TransactionBuilder.newSetActiveStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(activeStake.value!.activeBalance + stakeDelta.value),
                        BigInt(0),
                        useNetworkStore().state.height,
                        await client.getNetworkId(),
                    );
                    try {
                        const result = await unstakeFlow({
                            senderLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                            recipientLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                            deactivation: transaction.serialize(),
                            staker: activeAddress.value!,
                            amount: Math.abs(stakeDelta.value),
                            validatorAddress: activeValidator.value!.address,
                            validatorImageUrl: 'logo' in activeValidator.value!
                                && !activeValidator.value.hasDefaultLogo
                                ? activeValidator.value.logo
                                : undefined,
                        });
                        if (!result) throw new Error('Unstake flow was canceled');

                        // After Hub flow, notify watchtower using returned signed retire/remove
                        try {
                            await startUnstaking({
                                staker_address: activeAddress.value!,
                                transactions: {
                                    inactive_stake_tx_hash: result.deactivation.raw.transactionHash,
                                    retire_tx: result.retire.serializedTx,
                                    unstake_tx: result.remove.serializedTx,
                                },
                            });
                        } catch (postErr: any) {
                            reportToSentry(postErr);
                        }
                    } catch (error) {
                        throw error;
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

<template>
    <div class="stake-graph-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Set an Amount') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Use the slider to lock your NIM and earn rewards.') }}
                </p>
                <div v-if="validator" class="tooltip-bar flex-row">
                    <LabelTooltip :validator="validator" @click="$emit('changeValidator')" />
                    <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" dry />
                    <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" dry />
                </div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <span class="estimated-rewards-overlay">
                <Tooltip
                    preferredPosition="bottom right"
                    :styles="{'width': '32rem', 'margin-left': '-6rem'}"
                    :container="this"
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
            <div style="height: 150px; background: gainsboro;">
                <!-- <h2
                    style="font-size: 32px; font-weigth: bold; color: darkgrey; text-align: center; margin-top: 56px;"
                >📈 Graph will come here</h2> -->
            </div>
            <!-- <StakingGraph
                :stakedAmount="newStake" :apy="validator && 'reward' in validator ? validator.reward : 0"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }"
            /> -->

            <AmountSlider
                :stakedAmount="activeStake ? activeStake.balance : 0"
                @amount-staked="updateStaked"
            />

            <div>
                <button class="nq-button light-blue stake-button" :disabled="!stakeDelta" @click="performStaking">
                    {{ $t('Confirm stake') }}
                </button>

                <div class="disclaimer stake-disclaimer" v-if="stakeDelta >= 0">
                    {{ $t('Unlock at any time. Your NIM will be available within hours.') }}
                </div>
                <div class="disclaimer unstake-disclaimer" v-else>
                    <Amount :amount="Math.abs(stakeDelta)" :decimals="DISPLAYED_DECIMALS" />
                    {{ $t('will be available within hours.') }}
                </div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { captureException } from '@sentry/vue';
import { defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';

import {
    CryptoCurrency,
    STAKING_CONTRACT_ADDRESS,
    StakingTransactionType,
    STAKING_ACCOUNT_TYPE,
} from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { sendStaking } from '../../hub';

import { useConfig } from '../../composables/useConfig';

import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';
import { useNetworkStore } from '../../stores/Network';

// import StakingGraph, { NOW, MONTH } from './graph/StakingGraph.vue';
import AmountSlider from './AmountSlider.vue';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';

import LabelTooltip from './tooltips/LabelTooltip.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';

export default defineComponent({
    setup(props, context) {
        const { config } = useConfig();
        const { activeAddress } = useAddressStore();
        const { activeStake, activeValidator } = useStakingStore();

        const newStake = ref(activeStake.value ? activeStake.value.balance : 0);
        const stakeDelta = ref(0);

        function updateStaked(amount: number) {
            newStake.value = amount;
            stakeDelta.value = amount - (activeStake.value?.balance || 0);
        }

        async function performStaking() {
            context.emit('statusChange', {
                type: 'staking',
                state: State.LOADING,
                title: context.root.$t('Sending Staking Transaction') as string,
            });

            const validatorLabelOrAddress = 'label' in activeValidator.value!
                ? activeValidator.value.label
                : activeValidator.value!.address;

            try {
                if (stakeDelta.value > 0) {
                    if (!activeStake.value || (!activeStake.value.balance && !activeStake.value.inactiveBalance)) {
                        await sendStaking({
                            type: StakingTransactionType.CREATE_STAKER,
                            delegation: activeValidator.value!.address,
                            value: stakeDelta.value,
                            sender: activeAddress.value!,
                            recipient: STAKING_CONTRACT_ADDRESS,
                            recipientType: STAKING_ACCOUNT_TYPE,
                            recipientLabel: context.root.$t('Staking Contract') as string,
                            validityStartHeight: useNetworkStore().state.height,
                        }).catch((error) => {
                            throw new Error(error.data);
                        });

                        context.emit('statusChange', {
                            state: State.SUCCESS,
                            title: context.root.$t(
                                'Successfully staked {amount}NIM with {validator}',
                                {
                                    amount: Math.abs(stakeDelta.value / 1e5),
                                    validator: validatorLabelOrAddress,
                                },
                            ),
                        });
                    } else {
                        // TODO: Differentiate between adding and reactivating stake
                        await sendStaking({
                            type: StakingTransactionType.ADD_STAKE,
                            value: stakeDelta.value,
                            sender: activeAddress.value!,
                            recipient: STAKING_CONTRACT_ADDRESS,
                            recipientType: STAKING_ACCOUNT_TYPE,
                            recipientLabel: context.root.$t('Staking Contract') as string,
                            validityStartHeight: useNetworkStore().state.height,
                        }).catch((error) => {
                            throw new Error(error.data);
                        });

                        context.emit('statusChange', {
                            state: State.SUCCESS,
                            title: context.root.$t(
                                'Successfully added {amount} NIM to your stake with {validator}',
                                {
                                    amount: Math.abs(stakeDelta.value / 1e5),
                                    validator: validatorLabelOrAddress,
                                },
                            ),
                        });
                    }
                } else {
                    await sendStaking({
                        type: StakingTransactionType.SET_INACTIVE_STAKE,
                        newInactiveBalance: activeStake.value!.inactiveBalance - stakeDelta.value,
                        value: 1, // Unused in transaction
                        sender: activeAddress.value!,
                        recipient: STAKING_CONTRACT_ADDRESS,
                        recipientType: STAKING_ACCOUNT_TYPE,
                        recipientLabel: context.root.$t('Staking Contract') as string,
                        validityStartHeight: useNetworkStore().state.height,
                    }).catch((error) => {
                        throw new Error(error.data);
                    });

                    context.emit('statusChange', {
                        state: State.SUCCESS,
                        title: context.root.$t(
                            'Successfully disactivated {amount}NIM from your stake with {validator}',
                            {
                                amount: Math.abs((activeStake.value!.inactiveBalance - stakeDelta.value) / 1e5),
                                validator: validatorLabelOrAddress,
                            },
                        ),
                    });

                    // if (Math.abs(stakeDelta.value) === activeStake.value!.balance) {
                    //     // Close staking modal
                    //     context.root.$router.back();
                    // }
                }

                window.setTimeout(() => {
                    context.emit('statusChange', { type: 'none' });
                    context.emit('next');
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

                // Show error screen
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: context.root.$t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

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
        };
    },
    components: {
        PageHeader,
        PageBody,
        LabelTooltip,
        ValidatorTrustScore,
        ValidatorRewardBubble,
        // StakingGraph,
        AmountSlider,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    .stake-graph-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 3rem;

        .tooltip-bar {
            justify-content: center;

            > * + * {
                margin-left: 0.75rem;
            }
        }
    }
    .page-body {
        padding: 0 0 2rem 0;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;

        .estimated-rewards-overlay {
            position: absolute;
            top: 2.675rem;
            left: 1.5rem;

            ::v-deep .trigger {
                line-height: 1.2;
                font-size: var(--small-size);
                font-weight: 600;
                color: var(--text-40);
                background: white;
                padding: 0.25rem 0.5rem;

                div {
                    align-items: center;

                    svg {
                        margin-left: 0.5rem;
                    }
                }
            }
        }

        .amount-slider {
            margin: 4rem 3rem 0;
        }

        .stake-button {
            width: 40.5rem;
        }

        .disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: var(--small-size);
            text-align: center;
        }

        .stake-disclaimer {
            color: var(--text-50);
        }

        .unstake-disclaimer {
            color: var(--nimiq-light-blue);
        }
    }

    .nq-text {
        margin: 1rem 0 1.5rem;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

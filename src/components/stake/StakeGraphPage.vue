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
                <div class="tooltip-bar flex-row">
                    <LabelTooltip
                        :validatorData="validator"
                        :stakingData="stakingData"
                        />
                    <ValidatorTrustScore :score="validator.trust" dry />
                    <ValidatorRewardBubble :reward="validator.reward" dry />
                </div>
            </template>
        </PageHeader>
        <PageBody>
            <span class="estimated-rewards-overlay">
                <Tooltip
                    preferredPosition="bottom right"
                    :styles="{'width': '32rem', 'margin-left': '-6rem'}"
                    :container="this"
                >
                    <div slot="trigger" class="flex-row">
                        Estimated rewards <InfoCircleSmallIcon />
                    </div>

                    <img src="/img/staking/estimated-rewards-projection.svg" />
                    <p>
                        Your reward is depending on how many people stake.
                        The less people stake, the higher your rewards.
                    </p>
                    <p class="explainer">
                        The corridor assumes that between 20% and 80% of all NIM holders stake.
                    </p>
                </Tooltip>
            </span>
            <StakingGraph v-if="alreadyStaked === true"
                :stakedAmount="currentStake.amount" :apy="validator.reward"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }" />
            <StakingGraph v-else
                :stakedAmount="currentStake.amount" :apy="validator.reward"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }" />

            <StakeAmountSlider class="stake-amount-slider"
                :stakedAmount="preStaked"
                @amount-staked="updateStaked"
                @amount-unstaked="updateUnstaked" />

            <button class="nq-button light-blue stake-button" @click="performStaking">
                {{ $t('Confirm stake') }}
            </button>

            <div class="disclaimer stake-disclaimer" v-if="unstakedAmount === 0">
                {{ $t('Unlock at any time. Your NIM will be available within {hours} hours.', { hours: 12 }) }}
            </div>
            <div class="disclaimer unstake-disclaimer" v-else>
                <Amount
                    :decimals="DISPLAYED_DECIMALS"
                    :amount="unstakedAmount"
                    :currency="STAKING_CURRENCY"
                    :currencyDecimals="NIM_DECIMALS" />
                {{ unstakeDisclaimer }}
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';
import { ValidatorData, StakingData } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';

import StakingGraph, { NOW, MONTH } from './graph/StakingGraph.vue';
import StakeAmountSlider from './StakeAmountSlider.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

import LabelTooltip from './tooltips/LabelTooltip.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';

import { i18n } from '../../i18n/i18n-setup';

import { CryptoCurrency, NIM_DECIMALS, NIM_MAGNITUDE } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';

export default defineComponent({
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();
        const validator = props.activeValidator;
        // whole amount, including staking, check with design
        const availableBalance = ref(activeAddressInfo.value?.balance || 0);

        const preStaked = ref(validator ? validator.stakedAmount : 0);
        const currentStake = Vue.observable({ amount: preStaked.value });
        const unstakedAmount = ref(0);
        const alreadyStaked = ref(currentStake.amount > 0.0 && validator !== null);

        const updateStaked = (amount: number) => {
            if (amount !== currentStake.amount) {
                currentStake.amount = amount;
            }
        };

        const updateUnstaked = (amount: number) => {
            if (amount !== unstakedAmount.value) {
                currentStake.amount = preStaked.value - amount;
                unstakedAmount.value = amount;
            }
        };

        const mockStakedAlready = () => {
            validator.stakeAge = 60 * 60 * 24 * 110;
            validator.stakeSessionRewards = 450 * NIM_MAGNITUDE;
        };

        const performStaking = () => {
            validator.stakedAmount = currentStake.amount;
            if (currentStake.amount < preStaked.value) {
                validator.unstakePending = true;
            } else if (currentStake.amount > preStaked.value) {
                validator.stakePending = true;
            }
            mockStakedAlready();
            context.emit('next');
        };

        return {
            NOW,
            MONTH,
            NIM_DECIMALS,
            STAKING_CURRENCY: CryptoCurrency.NIM,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(unstakedAmount.value, CryptoCurrency.NIM),
            unstakeDisclaimer: i18n.t(
                'will be available in ~{duration}.',
                { duration: i18n.t('{hours} hours', { hours: 12 }) },
            ),
            preStaked,
            currentStake,
            validator,
            alreadyStaked,
            availableBalance,
            unstakedAmount,
            updateStaked,
            updateUnstaked,
            performStaking,
        };
    },
    props: {
        stakingData: {
            type: Object as () => StakingData,
            required: true,
        },
        activeValidator: {
            type: Object as () => ValidatorData,
            required: true,
        },
        validatorsList: {
            type: Array as () => ValidatorData[],
            required: true,
        },
    },
    components: {
        PageHeader,
        PageBody,
        LabelTooltip,
        ValidatorTrustScore,
        ValidatorRewardBubble,
        StakingIcon,
        StakingGraph,
        StakeAmountSlider,
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
        padding: 0;
        position: relative;
        flex-grow: 1;

        .estimated-rewards-overlay {
            position: absolute;
            top: 2.675rem;
            left: 1.5rem;
            z-index: 900;

            /deep/ .trigger {
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

        .stake-amount-slider {
            margin-top: 9.875rem;
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
        margin: 1rem 0;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

<template>
    <div>
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Set an Amount') }}
            </template>
            <template #more>
                <span class="nq-text nq-blue">
                    {{ $t('Use the slider to lock your NIM and earn rewards.') }}
                </span>
                <div class="tooltip-bar">
                    <LabelTooltip
                        :isDry="true"
                        :validatorData="validator"
                        :stakingData="stakingData"
                        />
                    <ScoreTooltip :isMini="false"
                        :isDry="true"
                        :validatorData="validator"
                        :stakingData="stakingData"
                        />
                    <RewardTooltip :isMini="false"
                        :isDry="true"
                        :validatorData="validator"
                        :stakingData="stakingData"
                        />
                </div>
            </template>
        </PageHeader>
        <PageBody>
            <span class="estimated-rewards-overlay">
                <Tooltip
                    preferredPosition="bottom right"
                    :container="this">
                    <div slot="trigger">
                        Estimated rewards <InfoCircleSmallIcon />
                    </div>
                    <div class="estimated-rewards">
                        <div class="big">
                            <img src="/img/staking/estimated-rewards-projection.svg" />
                            Your reward is depending on how many people stake.
                            The less people stake, the higher your rewards.
                        </div>
                        <div class="small">
                            The corridor assumes that between 20% and 80% of all NIM holders stake.
                        </div>
                    </div>
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
            <button class="nq-button light-blue stake-button" @click="$emit('next')">
                {{ $t('confirm stake') }}
            </button>
            <div class="stake-disclaimer" v-if="unstakedAmount === 0">
                {{ $t('Unlock at any time. Your NIM will be available within 12 hours.') }}
            </div>
            <div class="unstake-disclaimer" v-else>
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
import ScoreTooltip from './tooltips/ScoreTooltip.vue';
import RewardTooltip from './tooltips/RewardTooltip.vue';

import { i18n } from '../../i18n/i18n-setup';

import { CryptoCurrency, NIM_DECIMALS } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';

export default defineComponent({
    setup(props) {
        const { activeAddressInfo } = useAddressStore();
        // whole amount, including staking, check with design
        const availableBalance = ref(activeAddressInfo.value?.balance || 0);

        const preStaked = ref(availableBalance.value * .515);
        const currentStake = Vue.observable({ amount: preStaked.value });
        const validator = props.activeValidator;
        const unstakedAmount = ref(0);
        const alreadyStaked = ref(currentStake.amount > 0.0 && validator !== null);

        validator.stakedAmount = currentStake.amount; // temporary

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

        return {
            NOW,
            MONTH,
            NIM_DECIMALS,
            STAKING_CURRENCY: CryptoCurrency.NIM,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(unstakedAmount.value, CryptoCurrency.NIM),
            unstakeDisclaimer: i18n.t(
                'will be available within ~{duration}',
                { duration: '12 hours' },
            ),
            preStaked,
            currentStake,
            validator,
            alreadyStaked,
            availableBalance,
            unstakedAmount,
            updateStaked,
            updateUnstaked,
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
        ScoreTooltip,
        RewardTooltip,
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
    /deep/ .page-header {
        a.page-header-back-button {
            margin-top: 0;
            margin-left: .5rem;
            //padding: 0;
        }
    }
    .page-header {
        position: relative;
        padding-top: 3.125rem;
        height: 17.5rem;
        font-weight: 600;
        /deep/ .nq-h1 {
            font-size: 3rem;
        }
        .tooltip-bar {
            height: 3rem;
            width: 100%;
            margin-top: -4rem;
            margin-bottom: -3rem;
            z-index: 9001;
            white-space: nowrap;
        }
    }
    .page-body {
        padding: 0;
        margin: 0;
        height: 63.375rem;
        overflow: hidden;
        position: relative;
        .estimated-rewards {
            font-size: 1.75rem;
            font-weight: 600;
            color: #FFFFFF;
            line-height: 130%;
            .big {
            }
            .small {
                opacity: .6;
            }
        }
        .estimated-rewards-overlay {
            position: absolute;
            top: 2.375rem;
            left: 1.5rem;
            z-index: 9001;
            .tooltip {
                /deep/ .tooltip-box {
                    width: 32rem;
                    max-width: 32rem;
                }
            }
            /deep/ .trigger {
                line-height: 120%;
                font-size: 1.75rem;
                font-weight: 600;
                color: var(--nim-blue);
                opacity: 0.4;
                border: .375rem solid white;
                white-space: nowrap;
                div svg, div img {
                    display: inline-block;
                }
            }
        }
        .stake-amount-slider {
            margin-top: 9.875rem;
        }

        .stake-button {
            margin: auto;
            margin-top: 2rem;
            width: 40.5rem;
            height: 8rem;
            line-height: 2.5rem;
            letter-spacing: 0.25rem;
            font-weight: 700;
        }

        .stake-disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: 1.75rem;
            color: #1F2348;
            opacity: 0.5;
            text-align: center;
        }

        .unstake-disclaimer {
            margin-top: 2rem;
            font-size: 1.75rem;
            font-weight: 600;
            color: #0582CA;
            text-align: center;
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1rem;
        font-size: 2rem;
    }
</style>

<template>
    <div>
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                <br />
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
                <Tooltip :container="this">
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
            <div v-if="alreadyStaked === true && showView === true">
                <StakingGraph :stakedAmount="currentStake"
                    :apy="validator.reward" :readonly="true"
                    :period="{
                        s: NOW,
                        p: 12,
                        m: MONTH,
                    }"
                    :key="graphUpdate" />
                <AlreadyStakedPartial
                    :validator="validator"
                    :availableBalance="availableBalance"
                    :validatorsList="validatorsList"
                    @adjust-stake="showView = false; showEdit = true;"/>
            </div>
            <div v-else>
                <StakingGraph v-if="alreadyStaked === true && showEdit === true"
                    :stakedAmount="currentStake" :apy="validator.reward"
                    :period="{
                        s: NOW,
                        p: 12,
                        m: MONTH,
                    }"
                    :key="graphUpdate" />
                <StakingGraph v-else
                    :stakedAmount="currentStake" :apy="validator.reward"
                    :period="{
                        s: NOW,
                        p: 12,
                        m: MONTH,
                    }"
                    :key="graphUpdate" />

                <StakeAmountSlider class="stake-amount-slider"
                    :stakedAmount="currentStake"
                    @amount-staked="updateStaked"
                    @amount-unstaked="updateUnstaked"
                    @amount-chosen="updateGraph" />
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
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';
import { ValidatorData, StakingData } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';

import AlreadyStakedPartial from './partials/AlreadyStakedPartial.vue';
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

        // const page = document.querySelector<HTMLElement>('.small-page');
        const graphUpdate = ref(0);
        // whole amount, including staking, check with design
        const availableBalance = ref(activeAddressInfo.value?.balance || 0);
        //
        const currentStake = ref(availableBalance.value * .515);
        const validator = props.activeValidator;
        const unstakedAmount = ref(0);
        const alreadyStaked = ref(currentStake.value > 0.0 && validator !== null);
        const showView = ref(true);
        const showEdit = ref(false);

        validator.stakedAmount = currentStake.value; // temporary

        // if (page !== null) {
        //     page!.style.width = '63.5rem';
        // }
        // onUnmounted(() => {
        //     if (page !== null) {
        //         page.style.removeProperty('width');
        //     }
        // });
        const updateStaked = (amount: number) => {
            if (amount !== currentStake.value) {
                currentStake.value = amount;
            }
        };
        const updateUnstaked = (amount: number) => {
            if (amount !== unstakedAmount.value) {
                unstakedAmount.value = amount;
            }
        };
        const updateGraph = () => {
            graphUpdate.value += 1;
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
            graphUpdate,
            currentStake,
            validator,
            showView,
            showEdit,
            alreadyStaked,
            availableBalance,
            unstakedAmount,
            updateStaked,
            updateUnstaked,
            updateGraph,
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
        AlreadyStakedPartial,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    .page-header {
        position: relative;
        padding-top: .75rem;
        height: 17rem;
        font-weight: 600;
        .tooltip-bar {
            position: absolute;
            bottom: 0rem;
            width: 100%;
            text-align: center;
            z-index: 9001;
            white-space: nowrap;
        }
    }
    .page-body {
        padding: 0;
        margin: 0;
        height: 59.875rem;
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
            top: 1.375rem;
            left: 1.5rem;
            .tooltip {
                .tooltip-box {
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
            margin-top: 12.125rem;
        }

        .stake-button {
            margin: auto;
            margin-top: 2rem;
            width: 40.5rem;
        }

        .stake-disclaimer {
            margin-top: 2rem;
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

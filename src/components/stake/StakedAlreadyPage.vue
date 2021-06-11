<template>
    <div>
        <PageHeader :backArrow="false">
            <template #default>
                {{
                    $t('Staking with {validator}', {
                        validator: validator.label,
                    })
                }}
            </template>
            <template #more>
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
            <StakingGraph :stakedAmount="currentStake"
                :apy="validator.reward" :readonly="true"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }"
                :key="graphUpdate" />

            <div class="already-staked-wrapper">
                <div class="row">
                    <div class="col">
                        <div class="section-title">
                            <StakingIcon />
                            staked
                        </div>
                        <div class="amount-staked">
                            {{ format(validator.stakedAmount, NIM_MAGNITUDE) }} NIM
                            <!-- <Amount ref="$stakedNIMAmount"
                                :decimals="DISPLAYED_DECIMALS"
                                :amount="validator.stakedAmount"
                                :currency="STAKING_CURRENCY"
                                :currencyDecimals="NIM_DECIMALS" /> -->
                        </div>
                        <div class="amount-staked-proportional">
                            {{ $t('{percentage}% of address\'s balance', { percentage: percentage.toFixed(2) }) }}
                        </div>
                    </div>
                    <div class="col right">
                        <button class="nq-button-s"
                            @click="$emit('adjust-stake')">
                                Adjust Stake</button>
                        <button class="nq-button-s solid-red">Unstake all</button>
                    </div>
                </div>
                <div class="horizontal-separator" />
                <div class="row">
                    <div class="col">
                        <div class="section-title">
                            validator
                        </div>

                        <StakeValidatorListItem
                            :validatorData="validator"
                            :stakingData="stakingData"
                            :validatorsList="validatorsList"
                            :selectValidator="() => {}"
                            :isMini="true"
                        />
                    </div>
                    <div class="col right">
                        <button class="nq-button-s"
                            @click="$emit('switch-validator')">Switch Validator</button>
                    </div>
                </div>
                <div class="rewards-history" @click="$emit('next')">
                    {{ $t('Rewards history') }} &gt;
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
import { calculateDisplayedDecimals, formatAmount } from '../../lib/NumberFormatting';

import StakingGraph, { NOW, MONTH } from './graph/StakingGraph.vue';
import StakeValidatorListItem from './StakeValidatorListItem.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

import LabelTooltip from './tooltips/LabelTooltip.vue';
import ScoreTooltip from './tooltips/ScoreTooltip.vue';
import RewardTooltip from './tooltips/RewardTooltip.vue';

import { i18n } from '../../i18n/i18n-setup';

import { CryptoCurrency, NIM_DECIMALS, NIM_MAGNITUDE } from '../../lib/Constants';

export default defineComponent({
    setup(props) {
        const { activeAddressInfo } = useAddressStore();

        const graphUpdate = ref(0);
        // whole amount, including staking, check with design
        const availableBalance = ref(activeAddressInfo.value?.balance || 0);
        //
        const currentStake = ref(availableBalance.value * .515);
        const validator = props.activeValidator;
        const unstakedAmount = ref(0);
        const alreadyStaked = ref(currentStake.value > 0.0 && validator !== null);

        validator.stakedAmount = currentStake.value; // temporary

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

        const percentage = ref(
            (availableBalance.value > 0) ? ((100 * validator.stakedAmount) / availableBalance.value) : 0,
        );
        return {
            NOW,
            MONTH,
            NIM_DECIMALS,
            NIM_MAGNITUDE,
            STAKING_CURRENCY: CryptoCurrency.NIM,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(unstakedAmount.value, CryptoCurrency.NIM),
            unstakeDisclaimer: i18n.t(
                'will be available within ~{duration}',
                { duration: '12 hours' },
            ),
            format: formatAmount,
            graphUpdate,
            currentStake,
            validator,
            alreadyStaked,
            availableBalance,
            unstakedAmount,
            updateStaked,
            updateUnstaked,
            updateGraph,
            percentage,
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
        StakeValidatorListItem,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    .page-header {
        position: relative;
        padding-top: 3.5rem;
        height: 17rem;
        /deep/ .nq-h1 {
            font-size: 3rem;
            font-weight: 700;
        }
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

    .already-staked-wrapper {
        margin: 1.875rem;
        padding-left: 0.1875rem;
        .section-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--nimiq-blue);
            letter-spacing: 1px;
            text-transform: uppercase;
            opacity: 0.4;
            margin-bottom: 1.125rem;
            svg {
                position: relative;
                top: 0.375rem;
                width: 2.5rem;
                opacity: .7;
                line, path {
                    stroke:  var(--nimiq-blue);
                    stroke-width: 1;
                }
            }
        }
        .amount-staked {
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--nimiq-blue);
        }
        .amount-staked-proportional {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--nimiq-blue);
            opacity: .5;
        }
        .horizontal-separator {
            width: 100%;
            height: 0.1875rem;
            border-top: 0.1875rem solid var(--nimiq-blue);
            opacity: 0.2;

            margin-top: 4rem;
            margin-bottom: 4rem;
        }
        .rewards-history {
            font-weight: 600;
            font-size: 1.75rem;
            line-height: 2.625rem;
            opacity: 0.4;
            margin-top: 7rem;
            text-align: center;
            a {
                color: var(--nimiq-blue);
                text-decoration: none;
            }
        }
    }
    .solid-red {
        background-color: var(--nimiq-red);
        color: #fff;
    }
    .row {
        display: flex;
        flex-direction: row;
        .col {
            button {
                margin-right: 2rem;
            }
        }
    }
    .centered {
        display: flex;
        justify-self: center;
        justify-content: center;
        margin: auto;
    }
    .right {
        display: flex;
        justify-self: center;
        justify-content: center;
        margin: auto;
        padding-top: 1.125rem;
        margin-right: 0;
    }
</style>

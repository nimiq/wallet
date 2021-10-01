<template>
    <div class="staked-already-page flex-column">
        <PageHeader :backArrow="false">
            <template v-if="validator">
                {{ $t(
                    'Staking with {validator}',
                    { validator: 'label' in validator ? validator.label : validator.address.substr(0, 9) },
                ) }}
            </template>
            <template v-else>
                {{ $t('Staking') }}
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
            <StakingGraph :stakedAmount="stake ? stake.activeStake : 0"
                :apy="validator && 'reward' in validator ? validator.reward : 0" :readonly="true"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }"
                :key="graphUpdate" />

            <div v-if="stake">
                <span class="nq-label flex-row section-title">
                    <StakingIcon />
                    Staked
                </span>
                <div class="row flex-row">
                    <div class="col flex-grow">
                        <div class="amount-staked">
                            <Amount :amount="stake.activeStake"/>
                        </div>
                        <div class="amount-staked-proportional">
                            {{ $t('{percentage}% of address\'s balance', { percentage: percentage.toFixed(2) }) }}
                        </div>
                    </div>
                    <button class="nq-button-s" @click="$emit('adjust-stake')">Adjust Stake</button>
                    <button class="nq-button-pill red">Unstake all</button>
                </div>
            </div>

            <div class="horizontal-separator" />

            <div v-if="validator">
                <span class="nq-label flex-row section-title">
                    Validator
                </span>
                <div class="row flex-row">
                    <div class="validator flex-grow">
                        <div class="validator-top flex-row">
                            <img v-if="'icon' in validator"
                                class="validator-icon"
                                :src="`/img/staking/providers/${validator.icon}`"
                            />
                            <Identicon v-else class="validator-icon" :address="validator.address"/>
                            {{ 'label' in validator  ? validator.label : validatorData.address.substr(0, 9) }}
                            <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" />
                        </div>
                        <div class="validator-bottom flex-row">
                            <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" />
                            <img src="/img/staking/dot.svg" />
                            <div class="validator-payout">{{ payoutText }}</div>
                        </div>
                    </div>
                    <button class="nq-button-s switch-validator" @click="$emit('switch-validator')">
                        Switch Validator
                    </button>
                </div>
            </div>

            <!-- <button class="nq-button-s rewards-history" @click="$emit('next')">
                {{ $t('Rewards history') }} &gt;
            </button> -->
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import { calculateDisplayedDecimals, formatAmount } from '../../lib/NumberFormatting';
import { getPayoutText } from '../../lib/StakingUtils';

import StakingGraph, { NOW, MONTH } from './graph/StakingGraph.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';

import { CryptoCurrency, NIM_DECIMALS, NIM_MAGNITUDE } from '../../lib/Constants';

export default defineComponent({
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();
        const { activeStake: stake, activeValidator: validator } = useStakingStore();

        const graphUpdate = ref(0);
        const availableBalance = computed(() => activeAddressInfo.value?.balance || 0);

        const unstakedAmount = ref(0);
        const alreadyStaked = ref(!!stake.value && !!validator);

        const percentage = computed(() => availableBalance.value > 0
            ? ((stake.value?.activeStake || 0) / availableBalance.value) * 100
            : 0,
        );

        const payoutText = computed(() => validator.value && 'payout' in validator.value
            ? getPayoutText(validator.value.payout)
            : context.root.$t('Unregistered validator'));

        return {
            NOW,
            MONTH,
            NIM_DECIMALS,
            NIM_MAGNITUDE,
            STAKING_CURRENCY: CryptoCurrency.NIM,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(unstakedAmount.value, CryptoCurrency.NIM),
            unstakeDisclaimer: context.root.$t(
                'will be available within ~{duration}',
                { duration: '12 hours' },
            ),
            format: formatAmount,
            graphUpdate,
            stake,
            validator,
            alreadyStaked,
            availableBalance,
            unstakedAmount,
            percentage,
            payoutText,
        };
    },
    components: {
        PageHeader,
        PageBody,
        StakingIcon,
        StakingGraph,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
        ValidatorTrustScore,
        ValidatorRewardBubble,
    },
});
</script>

<style lang="scss" scoped>
    .staked-already-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 3rem;
    }

    .page-body {
        padding: 0 2rem 2rem;
        position: relative;
        justify-content: space-between;
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
    }

    .section-title {
        padding-left: 2rem;
        align-items: center;

        .nq-icon {
            font-size: 3.25rem;
            margin: -0.5rem 0.25rem 0 -0.75rem;

            /deep/ path {
                stroke-width: 1;
            }
        }
    }

    .amount-staked {
        font-size: var(--h2-size);
        font-weight: bold;
        line-height: 1;
        margin-bottom: 1rem;
    }

    .amount-staked-proportional {
        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;
    }

    .horizontal-separator {
        width: 100%;
        height: 0.1875rem;
        border-top: 0.1875rem solid var(--nimiq-blue);
        opacity: 0.2;

        margin-top: 1rem;
        margin-bottom: 1rem;
    }

    .validator {
        .flex-row {
            align-items: center;
        }

        .validator-top {
            font-size: var(--h2-size);
            font-weight: bold;

            .validator-icon {
                width: 3rem;
                height: 3rem;
                margin-right: 0.75rem;
            }

            .validator-reward-bubble {
                margin-left: 0.75rem;
            }
        }

        .validator-bottom {
            font-size: var(--small-size);
            color: var(--text-50);
            font-weight: 600;
            line-height: 1;
            margin-top: 0.75rem;

            .validator-trust-score,
            img {
                margin-right: 0.675rem;
            }
        }
    }

    .switch-validator {
        flex-shrink: 0;
    }

    .rewards-history {
        align-self: center;
    }

    .row {
        padding: 0 2rem;

        button + button {
            margin-left: 2rem;
        }
    }
</style>

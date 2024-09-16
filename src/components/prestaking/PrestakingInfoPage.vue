<template>
    <div class="prestaking-info-page flex-column">
        <PageHeader :backArrow="false">
            <template>
                {{ $t('Nimiq PoS Prestaking') }}
            </template>
            <template #more>
                <p class="nq-text">{{
                    $t('Prestake as much NIM as you can and help reach the next milestone of securing the network.')
                }}</p>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <PrestakingGraph
                :prestakeAmount="prestakedBalance"
                :accountBalance="availableBalance + prestakedBalance"
                :globalStake="globalStake"
                passive
            />

            <div v-if="prestake">
                <span class="nq-label flex-row section-title">
                    <TwoLeafStakingIcon />
                    {{ $t('Prestaked') }}
                </span>
                <div class="row flex-row">
                    <div class="col flex-grow">
                        <div class="amount-prestaked">
                            <Amount :amount="prestake.balance"/>
                        </div>
                        <div class="amount-prestaked-proportional">
                            {{ $t('{percentage}% of address\'s balance', { percentage: percentage.toFixed(2) }) }}
                        </div>
                        <PrestakingNotice theme="warning" lock/>
                    </div>
                    <div class="flex-row">
                        <button class="nq-button-s" @click="$emit('adjust-prestake')" :disabled="!inPrestakingWindow">
                            {{ $t('Increase Prestake') }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="horizontal-separator" />

            <div v-if="validator">
                <span class="nq-label flex-row section-title">
                    {{ $t('Validator') }}
                </span>
                <div class="row flex-row">
                    <div class="validator flex-grow">
                        <div class="validator-top flex-row">
                            <img v-if="'icon' in validator"
                                class="validator-icon"
                                :src="`/img/prestaking/providers/${validator.icon}`"
                                :alt="validator.label"
                            />
                            <Identicon v-else class="validator-icon" :address="validator.address"/>
                            <span v-if="'label' in validator" class="validator-label">{{ validator.label }}</span>
                            <ShortAddress v-else :address="validator.address"/>
                            <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" />
                        </div>
                        <div v-if="'label' in validator" class="validator-bottom flex-row">
                            <ShortAddress :address="validator.address"/>
                            <!-- <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" />
                            <strong v-if="'trust' in validator && payoutText" class="dot">&middot;</strong>
                            <div v-if="payoutText" class="validator-payout">{{ payoutText }}</div> -->
                        </div>
                    </div>
                </div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import {
    Amount,
    PageHeader,
    PageBody,
    Identicon,
} from '@nimiq/vue-components';
import { usePrestakingStore } from '../../stores/Prestaking';
import { useAddressStore } from '../../stores/Address';
import TwoLeafStakingIcon from '../icons/Prestaking/TwoLeafStakingIcon.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';
import PrestakingNotice from './PrestakingNotice.vue';
import ShortAddress from '../ShortAddress.vue';
import PrestakingGraph from './PrestakingGraph.vue';
import { useNetworkStore } from '../../stores/Network';
import { useConfig } from '../../composables/useConfig';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activePrestake: prestake, activeValidator: validator, globalStake } = usePrestakingStore();
        const { consensus, height } = useNetworkStore();

        const availableBalance = computed(() => activeAddressInfo.value?.balance || 0);
        const prestakedBalance = computed(() => prestake.value ? prestake.value.balance : 0);

        const percentage = computed(() => (
            prestakedBalance.value / (availableBalance.value + prestakedBalance.value)
        ) * 100);

        // const payoutText = computed(() => validator.value && 'label' in validator.value
        //     ? getPayoutText(validator.value.payoutType)
        //     : validator.value?.active
        //         ? context.root.$t('Unregistered validator')
        //         : context.root.$t('Inactive validator'));

        const { config } = useConfig();

        const inPrestakingWindow = computed(() => height.value >= config.prestaking.startBlock
            && height.value <= config.prestaking.endBlock);

        return {
            availableBalance,
            prestake,
            prestakedBalance,
            validator,
            percentage,
            // payoutText,
            consensus,
            inPrestakingWindow,
            globalStake,
        };
    },
    components: {
        PageHeader,
        PageBody,
        TwoLeafStakingIcon,
        Amount,
        PrestakingGraph,
        // ValidatorTrustScore,
        ValidatorRewardBubble,
        Identicon,
        ShortAddress,
        PrestakingNotice,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

    .prestaking-info-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 3rem;

        p {
            margin: 1.25rem 0;
        }
    }

    .page-body {
        padding: 0 2rem 4rem;
        position: relative;
        gap: 2.75rem;
        flex-grow: 1;

        .prestaking-graph {
            margin: 0 -2rem;
        }

        .estimated-rewards-overlay {
            position: absolute;
            top: 2.675rem;
            left: 1.5rem;
            z-index: 900;

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
    }

    .section-title {
        padding-left: 2rem;
        align-items: center;

        .nq-icon {
            font-size: 3.25rem;
            margin: -0.5rem 0.25rem 0 -0.75rem;

            ::v-deep path {
                stroke-width: 1;
            }
        }
    }

    .amount-prestaked {
        font-size: var(--h2-size);
        font-weight: bold;
        line-height: 1;
        margin-bottom: 1rem;
    }

    .adjust-prestake {
        margin-right: 2rem;
        ::v-deep .tooltip-box {
            width: 25.75rem;
        }
    }

    .nq-button-pill:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        // pointer-events: none;
    }

    .amount-prestaked-proportional {
        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;
    }

    .unprestaking {
        align-items: center;
        font-size: var(--body-size);
        font-weight: 600;
        margin-top: 2rem;

        ::v-deep .circle-spinner {
            margin-right: 1rem;
        }

        .inactive-release-timer {
            box-shadow: 0 0 0 1.5px nimiq-light-blue(0.4);
            border-radius: 5rem;
            line-height: 1;
            padding: 0.25rem 0.75rem;
            font-size: var(--small-size);
        }
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

            .validator-icon {
                width: 3rem;
                height: 3rem;
                margin-right: 0.75rem;
            }

            .validator-label {
                font-weight: bold;
            }

            .short-address {
                font-weight: 500;
            }

            .validator-reward-bubble {
                margin-left: 2rem;
            }
        }

        .validator-bottom {
            font-size: var(--small-size);
            color: var(--text-50);
            font-weight: 600;
            line-height: 1;
            margin-top: 0.75rem;

            .dot {
                margin: 0 0.675rem;
            }

            .short-address {
                font-weight: 500;
                margin-left: 3.75rem;
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

        @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
            &.flex-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 1.75rem;
            }
        }
    }
</style>

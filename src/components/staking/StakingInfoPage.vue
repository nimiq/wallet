<template>
    <div class="staking-info-page flex-column">
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
            <!-- <StakingGraph :stakedAmount="stake ? stake.balance : 0"
                :apy="validator && 'reward' in validator ? validator.reward : 0" :readonly="true"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }"
                :key="graphUpdate" /> -->

            <div v-if="stake">
                <span class="nq-label flex-row section-title">
                    <StakingIcon />
                    {{ $t('Staked') }}
                </span>
                <div class="row flex-row">
                    <div class="col flex-grow">
                        <div class="amount-staked">
                            <Amount :amount="stake.balance"/>
                        </div>
                        <div class="amount-staked-proportional">
                            {{ $t('{percentage}% of address\'s balance', { percentage: percentage.toFixed(2) }) }}
                        </div>
                    </div>
                    <div class="flex-row">
                        <button class="nq-button-s" @click="$emit('adjust-stake')" :disabled="isStakeDeactivating">
                            {{ $t('Adjust Stake') }}
                        </button>
                        <!-- <button class="nq-button-pill red unstake-all" @click="unstakeAll">
                            {{ $t('Unstake All') }}
                        </button> -->
                    </div>
                </div>
                <div v-if="stake && stake.inactiveBalance && hasUnstakableStake"
                    class="unstaking row flex-row nq-light-blue"
                >
                    <Amount :amount="stake.inactiveBalance"/>&nbsp;{{ $t('available to unstake') }}
                    <div class="flex-grow"></div>
                    <button class="nq-button-pill light-blue unstake-all" @click="unstakeAll">
                        {{ $t('Unstake') }}
                    </button>
                </div>
                <div v-else-if="stake && stake.inactiveBalance" class="unstaking row flex-row nq-light-blue">
                    <CircleSpinner/> {{ $t('Deactivating') }}&nbsp;<Amount :amount="stake.inactiveBalance"/>
                    <div class="flex-grow"></div>
                    <span class="inactive-release-timer">{{ inactiveReleaseTime }}</span>
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
                                :src="`/img/staking/providers/${validator.icon}`"
                                :alt="validator.label"
                            />
                            <Identicon v-else class="validator-icon" :address="validator.address"/>
                            <span v-if="'label' in validator" class="validator-label">{{ validator.label }}</span>
                            <ShortAddress v-else :address="validator.address"/>
                            <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" />
                        </div>
                        <div class="validator-bottom flex-row">
                            <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" />
                            <strong v-if="'trust' in validator && payoutText" class="dot">&middot;</strong>
                            <div v-if="payoutText" class="validator-payout">{{ payoutText }}</div>
                        </div>
                    </div>
                    <button
                        class="nq-button-s switch-validator"
                        :disabled="!canSwitchValidator"
                        @click="$emit('switch-validator')"
                    >
                        {{ $t('Switch Validator') }}
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
import {
    InfoCircleSmallIcon,
    Amount,
    PageHeader,
    PageBody,
    Tooltip,
    Identicon,
    CircleSpinner,
} from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import { getPayoutText } from '../../lib/StakingUtils';

// import StakingGraph, { NOW, MONTH } from './graph/StakingGraph.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';
import ShortAddress from '../ShortAddress.vue';

import {
    StakingTransactionType,
    STAKING_CONTRACT_ADDRESS,
} from '../../lib/Constants';
import { sendStaking } from '../../hub';
import { useNetworkStore } from '../../stores/Network';

export default defineComponent({
    setup(props, context) {
        const { activeAddress, activeAddressInfo } = useAddressStore();
        const { activeStake: stake, activeValidator: validator } = useStakingStore();
        const { height } = useNetworkStore();

        const graphUpdate = ref(0);
        const availableBalance = computed(() => activeAddressInfo.value?.balance || 0);
        const stakedBalance = computed(() => stake.value ? stake.value.balance : 0);

        const percentage = computed(() => (
            stakedBalance.value / (availableBalance.value + stakedBalance.value + (stake.value?.inactiveBalance || 0))
        ) * 100);

        const payoutText = computed(() => validator.value && 'label' in validator.value
            ? getPayoutText(validator.value.payoutType)
            : validator.value?.active
                ? context.root.$t('Unregistered validator')
                : context.root.$t('Inactive validator'));

        const inactiveReleaseTime = computed(() => {
            if (stake.value?.inactiveRelease) {
                // TODO: Take validator jail release into account
                const secondsRemaining = stake.value.inactiveRelease - height.value;
                const date = new Date(Date.UTC(0, 0, 0, 0, 0, secondsRemaining));
                const hours = date.getUTCHours().toString().padStart(2, '0');
                const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                const seconds = date.getUTCSeconds().toString().padStart(2, '0');
                return [
                    ...(hours !== '' ? [hours] : []),
                    minutes,
                    seconds,
                ].join(':');
            }

            return '00:00';
        });

        const hasUnstakableStake = computed(() => {
            if (!stake.value?.inactiveBalance) return false;
            return height.value > stake.value.inactiveRelease!;
        });

        const isStakeDeactivating = computed(() =>
            stake.value?.inactiveBalance && stake.value?.inactiveBalance > 0,
        );

        async function unstakeAll() {
            await sendStaking({
                type: StakingTransactionType.UNSTAKE,
                value: stake.value!.inactiveBalance,
                sender: STAKING_CONTRACT_ADDRESS,
                recipient: activeAddress.value!,
                validityStartHeight: height.value,
            }).catch((error) => {
                throw new Error(error.data);
            });

            // // Close staking modal
            // context.root.$router.back();
        }

        const canSwitchValidator = computed(() => stake.value?.balance === 0
                && stake.value.inactiveBalance > 0
                && (stake.value.inactiveRelease && stake.value.inactiveRelease < height.value));

        return {
            // NOW,
            // MONTH,
            graphUpdate,
            stake,
            validator,
            percentage,
            payoutText,
            inactiveReleaseTime,
            hasUnstakableStake,
            isStakeDeactivating,
            unstakeAll,
            canSwitchValidator,
        };
    },
    components: {
        PageHeader,
        PageBody,
        StakingIcon,
        // StakingGraph,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
        ValidatorTrustScore,
        ValidatorRewardBubble,
        Identicon,
        CircleSpinner,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

    .staking-info-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 3rem;
    }

    .page-body {
        padding: 0 2rem 8rem;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;

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

    .amount-staked {
        font-size: var(--h2-size);
        font-weight: bold;
        line-height: 1;
        margin-bottom: 1rem;
    }

    .unstake-all:disabled {
        opacity: 0.5;
        pointer-events: none;
    }

    .amount-staked-proportional {
        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;
    }

    .unstaking {
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

        @media (max-width: 700px) { // Full mobile breakpoint
            &.flex-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 1.75rem;
            }
        }
    }
</style>

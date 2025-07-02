<template>
    <div class="staking-overview">
        <div class="staking-container flex-row nq-green-bg" @click="openStakingModal" :key="stake && stake.address">
            <div class="staking-info flex-row">
                <RoundStakingIcon color="white" />
                <div class="staking-amounts flex-column">
                    <div class="amount-row flex-row">
                        <Amount :amount="stakedBalance" value-mask/> {{ $t('staked') }}
                    </div>
                    <div class="details-row flex-row" :class="{
                        'full-opacity': stake && (stake.inactiveBalance || stake.retiredBalance),
                    }">
                        <template v-if="stake && (
                            (stake.inactiveBalance && hasUnstakableStake) || stake.retiredBalance
                        )">
                            <CircleExclamationMarkIcon /> {{ $t('Payout ready')}}
                        </template>
                        <template v-else-if="stake && stake.inactiveBalance">
                            <CircleArrowDownIcon /> {{ $t('Unstaking')}}
                            <span class="dot"></span>
                            <span>{{ inactiveReleaseTime }} left</span>
                        </template>
                        <template v-else>
                            <FiatConvertedAmount :amount="stakedBalance" value-mask/>
                            <span class="dot"></span>
                            <span>{{ percentage }}%</span>
                        </template>
                    </div>
                </div>
            </div>

            <div v-if="restakingRewards" class="rewards flex-row">
                <div class="rewards-amounts flex-column">
                    <div class="amount-row flex-row">
                        +<Amount :amount="restakingRewards" value-mask/>
                    </div>
                    <div class="details-row flex-row">
                        <FiatConvertedAmount :amount="restakingRewards" value-mask/>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="validator" class="validator-container flex-row" @click="openValidatorDetailsModal">
            <div class="validator-details flex-column">
                <div class="validator-name">
                    <ValidatorIcon :validator="validator" class="nq-icon" />
                    <template v-if="'name' in validator">{{ validator.name }}</template>
                    <template v-else><ShortAddress :address="validator.address" /></template>
                </div>
                <div class="validator-stats flex-row">
                    <ValidatorTrustScore
                        v-if="'score' in validator && typeof validator.score.total === 'number'"
                        :score="validator.score.total"
                        borderless
                    />
                    <span v-if="'score' in validator || 'annualReward' in validator" class="dot"></span>
                    <ValidatorReward v-if="'annualReward' in validator" :reward="validator.annualReward" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import { useRouter } from '../../router';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import RoundStakingIcon from '../icons/Staking/RoundStakingIcon.vue';
import ValidatorIcon from './ValidatorIcon.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorReward from './tooltips/ValidatorReward.vue';
import ShortAddress from '../ShortAddress.vue';
import { useNetworkStore } from '../../stores/Network';
import CircleArrowDownIcon from '../icons/Staking/CircleArrowDownIcon.vue';
import CircleExclamationMarkIcon from '../icons/Staking/CircleExclamationMarkIcon.vue';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeStake: stake, activeValidator: validator, restakingRewards } = useStakingStore();
        const router = useRouter();
        const { height } = useNetworkStore();

        const availableBalance = computed(() => activeAddressInfo.value?.balance || 0);
        const stakedBalance = computed(() => stake.value
            ? stake.value.activeBalance + stake.value.inactiveBalance + stake.value.retiredBalance
            : 0);

        const percentage = computed(() => Math.round((
            stakedBalance.value / (availableBalance.value + stakedBalance.value)
        ) * 100));

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

        const openStakingModal = () => {
            router.push({ name: 'staking' });
        };

        const openValidatorDetailsModal = () => {
            router.push({ name: 'validator-details' });
        };

        return {
            stake,
            validator,
            restakingRewards,
            stakedBalance,
            percentage,
            inactiveReleaseTime,
            hasUnstakableStake,
            openStakingModal,
            openValidatorDetailsModal,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        RoundStakingIcon,
        ValidatorIcon,
        ValidatorTrustScore,
        ValidatorReward,
        ShortAddress,
        CircleArrowDownIcon,
        CircleExclamationMarkIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';
@import '../../scss/variables.scss';

.staking-overview {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;

    padding-left: calc(var(--padding) + 2rem);
    padding-right: calc(var(--padding) + 3rem);

    margin-top: -1rem; // 24px
    padding-bottom: 4.125rem;

    @media (max-width: $tabletBreakpoint) {
        flex-direction: column;

        padding-left: 2rem;
        padding-right: 2rem;
        padding-bottom: 2rem;
    }
}

.staking-container {
    border-radius: 1rem;
    padding: 1.5rem;
    color: white;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    flex-grow: 1;
    cursor: pointer;
    transition: transform 0.2s;
    will-change: transform;
    height: 9rem;
    flex-wrap: wrap;

    &:hover, &:focus {
        transform: scale(1.01);
    }

    @media (max-width: $tabletBreakpoint) {
        width: 100%;
        height: auto;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding: 2rem;
    }
}

.staking-info {
    height: 100%;
    align-items: center;
    gap: 2rem;

    .nq-icon {
        font-size: 3.25rem;

        ::v-deep path {
            stroke-width: 1;
            stroke: white;
        }
    }

    @media (max-width: $tabletBreakpoint) {
        height: auto;
        width: 100%;

        .nq-icon {
            font-size: 2.5rem;
        }
    }
}

.staking-amounts, .rewards-amounts {
    .amount-row {
        font-size: var(--body-size);
        font-weight: bold;
        line-height: 2.5rem;
        align-items: center;
        gap: 0.5rem;

        @media (max-width: $tabletBreakpoint) {
            font-size: var(--h3-size);
        }
    }

    .details-row {
        font-size: var(--small-size);
        font-weight: 600;
        line-height: 2.5rem;
        opacity: 0.7;
        align-items: center;
        gap: 0.75rem;

        &.full-opacity {
            opacity: 1;
        }
    }
}

.rewards {
    @media (max-width: $tabletBreakpoint) {
        width: 100%;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        padding-top: 1rem;

        .rewards-amounts {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;

            .amount-row, .details-row {
                margin: 0;
            }
        }
    }
}

.validator-container {
    background: nimiq-blue(0.1);
    border-radius: 1rem;
    padding: 1.5rem;
    color: var(--text-100);
    align-items: center;
    gap: 1rem;
    height: 9rem;
    flex-shrink: 0;

    @media (max-width: $tabletBreakpoint) {
        width: 100%;
        height: auto;
        padding: 2rem;

        .validator-details {
            flex-direction: row;
            align-items: center;
            gap: 1rem;
            width: 100%;
            justify-content: space-between;

            .validator-name {
                margin: 0;
            }

            .validator-stats {
                margin: 0;
            }
        }
    }

    .validator-icon {
        --size: 2.5rem;
    }

    .validator-details {
        .validator-name {
            font-weight: bold;
            font-size: var(--body-size);
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .validator-stats {
            font-size: var(--small-size);
            color: nimiq-blue(0.5);
            font-weight: 600;
            gap: 0.5rem;
            align-items: center;

            ::v-deep .validator-trust-score {
                font-size: var(--small-size);
                height: auto;
            }
        }
    }
}

.dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: currentColor;
}

.staking-container ::v-deep .amount::after {
    color: white;
}
</style>

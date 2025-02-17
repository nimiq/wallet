<template>
    <div class="staking-overview">
        <div class="staking-container flex-row nq-green-bg" @click="openStakingModal">
            <div class="staking-info flex-row">
                <TwoLeafStakingIcon />
                <div class="staking-amounts flex-column">
                    <div class="amount-row flex-row">
                        <Amount :amount="(stake && stake.activeBalance) || 0" value-mask/> staked
                    </div>
                    <div class="details-row flex-row">
                        <FiatConvertedAmount :amount="(stake && stake.activeBalance) || 0" value-mask/>
                        <span class="dot"></span>
                        <span>{{ percentage }}%</span>
                    </div>
                </div>
            </div>

            <div class="rewards flex-row">
                <div class="rewards-amounts flex-column">
                    <div class="amount-row flex-row">
                        +<Amount :amount="restakingRewards || 0" value-mask/>
                    </div>
                    <div class="details-row flex-row">
                        <FiatConvertedAmount :amount="restakingRewards || 0" value-mask/>
                    </div>
                </div>
            </div>
        </div>

        <div class="validator-container flex-row">
            <div class="validator-details flex-column">
                <div class="validator-name">
                    <ValidatorIcon v-if="validator" :validator="validator" class="nq-icon" />
                    <template v-if="validator && 'name' in validator">{{ validator.name }}</template>
                    <template v-else>{{ $t('Validator Name') }}</template>
                </div>
                <div class="validator-stats flex-row">
                    <ValidatorTrustScore
                        v-if="validator && 'score' in validator && typeof validator.score.total === 'number'"
                        :score="validator.score.total"
                        borderless
                    />
                    <span class="dot"></span>
                    <ValidatorReward
                        v-if="validator && 'annualReward' in validator"
                        :reward="validator.annualReward"
                    />
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
import TwoLeafStakingIcon from '../icons/Staking/TwoLeafStakingIcon.vue';
import ValidatorIcon from './ValidatorIcon.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorReward from './tooltips/ValidatorReward.vue';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeStake: stake, activeValidator: validator, restakingRewards } = useStakingStore();
        const router = useRouter();

        const availableBalance = computed(() => activeAddressInfo.value?.balance || 0);
        const stakedBalance = computed(() => stake.value ? stake.value.activeBalance : 0);

        const percentage = computed(() => Math.round((
            stakedBalance.value / (availableBalance.value + stakedBalance.value + (stake.value?.inactiveBalance || 0))
        ) * 100));

        const openStakingModal = () => {
            router.push({ name: 'staking' });
        };

        return {
            stake,
            validator,
            restakingRewards,
            percentage,
            openStakingModal,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        TwoLeafStakingIcon,
        ValidatorIcon,
        ValidatorTrustScore,
        ValidatorReward,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

.staking-overview {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;

    padding-left: calc(var(--padding) + 2rem);
    padding-right: calc(var(--padding) + 3rem);

    padding-top: -1rem; // 24px
    padding-bottom: 4.125rem;
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
    height: 9rem;

    &:hover, &:focus {
        transform: scale(1.01);
    }
}

.staking-info {
    align-items: center;
    gap: 1rem;

    .nq-icon {
        font-size: 3.25rem;

        ::v-deep path {
            stroke-width: 1;
            stroke: white;
        }
    }
}

.staking-amounts, .rewards-amounts {
    .amount-row {
        font-size: var(--h2-size);
        font-weight: bold;
        line-height: 1.2;
        align-items: center;
        gap: 0.5rem;
    }

    .details-row {
        font-size: var(--small-size);
        font-weight: 600;
        opacity: 0.7;
        align-items: center;
        gap: 0.5rem;
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
    margin: 0 0.25rem;
}

.staking-container ::v-deep .amount::after {
    color: white;
}
</style>

<template>
    <button class="staking-preview nq-button-pill green flex-row"
        :disabled="$config.disableNetworkInteraction"
        @click="$router.push({ name: RouteName.Staking })" @mousedown.prevent>
        <!-- The percentages below should also match in AmountSlider.vue -->
        <OneLeafStakingIcon v-if="currentPercentage < 50"/>
        <TwoLeafStakingIcon v-else-if="currentPercentage < 75"/>
        <ThreeLeafStakingIcon v-else/>

        <Amount
            :amount="stake && (stake.activeBalance + stake.inactiveBalance + stake.retiredBalance) || 0"
            value-mask
        />

        <div class="flex-grow"></div>

        <div v-if="restakingRewards" class="gain flex-row">
            +<Amount :amount="restakingRewards" value-mask />
        </div>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { RouteName } from '@/router';
import Amount from '../Amount.vue';
import { useStakingStore } from '../../stores/Staking';
import OneLeafStakingIcon from '../icons/Staking/OneLeafStakingIcon.vue';
import TwoLeafStakingIcon from '../icons/Staking/TwoLeafStakingIcon.vue';
import ThreeLeafStakingIcon from '../icons/Staking/ThreeLeafStakingIcon.vue';
import { useAddressStore } from '../../stores/Address';

export default defineComponent({
    setup() {
        const { activeStake: stake, restakingRewards } = useStakingStore();
        const { activeAddressInfo } = useAddressStore();

        const currentPercentage = computed(() => {
            const alreadyStakedAmount = stake.value?.activeBalance || 0;
            const deactivatedAmount = stake.value?.inactiveBalance || 0;
            const retiredAmount = stake.value?.retiredBalance || 0;
            const totalStakedAmount = alreadyStakedAmount + deactivatedAmount + retiredAmount;

            const availableAmount = (activeAddressInfo.value?.balance || 0) + totalStakedAmount;
            const percent = (100 * alreadyStakedAmount) / availableAmount;

            return percent;
        });

        return {
            stake,
            currentPercentage,
            restakingRewards,
            RouteName,
        };
    },
    components: {
        OneLeafStakingIcon,
        TwoLeafStakingIcon,
        ThreeLeafStakingIcon,
        Amount,
    },
});
</script>

<style lang="scss" scoped>
.staking-preview {
    align-items: center;
    padding: 0.75rem;
    --size: var(--large-button-size);
    font-size: var(--size);
    line-height: 1;
    height: 4.25rem;
    border-radius: 5rem;

    &:disabled {
        // Same style as for disabled send and receive buttons in AddressOverview
        pointer-events: none;
        background: rgba(131, 131, 131, 0.07);
        color: #B5B6C1;

        .gain {
            color: #B5B6C1;
        }
    }

    & > .amount { margin-right: 1.5rem }
}

.nq-icon {
    font-size: 3.25rem;
}

.one-leaf-staking-icon,
.two-leaf-staking-icon,
.three-leaf-staking-icon {
    margin: -0.25rem 0.5rem -0.25rem 0;

    ::v-deep path {
        stroke-width: 1px;
    }
}

.one-leaf-staking-icon {
    margin: .2rem .35rem -0.25rem .2rem;
}

.gain {
    align-items: center;
    background: var(--nimiq-white);
    --size: 1.625rem;
    font-size: var(--size);
    color: var(--nimiq-green);
    height: 2.75rem;
    border-radius: 5rem;
    padding: 0 1.25rem;

    .amount {
        margin-left: 0.25rem;
    }
}
</style>

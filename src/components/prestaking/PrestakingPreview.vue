<template>
    <button class="prestaking-preview nq-button-pill gold flex-row"
        @click="$router.push('/prestaking')" @mousedown.prevent>
        <!-- The percentages below should also match in AmountSlider.vue -->
        <OneLeafStakingIcon v-if="currentPercentage < 50"/>
        <TwoLeafStakingIcon v-else-if="currentPercentage < 75"/>
        <ThreeLeafStakingIcon v-else/>

        <Amount
            :amount="activePrestake && activePrestake.balance || 0"
            value-mask
        />

        <div class="flex-grow"></div>

        <LockIcon :type="LockIconType.MASK"/>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import Amount from '../Amount.vue';
import { useAddressStore } from '../../stores/Address';
import { usePrestakingStore } from '../../stores/Prestaking';
import TwoLeafStakingIcon from '../icons/Prestaking/TwoLeafStakingIcon.vue';
import LockIcon, { LockIconType } from '../icons/Prestaking/LockIcon.vue';
import OneLeafStakingIcon from '../icons/Prestaking/OneLeafStakingIcon.vue';
import ThreeLeafStakingIcon from '../icons/Prestaking/ThreeLeafStakingIcon.vue';

export default defineComponent({
    setup() {
        const { activePrestake, activeValidator } = usePrestakingStore();
        const { activeAddressInfo } = useAddressStore();

        const currentPercentage = computed(() => {
            const alreadyPrestakedAmount = activePrestake.value?.balance || 0;
            const availableAmount = (activeAddressInfo.value?.balance || 0) + alreadyPrestakedAmount;
            const percent = (100 * alreadyPrestakedAmount) / availableAmount;

            return percent;
        });

        return {
            LockIconType,

            activePrestake,
            activeValidator,
            currentPercentage,
        };
    },
    components: {
        OneLeafStakingIcon,
        TwoLeafStakingIcon,
        ThreeLeafStakingIcon,
        Amount,
        LockIcon,
    },
});
</script>

<style lang="scss" scoped>
.prestaking-preview {
    align-items: center;
    padding: 0.75rem;
    --size: var(--large-button-size);
    font-size: var(--size);
    line-height: 1;
    height: 4.25rem;
    border-radius: 5rem;
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

.lock-icon {
    margin-left: 1rem;
    font-size: 2.75rem;
}
</style>

<template>
    <div class="account-balance">
        <h2 class="nq-label">{{ $t('Total Balance') }}</h2>
        <div class="fiat-amount" ref="$fiatAmountContainer">
            <FiatConvertedAmount
                :amount="1089716251785456"
                ref="$fiatAmount"
                :style="{ fontSize: `${fiatAmountFontSize}rem` }"
            />
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, ref, onBeforeUnmount, onMounted } from '@vue/composition-api';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import { useAddressStore } from '../stores/Address';
// re add <BalanceDistribution /> once Bitcoin is avalable
// import BalanceDistribution from './BalanceDistribution.vue';

export default defineComponent({
    setup() {
        const { accountBalance } = useAddressStore();

        const $fiatAmountContainer = ref<HTMLDivElement>(null);
        const $fiatAmount = ref<Vue>(null);
        const fiatAmountDefautFontSize = 7; // the default desktop font-size of .fiat-amount
        const fiatAmountFontSize = ref(fiatAmountDefautFontSize);

        async function updateFontSize() {
            await Vue.nextTick();

            const availableWidth = $fiatAmountContainer.value!.offsetWidth;
            const referenceWidth = ($fiatAmount.value!.$el as HTMLElement).offsetWidth;
            const scaleFactor = Math.round((availableWidth / referenceWidth) * 100) / 100;

            if (scaleFactor > 1.02 || scaleFactor < 0.98) { // needed for safari
                fiatAmountFontSize.value = Math.min(fiatAmountDefautFontSize, fiatAmountFontSize.value * scaleFactor);
            }
        }

        window.addEventListener('resize', updateFontSize);
        onBeforeUnmount(() => window.removeEventListener('resize', updateFontSize));
        onMounted(() => updateFontSize());

        return {
            accountBalance,
            $fiatAmount,
            $fiatAmountContainer,
            fiatAmountFontSize,
        };
    },
    components: {
        // BalanceDistribution,
        FiatConvertedAmount,
    },
});
</script>

<style lang="scss" scoped>
.account-balance {
    text-align: center;
}

.nq-label {
    margin-bottom: 0.5rem;
}

.fiat-amount {
    font-size: 7rem;
}

@media (max-width: 1160px) { // Half mobile breakpoint
    .fiat-amount {
        font-size: 5.5rem;
    }
}
</style>

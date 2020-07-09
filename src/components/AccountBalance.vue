<template>
    <div class="account-balance">
        <h2 class="nq-label">{{ $t('Total Balance') }}</h2>
        <div class="fiat-amount" ref="$fiatAmountContainer">
            <FiatConvertedAmount
                :amount="accountBalance"
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
// re add <BalanceDistribution /> once Bitcoin is avalable
// import BalanceDistribution from './BalanceDistribution.vue';
import { useAddressStore } from '../stores/Address';

const FIAT_DEFAULT_SIZE = 7; // rem, the default desktop font-size of .fiat-amount

export default defineComponent({
    setup(props, context) {
        const { accountBalance } = useAddressStore();

        const $fiatAmountContainer = ref<HTMLDivElement>(null);
        const $fiatAmount = ref<Vue>(null);
        const fiatAmountFontSize = ref(FIAT_DEFAULT_SIZE);

        async function updateFontSize() {
            await context.root.$nextTick();

            if (!$fiatAmountContainer.value || !$fiatAmount.value) return;

            const availableWidth = $fiatAmountContainer.value!.offsetWidth;
            const referenceWidth = ($fiatAmount.value!.$el as HTMLElement).offsetWidth;
            const scaleFactor = Math.round((availableWidth / referenceWidth) * 100) / 100;

            if (scaleFactor > 1.02 || scaleFactor < 0.98) { // needed for safari
                fiatAmountFontSize.value = Math.min(FIAT_DEFAULT_SIZE, fiatAmountFontSize.value * scaleFactor);
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
    margin-top: 0;
    margin-bottom: 1.5rem;
}

.fiat-amount {
    font-size: 7rem;
    // Fixed line-height, so that the block height doesn't change when
    // the font-size is dynamically adjusted for number length.
    line-height: 7rem;
}

@media (max-width: 1160px) { // Half mobile breakpoint
    .fiat-amount {
        font-size: 5.5rem;
        line-height: 5.5rem;
    }
}
</style>

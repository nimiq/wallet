<template>
    <transition name="fade" mode="out-in">
        <FiatAmount v-if="fiatAmount !== undefined" :amount="fiatAmount" :currency="fiatCurrency" :locale="language"/>
        <div v-else class="fiat-amount placeholder"></div>
    </transition>
</template>

<script lang="ts">
import { FiatAmount } from '@nimiq/vue-components';
import { defineComponent, computed } from '@vue/composition-api';
import { useFiatStore } from '../stores/Fiat';
import { useSettingsStore } from '../stores/Settings';
import { CryptoCurrency } from '../lib/Constants';

export default defineComponent({
    name: 'FiatConvertedAmount',
    props: {
        // Amount in luna
        amount: {
            required: true,
        },
    },
    setup(props) {
        const fiatStore = useFiatStore();

        const fiatCurrency = computed(() => fiatStore.currency.value);
        const exchangeRate = computed(() => fiatStore.exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value]);
        const fiatAmount = computed(() => exchangeRate.value !== undefined && typeof props.amount === 'number'
            ? (props.amount / 1e5) * exchangeRate.value
            : undefined,
        );

        const { language } = useSettingsStore();

        return {
            fiatAmount,
            fiatCurrency,
            language,
        };
    },
    components: { FiatAmount } as any,
});
</script>

<style scoped lang="scss">
.placeholder {
    min-height: calc(1em * 1.25);
    transition-duration: 0s;
}
</style>

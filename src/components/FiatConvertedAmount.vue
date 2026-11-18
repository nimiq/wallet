<template>
    <transition name="fade" mode="out-in">
        <FiatAmount v-if="fiatAmount !== undefined"
            :amount="Math.min(roundDown ? Math.floor(fiatAmount) : fiatAmount, max || Infinity)"
            :hideDecimals="roundDown"
            :currency="fiatCurrency"/>
        <div v-else class="fiat-amount placeholder"></div>
    </transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { FiatAmount } from '@nimiq/vue-components';
import { useFiatStore } from '../stores/Fiat';
import { CryptoCurrency, FiatCurrency } from '../lib/Constants';

export default defineComponent({
    name: 'FiatConvertedAmount',
    props: {
        // Amount in luna
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String as () => CryptoCurrency,
            default: CryptoCurrency.NIM,
        },
        roundDown: {
            type: Boolean,
            default: false,
        },
        fiat: {
            type: String as () => FiatCurrency,
            required: false,
        },
        max: {
            type: Number,
            required: false,
        },
    },
    setup(props) {
        const fiatStore = useFiatStore();

        const fiatCurrency = computed(() => props.fiat || fiatStore.currency.value);
        const exchangeRate = computed(() => fiatStore.exchangeRates.value[props.currency]?.[fiatCurrency.value]);
        const currencyDecimals = computed(() => {
            switch (props.currency) {
                case CryptoCurrency.BTC: return 8;
                case CryptoCurrency.USDC:
                case CryptoCurrency.USDT:
                    return 6;
                default: return 5;
            }
        });
        const fiatAmount = computed(() => exchangeRate.value !== undefined && typeof props.amount === 'number'
            ? (props.amount / 10 ** currencyDecimals.value) * exchangeRate.value
            : undefined,
        );

        return {
            fiatAmount,
            fiatCurrency,
        };
    },
    components: {
        FiatAmount,
    },
});
</script>

<style scoped lang="scss">
.placeholder {
    min-height: calc(1em * 1.25);
    transition-duration: 0s;
}
</style>

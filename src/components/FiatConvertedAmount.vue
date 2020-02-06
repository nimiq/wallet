<template>
    <FiatAmount v-if="fiatAmount !== undefined" :amount="fiatAmount" :currency="fiatCurrency"/>
</template>

<script lang="ts">
import { FiatAmount } from '@nimiq/vue-components';
import { createComponent, computed } from '@vue/composition-api'
import { useFiatStore } from '../stores/Fiat'
import { CryptoCurrency } from '../lib/Constants';

export default createComponent({
    name: 'FiatConvertedAmount',
    props: {
        // Amount in luna
        amount: {
            type: Number,
            required: true,
        },
    },
    setup(props) {
        const fiatStore = useFiatStore();

        const fiatCurrency = computed(() => fiatStore.currency.value);
        const exchangeRate = computed(() => fiatStore.exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value]);
        const fiatAmount = computed(() => exchangeRate.value !== undefined
            ? props.amount / 1e5 * exchangeRate.value
            : undefined
        );

        return {
            fiatAmount,
            fiatCurrency,
        }
    },
    components: { FiatAmount }
})
</script>

<style lang="scss">

</style>

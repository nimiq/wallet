<template>
    <FiatAmount :amount="fiatAmount" :currency="fiatCurrency"/>
</template>

<script lang="ts">
import { FiatAmount } from '@nimiq/vue-components';
import { createComponent, computed } from '@vue/composition-api'
import { useFiatStore } from '../stores/Fiat'

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
        const { state: fiat$ } = useFiatStore()

        const fiatAmount = computed(() => props.amount / 1e5 * fiat$.exchangeRate)
        const fiatCurrency = computed(() => fiat$.currency);

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

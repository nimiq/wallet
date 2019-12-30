<template>
    <span class="whitespace-no-wrap">
        {{ formattedAmount }}
        <span>{{ symbol }}</span>
    </span>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { useFiatStore, SYMBOLS } from '../stores/Fiat'
import { formatted } from '../lib/NumberFormatting'

export default createComponent({
    name: 'FiatAmount',
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
        const formattedAmount = computed(() => formatted(fiatAmount.value, 2, 2))
        const symbol = computed(() => SYMBOLS[fiat$.currency])

        return {
            formattedAmount,
            symbol,
        }
    },
})
</script>

<style lang="scss">

</style>

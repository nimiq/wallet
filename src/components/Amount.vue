<template>
    <span class="whitespace-no-wrap">
        {{ formattedAmount }}
        <span>NIM</span>
    </span>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { formatted } from '../lib/NumberFormatting'

export default createComponent({
    name: 'Amount',
    props: {
        // Amount in luna
        amount: {
            type: Number,
            required: true,
        },
    },
    setup(props) {
        const formattedAmount = computed(() => formatted(props.amount / 1e5, 2, 2))

        return {
            formattedAmount,
        }
    },
})
</script>

<style lang="scss">

</style>

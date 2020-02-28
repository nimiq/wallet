<template>
    <Amount :decimals="maxDecimals" :amount="amount" :currency="currency" />
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { useSettingsStore } from '../stores/Settings';

export default defineComponent({
    name: 'amount',
    props: {
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: false,
        },
    },
    setup() {
        const { showDecimals } = useSettingsStore();
        const maxDecimals = computed(() =>
            // for BTC add condition here
            showDecimals.value ? 5 : 2);
        return {
            maxDecimals,
        };
    },
    components: {
        Amount,
    } as any,
});
</script>

<style lang="scss">

</style>

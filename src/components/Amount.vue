<template>
    <Amount :decimals="maxDecimals" :amount="amount" :currency="currency" />
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { useSettingsStore } from '../stores/Settings'
import { Amount } from '@nimiq/vue-components';

export default createComponent({
    name: 'amount',
    props: {
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        const { showDecimals } = useSettingsStore();
        const maxDecimals = computed(() => {
            // for BTC add condition here
            return showDecimals.value ? 5 : 2;
        });
        return {
            maxDecimals,
        };
    },
    components: {
        Amount,
    }
})
</script>

<style lang="scss">

</style>

<template>
    <Amount v-if="typeof amount === 'number'" :decimals="displayedDecimals" :amount="amount" :currency="currency" />
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { useSettingsStore } from '../stores/Settings';

export default defineComponent({
    name: 'amount',
    props: {
        amount: {
            default: null as number | null,
            required: true,
        },
        currency: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        const { decimals } = useSettingsStore();

        const displayedDecimals = computed(() => {
            // for BTC add condition here

            if (props.amount === null) return 0;

            if (props.amount < 0.01 * 1e5) return 5;
            if (props.amount < 1 * 1e5) return Math.max(decimals.value, 2);
            return decimals.value;
        });

        return {
            displayedDecimals,
        };
    },
    components: {
        Amount,
    } as any,
});
</script>

<style lang="scss">

</style>

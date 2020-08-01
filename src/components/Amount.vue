<template>
    <Amount v-if="typeof amount === 'number'"
        :decimals="displayedDecimals"
        :amount="amount"
        :currency="currency"
        :currencyDecimals="currencyDecimals"/>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { useSettingsStore } from '../stores/Settings';
import { CryptoCurrency } from '../lib/Constants';

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

        const currencyDecimals = computed(() => {
            switch (props.currency) {
                case CryptoCurrency.BTC: return 8;
                default: return 5;
            }
        });

        const displayedDecimals = computed(() => {
            if (props.amount === null) return 0;
            if (props.currency === CryptoCurrency.BTC) {
                if (props.amount > 0 && props.amount < 0.0001 * 10 ** currencyDecimals.value) return 8;
            }
            if (props.amount > 0 && props.amount < 0.01 * 10 ** currencyDecimals.value) return 5;
            if (props.amount > 0 && props.amount < 1 * 10 ** currencyDecimals.value) return Math.max(decimals.value, 2);
            return decimals.value;
        });

        return {
            displayedDecimals,
            currencyDecimals,
        };
    },
    components: {
        Amount,
    } as any,
});
</script>

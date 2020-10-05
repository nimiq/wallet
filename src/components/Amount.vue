<template>
    <Amount v-if="typeof amount === 'number'"
        :decimals="displayedDecimals"
        :amount="amount"
        :currency="ticker"
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
            type: String as () => CryptoCurrency,
            required: false,
        },
    },
    setup(props) {
        const { decimals, btcDecimals, btcUnit } = useSettingsStore();

        const currencyDecimals = computed(() => {
            switch (props.currency) {
                case CryptoCurrency.BTC: {
                    if (btcUnit.value === 'mbtc') return 5;
                    return 8;
                }
                default: return 5;
            }
        });

        const displayedDecimals = computed(() => {
            if (props.amount === null) return 0;

            if (props.currency === CryptoCurrency.BTC) {
                // For mBTC
                if (btcUnit.value === 'mbtc') {
                    if (props.amount === 0) return Math.min(btcDecimals.value, 5);
                    if (props.amount < 0.01 * 1e5) return 5;
                    if (props.amount < 1 * 1e5) return Math.max(Math.min(btcDecimals.value, 5), 2);
                    return Math.min(btcDecimals.value, 5);
                }

                // For BTC
                if (props.amount === 0) return btcDecimals.value;
                if (props.amount < 0.000001 * 1e8) return 8;
                if (props.amount < 0.0001 * 1e8) return Math.max(btcDecimals.value, 6);
                if (props.amount < 0.01 * 1e8) return Math.max(btcDecimals.value, 4);
                if (props.amount < 1 * 1e8) return Math.max(btcDecimals.value, 2);
                return btcDecimals.value;
            }

            // For NIM:
            if (props.amount === 0) return decimals.value;
            if (props.amount < 0.01 * 1e5) return 5;
            if (props.amount < 1 * 1e5) return Math.max(decimals.value, 2);
            return decimals.value;
        });

        const ticker = computed(() => {
            if (props.currency === CryptoCurrency.BTC) return btcUnit.value;
            return CryptoCurrency.NIM;
        });

        return {
            displayedDecimals,
            currencyDecimals,
            ticker,
        };
    },
    components: {
        Amount,
    } as any,
});
</script>

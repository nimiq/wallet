<template>
    <Amount v-if="typeof amount === 'number'"
        :decimals="displayedDecimals"
        :amount="amount"
        :currency="ticker"
        :currencyDecimals="currencyDecimals"/>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { Amount } from '@nimiq/vue-components';
import { useSettingsStore } from '../stores/Settings';
import { CryptoCurrency } from '../lib/Constants';
import { calculateDisplayedDecimals } from '../lib/NumberFormatting';

export default defineComponent({
    props: {
        amount: {
            default: null as number | null,
            required: true,
        },
        currency: {
            type: String as () => CryptoCurrency | 'usdc.e',
            default: CryptoCurrency.NIM,
        },
    },
    setup(props) {
        const { btcUnit } = useSettingsStore();

        const currencyDecimals = computed(() => {
            switch (props.currency) {
                case CryptoCurrency.BTC: return btcUnit.value.decimals;
                case CryptoCurrency.USDC:
                case 'usdc.e':
                case CryptoCurrency.USDT:
                    return 6;
                default: return 5;
            }
        });

        const displayedDecimals = computed(() => calculateDisplayedDecimals(props.amount, props.currency));

        const ticker = computed(() => {
            if (props.currency === CryptoCurrency.BTC) return btcUnit.value.ticker.toLowerCase();
            return props.currency;
        });

        return {
            displayedDecimals,
            currencyDecimals,
            ticker,
        };
    },
    components: {
        Amount,
    },
});
</script>

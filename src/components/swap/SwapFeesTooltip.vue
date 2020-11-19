<template>
    <Tooltip :styles="{width: '31.5rem'}" v-bind="$attrs" class="swap-fees-tooltip">
        <slot name="trigger" slot="trigger">
            <InfoCircleSmallIcon />
        </slot>
        <div class="price-breakdown">
            <label>{{ $t('BTC network fees') }}</label>
            <FiatAmount :amount="myBtcFeeFiat + serviceBtcFeeFiat" :currency="currency"/>
        </div>
        <p class="explainer">
            {{ $t('Atomic swaps require two BTC transactions.') }}
        </p>
        <div class="price-breakdown">
            <label>{{ $t('NIM network fees') }}</label>
            <FiatAmount :amount="myNimFeeFiat + serviceNimFeeFiat" :currency="currency"/>
        </div>
        <div class="price-breakdown">
            <label>{{ $t('Swap fee') }}</label>
            <FiatAmount :amount="serviceExchangeFeeFiat" :currency="currency"/>
        </div>
        <p class="explainer">
            {{ $t('{perc}% of swap value.', { perc: serviceExchangeFeePercentage }) }}
        </p>
        <hr>
        <div class="price-breakdown">
            <label>{{ $t('Total fees') }}</label>
            <FiatAmount
                class="total-fees"
                :amount="myBtcFeeFiat
                    + myNimFeeFiat
                    + serviceBtcFeeFiat
                    + serviceNimFeeFiat
                    + serviceExchangeFeeFiat"
                :currency="currency"/>
        </div>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { InfoCircleSmallIcon, Tooltip, FiatAmount } from '@nimiq/vue-components';
import { FiatCurrency } from '../../lib/Constants';

export default defineComponent({
    props: {
        myBtcFeeFiat: Number,
        myNimFeeFiat: Number,
        serviceBtcFeeFiat: Number,
        serviceNimFeeFiat: Number,
        serviceExchangeFeeFiat: Number,
        serviceExchangeFeePercentage: Number,
        currency: String as () => FiatCurrency,
    },
    components: {
        InfoCircleSmallIcon,
        Tooltip,
        FiatAmount,
    },
});
</script>

<style lang="scss" scoped>
hr {
    margin: 1.75rem -1rem 1.5rem;
    border: unset;
    border-top: 1px solid currentColor;
    opacity: .2;
}

.total-fees {
    font-weight: bold;
}
</style>

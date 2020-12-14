<template>
    <Tooltip :styles="{width: '31.5rem'}" v-bind="$attrs" class="swap-fees-tooltip">
        <slot name="trigger" slot="trigger">
            <InfoCircleSmallIcon />
        </slot>
        <template v-if="btcFeeFiat !== undefined">
            <div class="price-breakdown">
                <label>{{ $t('BTC network fee') }}</label>
                <FiatAmount :amount="btcFeeFiat" :currency="currency"/>
            </div>
            <p class="explainer">
                {{ $t('Atomic swaps require two BTC transactions.') }}
            </p>
        </template>

        <template v-if="oasisFeeFiat !== undefined">
            <div class="price-breakdown">
                <label>{{ $t('OASIS service fee') }}</label>
                <FiatAmount :amount="oasisFeeFiat" :currency="currency"/>
            </div>
        </template>


        <template v-if="nimFeeFiat !== undefined">
            <div class="price-breakdown">
                <label>{{ $t('NIM network fee') }}</label>
                <FiatAmount :amount="nimFeeFiat" :currency="currency"/>
            </div>
        </template>

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
                :amount="
                    (btcFeeFiat || 0)
                    + (oasisFeeFiat || 0)
                    + (nimFeeFiat || 0)
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
        btcFeeFiat: {
            type: Number,
            required: false,
        },
        oasisFeeFiat: {
            type: Number,
            required: false,
        },
        nimFeeFiat: {
            type: Number,
            required: false,
        },
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

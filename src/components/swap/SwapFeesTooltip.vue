<template>
    <Tooltip :styles="{width: '34.5rem'}" v-bind="$attrs" class="swap-fees-tooltip">
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
            <p v-if="oasisFeePercentage !== undefined" class="explainer">
                {{ $t('{perc}% of swap value.', { perc: oasisFeePercentage }) }}
                <i18n v-if="oasisMinFeeFiat" path="min {amount}" tag="span" class="capitalize">
                    <FiatAmount slot="amount" :amount="oasisMinFeeFiat" :currency="currency"/>
                </i18n>
            </p>
        </template>

        <template v-if="sepaFeeFiat !== undefined">
            <div class="price-breakdown">
                <label>{{ $t('SEPA Instant fee') }}</label>
                <FiatAmount :amount="sepaFeeFiat" :currency="currency"/>
            </div>
            <!-- <p class="explainer">{{ $t('Banking network fee') }}</p> -->
        </template>

        <template v-if="usdcFeeFiat !== undefined">
            <div class="price-breakdown">
                <label>{{ $t('USDC network fee') }}</label>
                <FiatAmount :amount="usdcFeeFiat" :currency="currency"/>
            </div>
        </template>

        <template v-if="usdtFeeFiat !== undefined">
            <div class="price-breakdown">
                <label>{{ $t('USDT network fee') }}</label>
                <FiatAmount :amount="usdtFeeFiat" :currency="currency"/>
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
            <FiatAmount :amount="serviceSwapFeeFiat" :currency="currency"/>
        </div>
        <p class="explainer">
            {{ $t('{perc}% of swap value.', { perc: serviceSwapFeePercentage }) }}
        </p>

        <hr>

        <div class="price-breakdown">
            <label>{{ $t('Total fees') }}</label>
            <FiatAmount
                class="total-fees"
                :amount="
                    (btcFeeFiat || 0)
                    + (oasisFeeFiat || 0)
                    + (sepaFeeFiat || 0)
                    + (nimFeeFiat || 0)
                    + (usdcFeeFiat || 0)
                    + (usdtFeeFiat || 0)
                    + serviceSwapFeeFiat"
                :currency="currency" :hideDecimals="false"/>
        </div>

        <slot name="exchange-rate" />
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
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
        oasisFeePercentage: {
            type: Number,
            required: false,
        },
        oasisMinFeeFiat: {
            type: Number,
            required: false,
        },
        sepaFeeFiat: {
            type: Number,
            required: false,
        },
        nimFeeFiat: {
            type: Number,
            required: false,
        },
        usdcFeeFiat: {
            type: Number,
            required: false,
        },
        usdtFeeFiat: {
            type: Number,
            required: false,
        },
        serviceSwapFeeFiat: Number,
        serviceSwapFeePercentage: Number,
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

.capitalize {
    text-transform: capitalize;
}

.total-fees {
    font-weight: bold;
}
</style>

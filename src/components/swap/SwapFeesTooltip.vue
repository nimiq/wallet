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
                    + serviceSwapFeeFiat"
                :currency="currency" :hideDecimals="false"/>
        </div>

        <div v-if="exchangeRate" class="exchange-rate">
            <span>
                <Amount :amount="exchangeRate.amount" :currency="exchangeRate.from" :decimals="0" />
                =
                <Amount :amount="exchangeRate.rate" :currency="exchangeRate.to" />
            </span>
            <label>{{ $t('Exchange rate') }}</label>
        </div>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { InfoCircleSmallIcon, Tooltip, FiatAmount, Amount } from '@nimiq/vue-components';
import { SwapAsset } from '@nimiq/fastspot-api';
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
        exchangeRate: {
            type: Object as () => {
                from: SwapAsset,
                amount: number,
                to: SwapAsset,
                rate: number,
            },
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
        Amount,
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

.exchange-rate {
    margin-top: 2rem;
    padding-bottom: 0.25rem;

    & > span {
        display: block;

        & ::v-deep .amount {
            font-size: 15px;
        }
    }

    label {
        opacity: 0.6;
        font-size: var(--small-size);
    }
}
</style>

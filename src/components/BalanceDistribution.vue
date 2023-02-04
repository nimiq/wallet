<template>
    <div class="balance-distribution">
        <svg ref="svg$" xmlns="http://www.w3.org/2000/svg" :viewBox="`0 0 ${svgSize} ${svgSize}`">
            <circle v-for="arc in currencyArcs" :key="arc.currency"
                :r="radius"
                :stroke-width="STROKE_WIDTH"
                :stroke-dasharray="`${arc.length} ${arc.spacing}`"
                :stroke-dashoffset="arc.offset"
                class="arc" :class="[arc.currency, { 'has-no-balance': arc.hasNoBalance }]"
            />
        </svg>
        <ul class="breakdown">
            <li v-for="record in breakdown" :key="record.currency"
                :class="{ 'has-no-balance': record.hasNoBalance }">
                <div class="currency">{{ record.currency }}</div>
                <div class="percentage">{{ record.percentage }}</div>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { useUsdcAddressStore } from '../stores/UsdcAddress';
import { useFiatStore } from '../stores/Fiat';
import { useConfig } from '../composables/useConfig';
import { CryptoCurrency } from '../lib/Constants';

type SupportedCurrency = CryptoCurrency.NIM | CryptoCurrency.BTC | CryptoCurrency.USDC;

interface CurrencyArc {
    currency: SupportedCurrency;
    length: number;
    spacing: number;
    offset: number;
    hasNoBalance: boolean;
}

export default defineComponent({
    name: 'balance-distribution',
    setup(props, context) {
        const { currency: fiatCurrency, exchangeRates } = useFiatStore();
        const cryptoBalances = computed(() => ({
            [CryptoCurrency.NIM]: useAddressStore().accountBalance.value / 1e5,
            [CryptoCurrency.BTC]: useBtcAddressStore().accountBalance.value / 1e8,
            [CryptoCurrency.USDC]: useUsdcAddressStore().accountBalance.value / 1e6,
        }));

        const { config } = useConfig();

        const STROKE_WIDTH = 4; // px
        const svg$ = ref<SVGElement>(null);
        const svgSize = ref(0);
        const fullCircleLength = ref(0);
        const radius = computed(() => Math.max(0, (svgSize.value - STROKE_WIDTH) / 2));

        const resizeObserver = new ResizeObserver(async ([{ borderBoxSize, contentRect }]) => {
            if (borderBoxSize?.length) {
                svgSize.value = borderBoxSize[0].blockSize;
            } else {
                // legacy ResizeObserver
                svgSize.value = contentRect.width;
            }
            await context.root.$nextTick();
            // Try to measure the actual svg path length if possible because it does not exactly match 2 * PI * r.
            fullCircleLength.value = svg$.value?.querySelector('circle')?.getTotalLength()
                || 2 * Math.PI * radius.value;
        });

        watch(svg$, () => {
            if (svg$.value) {
                resizeObserver.observe(svg$.value);
            } else {
                resizeObserver.disconnect();
            }
        });

        const currencies = computed<Array<SupportedCurrency>>(() => [
            CryptoCurrency.NIM,
            ...(config.enableBitcoin ? [CryptoCurrency.BTC] as Array<CryptoCurrency.BTC> : []),
            ...(config.usdc.enabled ? [CryptoCurrency.USDC] as Array<CryptoCurrency.USDC> : []),
        ]);

        // Can be used for testing by manually defining balances either here or in the browser's dev tools.
        const testFiatBalances = ref(null);

        const balanceDistribution = computed(() => {
            const fiatBalances = testFiatBalances.value || currencies.value.reduce((balances, currency) => ({
                ...balances,
                [currency]: cryptoBalances.value[currency] * (exchangeRates.value[currency]?.[fiatCurrency.value] ?? 0),
            }), {} as Record<SupportedCurrency, number>);

            const totalFiatBalance = currencies.value.reduce((sum, currency) => sum + fiatBalances[currency], 0);

            return currencies.value.reduce((distribution, currency) => ({
                ...distribution,
                [currency]: totalFiatBalance ? fiatBalances[currency] / totalFiatBalance : 0,
            }), {} as Record<SupportedCurrency, number>);
        });

        const currencyArcs = computed(() => {
            if (!fullCircleLength.value) return []; // svg measurements not ready yet

            const nonEmptyCurrencies = currencies.value.filter((currency) => !!balanceDistribution.value[currency]);
            const arcCurrencies = nonEmptyCurrencies.length ? nonEmptyCurrencies : currencies.value;
            const availableLength = arcCurrencies.length !== 1
                // There should be a gap of STROKE_WIDTH between each arc and additionally each arc has two line caps of
                // length STROKE_WIDTH / 2 each which do not count towards the arc's length. Not counting them towards
                // the length also ensures rendering very small allocations as a dot of at least radius STROKE_WIDTH.
                ? fullCircleLength.value - arcCurrencies.length * 2 * STROKE_WIDTH
                // If there is just a single currency, render it as full circle without gap and line caps.
                : fullCircleLength.value;

            const result: Partial<Record<SupportedCurrency, CurrencyArc>> = {};
            // Rotate by -90 degree to start at the top. Offset by linecap (STROKE_WIDTH/2) and half gap to have the gap
            // centered at the top.
            let offset = fullCircleLength.value / 4 - STROKE_WIDTH;
            for (const currency of arcCurrencies) {
                const length = nonEmptyCurrencies.length
                    ? balanceDistribution.value[currency] * availableLength
                    : availableLength / arcCurrencies.length;
                const spacing = fullCircleLength.value - length;
                const hasNoBalance = !balanceDistribution.value[currency];
                result[currency] = { currency, length, spacing, offset, hasNoBalance };
                offset -= length + 2 * STROKE_WIDTH; // arc length + line caps + gap
            }
            return result;
        });

        const breakdown = computed(() => currencies.value
            .map((currency) => ({
                currency,
                percentage: `${(balanceDistribution.value[currency] * 100).toFixed(
                    !balanceDistribution.value[currency] || balanceDistribution.value[currency] >= .01 ? 0 : 1)}%`,
                hasNoBalance: !balanceDistribution.value[currency],
            }))
            .sort((recordA, recordB) => {
                // Sort 0 balances to the end.
                if (recordA.hasNoBalance === recordB.hasNoBalance) return 0;
                return recordA.hasNoBalance ? 1 : -1;
            }));

        return {
            STROKE_WIDTH,
            svg$,
            svgSize,
            radius,
            currencyArcs,
            breakdown,
            testFiatBalances, // for testing the component from the browser's dev tools
        };
    },
});
</script>

<style lang="scss" scoped>
.balance-distribution {
    display: flex;
    align-items: center;
    gap: 2rem;
}

svg {
    width: 6.375rem;
    height: 6.375rem;
}

.arc {
    cx: 50%;
    cy: 50%;
    fill: none;
    stroke-linecap: round;

    &.nim {
        stroke: var(--nimiq-gold);
    }
    &.btc {
        stroke: var(--bitcoin-orange);
    }
    &.usdc {
        stroke: var(--usdc-blue);
    }
    &.has-no-balance {
        stroke: rgba(255, 255, 255, .2);
    }
}

.breakdown {
    padding: 0;
    margin: 0;
    min-width: 10.25rem;

    li {
        display: flex;
        justify-content: space-between;
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
        color: white;
        list-style: none;

        &:not(:last-child) {
            margin-bottom: 1rem;
        }

        .currency {
            text-transform: uppercase;
        }
        .percentage {
            margin-left: 1.5rem; // for maintaining a minimum distance to the currency label
            opacity: .5;
        }
        &.has-no-balance * {
            opacity: .3;
        }
    }
}
</style>

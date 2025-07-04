<template>
    <!-- eslint-disable vuejs-accessibility/mouse-events-have-key-events, vue/no-parsing-error -->
    <div class="balance-distribution">
        <transition-group tag="svg" ref="svg$" xmlns="http://www.w3.org/2000/svg"
            :width="SVG_SIZE"
            :height="SVG_SIZE"
            :viewBox="`0 0 ${SVG_SIZE} ${SVG_SIZE}`"
            enter-active-class="arc-enter-active"
            leave-active-class="arc-leave-active"
            @before-enter="onArcBeforeEnter"
            @enter="onArcEnter"
            @leave="onArcLeave">
            <circle v-for="arc in currencyArcs" :key="arc.currency"
                :r="RADIUS"
                :stroke-width="STROKE_WIDTH"
                :stroke-dasharray="`${arc.length} ${arc.spacing}`"
                :stroke-dashoffset="arc.offset"
                class="arc" :class="[arc.currency, { 'inactive': arc.inactive }]"
                :data-currency="arc.currency"
                @mouseenter="highlightedCurrency = !arc.inactive ? arc.currency : null"
                @mouseleave="highlightedCurrency = null"
            />
        </transition-group>
        <transition-group tag="ul" class="breakdown" move-class="breakdown-move">
            <li v-for="record in breakdown" :key="record.currency"
                :class="{ 'inactive': record.inactive }"
                @mouseenter="highlightedCurrency = !record.inactive ? record.currency : null"
                @mouseleave="highlightedCurrency = null">
                <div class="currency">{{ record.currency }}</div>
                <div class="percentage">{{ record.percentage }}</div>
            </li>
        </transition-group>
    </div>
</template>

<script lang="ts">
import Vue, { defineComponent, computed, ref, watch, nextTick } from 'vue';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { useFiatStore } from '../stores/Fiat';
import { useConfig } from '../composables/useConfig';
import { CryptoCurrency } from '../lib/Constants';
import { useAccountSettingsStore } from '../stores/AccountSettings';
import { useStakingStore } from '../stores/Staking';

type SupportedCurrency = CryptoCurrency.NIM | CryptoCurrency.BTC | CryptoCurrency.USDC | CryptoCurrency.USDT;

interface CurrencyArc {
    currency: SupportedCurrency;
    length: number;
    spacing: number;
    offset: number;
    inactive: boolean;
}

export default defineComponent({
    name: 'balance-distribution',
    setup() {
        const { currency: fiatCurrency, exchangeRates } = useFiatStore();
        const { stablecoin } = useAccountSettingsStore();
        const cryptoBalances = computed(() => ({
            [CryptoCurrency.NIM]: (
                useAddressStore().accountBalance.value
                + useStakingStore().totalAccountStake.value
            ) / 1e5,
            [CryptoCurrency.BTC]: useBtcAddressStore().accountBalance.value / 1e8,
            ...(stablecoin.value === CryptoCurrency.USDC ? {
                [CryptoCurrency.USDC]: (
                    usePolygonAddressStore().accountUsdcBalance.value
                    + usePolygonAddressStore().accountUsdcBridgedBalance.value
                ) / 1e6,
            } : {}),
            ...(stablecoin.value === CryptoCurrency.USDT ? {
                [CryptoCurrency.USDT]: usePolygonAddressStore().accountUsdtBridgedBalance.value / 1e6,
            } : {}),
        }));

        const { config } = useConfig();

        const SVG_SIZE = 51; // px
        const STROKE_WIDTH = 4; // px
        const RADIUS = (SVG_SIZE - STROKE_WIDTH) / 2;
        const ARC_GAP = STROKE_WIDTH;

        const svg$ = ref<Vue | null>(null);
        const fullCircleLength = ref(0);
        const highlightedCurrency = ref<SupportedCurrency | null>(null);
        const cachedCurrencyArcs = ref<Partial<Record<SupportedCurrency, CurrencyArc>> | null>(null);

        // Rotate by -90 degree to start at the top. Offset by linecap and half gap to have the gap centered at the top.
        // Note: positive values result in counterclockwise rotation, negative values in clockwise rotation.
        const circleStart = computed(() => fullCircleLength.value / 4 - STROKE_WIDTH / 2 - ARC_GAP / 2);

        watch(svg$, async () => {
            // Update measurements only after the svg has been rendered first, without any arcs, to transition the
            // entry of arcs. Try to measure the actual svg path length if possible because it does not exactly match
            // 2 * PI * r.
            await nextTick();
            fullCircleLength.value = svg$.value?.$el?.querySelector('circle')?.getTotalLength()
                || 2 * Math.PI * RADIUS;
        });

        const currencies = computed<Array<SupportedCurrency>>(() => [
            CryptoCurrency.NIM,
            ...(config.enableBitcoin ? [CryptoCurrency.BTC] as Array<CryptoCurrency.BTC> : []),
            ...(config.polygon.enabled && stablecoin.value === CryptoCurrency.USDC
                ? [CryptoCurrency.USDC] as Array<CryptoCurrency.USDC>
                : []),
            ...(config.polygon.enabled && stablecoin.value === CryptoCurrency.USDT
                ? [CryptoCurrency.USDT] as Array<CryptoCurrency.USDT>
                : []),
        ]);

        // Can be used for testing by manually defining balances either here or in the browser's dev tools.
        const testFiatBalances = ref(null);

        const balanceDistribution = computed(() => {
            const fiatBalances = testFiatBalances.value || currencies.value.reduce((balances, currency) => ({
                ...balances,
                [currency]: cryptoBalances.value[currency]!
                    * (exchangeRates.value[currency]?.[fiatCurrency.value] ?? 0),
            }), {} as Record<SupportedCurrency, number>);

            const totalFiatBalance = currencies.value.reduce((sum, currency) => sum + fiatBalances[currency], 0);

            return currencies.value.reduce((distribution, currency) => ({
                ...distribution,
                [currency]: totalFiatBalance ? fiatBalances[currency] / totalFiatBalance : 0,
            }), {} as Record<SupportedCurrency, number>);
        });

        const currencyArcs = computed(() => {
            if (!fullCircleLength.value) return null; // svg measurements not ready yet

            const nonEmptyCurrencies = currencies.value.filter((currency) => !!balanceDistribution.value[currency]);
            const arcCurrencies = nonEmptyCurrencies.length ? nonEmptyCurrencies : currencies.value;
            const availableLength = arcCurrencies.length !== 1
                // Subtract gaps between each arc and additionally each arc's two line caps of length STROKE_WIDTH / 2
                // each which do not count towards the arc's length. Not counting them towards the length also ensures
                // rendering very small allocations as a dot of at least radius STROKE_WIDTH / 2.
                ? fullCircleLength.value - arcCurrencies.length * (ARC_GAP + STROKE_WIDTH)
                // If there is just a single currency, render it as full circle without gap and line caps.
                : fullCircleLength.value;

            const result: Partial<Record<SupportedCurrency, CurrencyArc>> = {};
            let offset = circleStart.value;
            for (const currency of arcCurrencies) {
                const length = nonEmptyCurrencies.length
                    ? balanceDistribution.value[currency] * availableLength
                    : availableLength / arcCurrencies.length;
                const spacing = fullCircleLength.value - length;
                const inactive = !balanceDistribution.value[currency]
                    || (!!highlightedCurrency.value && highlightedCurrency.value !== currency);
                result[currency] = { currency, length, spacing, offset, inactive };
                offset -= length + STROKE_WIDTH + ARC_GAP; // Advance clockwise by arc length + line caps + gap
            }
            return result;
        });

        watch(currencyArcs, () => cachedCurrencyArcs.value = currencyArcs.value);

        const breakdown = computed(() => currencies.value
            .map((currency) => ({
                currency,
                percentage: balanceDistribution.value[currency]
                    ? `${Math.max(balanceDistribution.value[currency] * 100, /* always display at least 0.1% */ 0.1)
                        .toFixed(/* >=1% after rounding? */ balanceDistribution.value[currency] * 100 >= .95 ? 0 : 1)}%`
                    : '0%',
                inactive: !balanceDistribution.value[currency]
                    || (!!highlightedCurrency.value && highlightedCurrency.value !== currency),
            }))
            .sort(({ currency: currencyA }, { currency: currencyB }) => {
                // Sort 0 balances to the end.
                if (!!balanceDistribution.value[currencyA] === !!balanceDistribution.value[currencyB]) return 0;
                return balanceDistribution.value[currencyA] ? -1 : 1;
            }));

        function onArcBeforeEnter(el: SVGCircleElement) {
            // Use cachedCurrencyArcs because we want to base the transition start position on where the new arc would
            // have sit on the old currencyArcs. cachedCurrencyArcs points to the previous arcs at this point because
            // the watcher updating it runs after this hook.
            const arcOffset = getArcOffset(cachedCurrencyArcs.value, el.dataset.currency as SupportedCurrency);
            // Overwrite attribute styles with el.style which has priority.
            el.style.strokeDasharray = `0 ${fullCircleLength.value}`;
            if (arcOffset !== null) {
                el.style.strokeDashoffset = arcOffset.toString();
            } else {
                // On initial render transition all arcs in from the circle start.
                el.style.strokeDashoffset = circleStart.value.toString();
            }
            el.style.strokeWidth = '0';
        }

        async function onArcEnter(el: SVGCircleElement) {
            await new Promise((resolve) => { window.requestAnimationFrame(resolve); });
            // Remove style overwrites to start the transition.
            el.style.strokeDasharray = '';
            el.style.strokeDashoffset = '';
            el.style.strokeWidth = '';
        }

        function onArcLeave(el: SVGCircleElement) {
            const arcOffset = getArcOffset(currencyArcs.value, el.dataset.currency as SupportedCurrency);
            if (arcOffset === null) return; // This should only happen at most if the svg gets unmounted.
            // Overwrite attribute styles with el.style which has priority, to start the transition.
            el.style.strokeDasharray = `0 ${fullCircleLength.value}`;
            el.style.strokeDashoffset = arcOffset.toString();
            el.style.strokeWidth = '0';
            el.style.opacity = '0.5'; // fade out partially to improve the effect, but use strokeWidth 0 to hide
        }

        function getArcOffset(
            arcs: Partial<Record<SupportedCurrency, CurrencyArc>> | null,
            currency: SupportedCurrency,
        ) {
            if (!arcs) return null;
            if (arcs[currency]) return arcs[currency]!.offset;
            // The requested arc is not listed in arcs and thus empty. Calculate where it would be sitting if not empty.
            let predecessorArc: CurrencyArc | null = null;
            for (const iteratedCurrency of currencies.value) {
                if (iteratedCurrency === currency) break;
                if (!arcs[iteratedCurrency]) continue;
                predecessorArc = arcs[iteratedCurrency]!;
            }
            // Place arc in the center of the gap after the predecessor, or in the center of the gap before the first
            // arc if there is no predecessor. Note: subtracting advances clockwise.
            const gapCenterOffset = ARC_GAP / 2 + /* line cap */ STROKE_WIDTH / 2;
            return predecessorArc
                ? predecessorArc.offset - predecessorArc.length - gapCenterOffset
                : circleStart.value + gapCenterOffset;
        }

        return {
            SVG_SIZE,
            STROKE_WIDTH,
            RADIUS,
            svg$,
            currencyArcs,
            breakdown,
            highlightedCurrency,
            onArcBeforeEnter,
            onArcEnter,
            onArcLeave,
            testFiatBalances, // for testing the component from the browser's dev tools
        };
    },
});
</script>

<style lang="scss" scoped>
.balance-distribution {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

svg {
    .arc {
        --transition-time: 1.5s;
        cx: 50%;
        cy: 50%;
        fill: none;
        stroke-linecap: round;
        // regular transition while arc is shown and resizes or changes color due to distribution changes.
        transition: stroke-dashoffset var(--transition-time) var(--nimiq-ease),
            stroke-dasharray var(--transition-time) var(--nimiq-ease),
            stroke calc(.75 * var(--transition-time)) var(--nimiq-ease);

        // transition for an arc being added
        &.arc-enter-active {
            // Continuously keep the arc via stroke-dashoffset at the correct position without delay, but delay showing
            // the arc via stroke-dasharray and stroke-width until the other arcs started to move to make some space.
            transition: stroke-dashoffset var(--transition-time) var(--nimiq-ease),
                stroke-dasharray calc(.99* var(--transition-time)) calc(.01 * var(--transition-time)) var(--nimiq-ease),
                stroke-width calc(.1 * var(--transition-time)) calc(.03 * var(--transition-time)) var(--nimiq-ease);
        }

        // transition for an arc being removed
        &.arc-leave-active {
            // Continuously keep the arc via stroke-dashoffset at the correct position without delay, but hide the arc
            // a quicker via stroke-dasharray, stroke-width and opacity to make some space for the other arcs.
            transition: stroke-dashoffset var(--transition-time) var(--nimiq-ease),
                stroke-dasharray calc(.95 * var(--transition-time)) var(--nimiq-ease),
                stroke-width calc(.1 * var(--transition-time)) calc(.7 * var(--transition-time)) var(--nimiq-ease),
                opacity calc(.3 * var(--transition-time)) calc(.65 * var(--transition-time)) var(--nimiq-ease);
        }

        &.nim {
            stroke: var(--nimiq-gold);
        }
        &.btc {
            stroke: var(--bitcoin-orange);
        }
        &.usdc {
            stroke: var(--usdc-blue);
        }
        &.usdt {
            stroke: var(--usdt-green);
        }
        &.inactive {
            stroke: rgba(255, 255, 255, .2);
            cursor: default;
        }
    }
}

.breakdown {
    padding: 0;
    margin: 0;
    min-width: 10.75rem;

    li {
        display: flex;
        padding-left: .5rem;
        justify-content: space-between;
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
        color: white;
        list-style: none;
        cursor: default;

        &:not(:first-child) {
            padding-top: .5rem;
        }
        &:not(:last-child) {
            padding-bottom: .5rem;
        }

        // Only transitioning position changes on re-sorting, not enter and leave because breakdown records would only
        // enter or leave when a currency is disabled or enabled in the config.
        // Opacity transition of the children in combination with the move does not always work, because Vue re-creates
        // some elements for some reason instead of just moving them, but the transition still looks good enough.
        &.breakdown-move {
            transition: transform .5s var(--nimiq-ease);
        }

        * {
            transition: opacity .5s var(--nimiq-ease);
        }
        .currency {
            text-transform: uppercase;
        }
        .percentage {
            margin-left: 1.5rem; // for maintaining a minimum distance to the currency label
            opacity: .5;
        }

        &.inactive {
            cursor: default;

            * {
                opacity: .3;
            }
        }
    }
}
</style>

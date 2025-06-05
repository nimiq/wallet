<template>
    <div class="price-chart flex-column">
        <svg ref="svg$" xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" preserveAspectRatio="none"
            :style="{ opacity: history.length >= 2 ? 1 : 0 }">
            <path ref="path$"
                :d="path"
                fill="none"
                stroke="currentColor"
                opacity="0.5"
                :stroke-width="strokeWidth"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>

        <button v-if="showTimespanLabel" class="reset timespan" @click="$emit('timespan')">{{ timeRange }}</button>

        <div class="meta flex-row">
            <strong>{{currency.toUpperCase()}}</strong>
            <div class="price">
                <transition name="fade">
                    <FiatAmount v-if="currentPrice !== undefined"
                        :amount="currentPrice"
                        :currency="fiatCurrency"
                        :maxRelativeDeviation="0.001"
                    />
                </transition>
                <transition name="fade">
                    <div v-if="priceChange !== undefined" class="change" :class="priceChangeClass">
                        {{ (priceChange * 100).toFixed(1) }}%
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { FiatAmount } from '@nimiq/vue-components';
import { Provider, getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { CryptoCurrency, FiatCurrency, FIAT_API_PROVIDER_PRICE_CHART } from '../lib/Constants';
import { useFiatStore } from '../stores/Fiat';

export enum TimeRange {
    '24h' = '24h',
    '7d' = '7d',
}

export default defineComponent({
    props: {
        currency: {
            type: String as () => CryptoCurrency,
            required: true,
            validator: (currency: any) => Object.values(CryptoCurrency).includes(currency),
        },
        showTimespanLabel: {
            type: Boolean,
            default: true,
        },
        timeRange: {
            type: String as () => TimeRange,
            required: false,
            default: TimeRange['24h'],
            validator: (range: any) => Object.values(TimeRange).includes(range),
        },
    },
    setup(props) {
        const svg$ = ref<SVGElement>(null);
        const path$ = ref<SVGPathElement>(null);
        const histories = ref<Record<TimeRange, Array<[/* timestamp */ number, /* price */ number]> | undefined>>({
            [TimeRange['24h']]: undefined,
            [TimeRange['7d']]: undefined,
        });
        // The timestamps at which the latest requested time ranges begin. This refers to the latest requested histories
        // which might still be pending, and are thus not necessarily the already retrieved histories cached in variable
        // histories.
        const historiesLatestRequestedStartTimes: Record<TimeRange, number> = {
            [TimeRange['24h']]: -1,
            [TimeRange['7d']]: -1,
        };
        const history = computed(() => histories.value[props.timeRange] || []);

        // Calculate SVG size
        const strokeWidth = 2.5;
        const padding = strokeWidth * 2;
        const width = ref<number>(120);
        const height = ref<number>(52);
        // Calculate the view box from the actual size in the dom to avoid stretching the strokeWidth. While
        // vector-effect: non-scaling-stroke exists for this purpose, it unfortunately also affects the rendered path
        // length, which leads to render errors when assigning a stroke-dashoffset calculated from getTotalLength() or
        // even explicitly specified pathLength.
        const viewBox = computed(
            () => `-${strokeWidth / 2} -${padding} ${width.value + strokeWidth} ${height.value + 2 * padding}`,
        );
        const onResize = () => requestAnimationFrame(() => {
            if (!svg$.value) return;
            const svgBoundingBox = svg$.value.getBoundingClientRect();
            width.value = svgBoundingBox.width;
            height.value = svgBoundingBox.height;
        });
        onMounted(() => {
            window.addEventListener('resize', onResize);
            onResize();
        });
        onUnmounted(() => window.removeEventListener('resize', onResize));

        const { exchangeRates, currency: fiatCurrency, timestamp: lastExchangeRateUpdateTime } = useFiatStore();
        const historyFiatCurrency = computed(() => isHistorySupportedFiatCurrency(
            fiatCurrency.value,
            FIAT_API_PROVIDER_PRICE_CHART,
        ) ? fiatCurrency.value : FiatCurrency.USD);

        // Calculate price change
        const currentPrice = computed(() => exchangeRates.value[props.currency]?.[fiatCurrency.value]);
        const priceChange = computed(() => {
            const startPrice = history.value[0]?.[1];
            // We do not use currentPrice as endPrice as they can be based on different fiat currencies, for example for
            // currencies for which our FiatApi does not support historic rates, or when the history request has not
            // terminated yet after switching the currency, while the current exchange rate is typically already
            // available for all currencies.
            const endPrice = history.value[history.value.length - 1]?.[1];
            return startPrice && endPrice ? (endPrice - startPrice) / startPrice : undefined;
        });
        const priceChangeClass = computed(() => !priceChange.value
            ? 'none'
            : priceChange.value > 0
                ? 'positive'
                : 'negative');

        // Calculate path
        const path = computed(() => {
            if (history.value.length < 2) return '';

            // Normalize data points to the SVG's X and Y axis
            const minTimestamp = history.value[0][0];
            const maxTimestamp = history.value[history.value.length - 1][0];
            const xScaleFactor = width.value / (maxTimestamp - minTimestamp);
            const [minPrice, maxPrice] = history.value.reduce((result, [, price]) => {
                // Could be written as one-liner by destructuring + constructing of new array but is more wasteful
                result[0] = Math.min(result[0], price);
                result[1] = Math.max(result[1], price);
                return result;
            }, [Number.MAX_VALUE, Number.MIN_VALUE]);
            const yScaleFactor = height.value / (maxPrice - minPrice || 1);

            const dataPoints = history.value.map(([timestamp, price]) => [
                (timestamp - minTimestamp) * xScaleFactor,
                height.value - (price - minPrice) * yScaleFactor, // subtract from height as in SVG y-axis 0 is on top
            ]);

            // Draw

            // how smooth the resulting curve will be.
            const smoothingFactor = .2;

            const lineFromIndexToIndex = (startIndex: number, endIndex: number) => {
                if (startIndex >= 0 && endIndex >= 0
                    && startIndex < dataPoints.length && endIndex < dataPoints.length) {
                    const x = dataPoints[startIndex][0] - dataPoints[endIndex][0];
                    const y = dataPoints[startIndex][1] - dataPoints[endIndex][1];

                    return {
                        length: Math.sqrt(x ** 2 + y ** 2),
                        angle: Math.atan2(y, x),
                    };
                }
                throw new Error(`Index out of bounds ${startIndex} ${endIndex}`);
            };

            const controlPoint = (
                current: number,
                previous: number,
                next: number,
                end = false,
            ): {x: number, y: number} => {
                if (previous < 0) previous = current;
                if (next >= dataPoints.length) next = current;

                const line = lineFromIndexToIndex(previous, next);

                return {
                    x: dataPoints[current][0]
                        - Math.cos(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
                    y: dataPoints[current][1]
                        - Math.sin(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
                };
            };

            return `${dataPoints.map(([x, y], index) => {
                if (index === 0) return `M 0 ${y}`;
                const { x: x1, y: y1 } = controlPoint(index - 1, index - 2, index);
                const { x: x2, y: y2 } = controlPoint(index, index - 1, index + 1, true);
                return 'C '
                    + `${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`;
            }).join(' ')}`;
        });

        let animateGraph = false;

        // Update history
        watch(() => [
            props.currency,
            historyFiatCurrency.value,
            props.timeRange,
            // Update together with Fiat store exchange rate updates triggered from main.ts or by currency changes via
            // setCurrency from Settings.
            lastExchangeRateUpdateTime.value,
        ] as const, async ([cryptoCurrency, chartFiatCurrency, timeRange, lastUpdate], previousValues) => {
            const [
                previousCryptoCurrency,
                previousChartFiatCurrency,
                previousTimeRange,
                previousLastUpdate,
            ] = previousValues || [cryptoCurrency, chartFiatCurrency, timeRange, lastUpdate];
            const isCurrenciesUpdate = cryptoCurrency !== previousCryptoCurrency
                || chartFiatCurrency !== previousChartFiatCurrency;
            const isTimeRangeUpdate = timeRange !== previousTimeRange;
            const isChartParametersUpdate = isCurrenciesUpdate || isTimeRangeUpdate;
            const isScheduledUpdate = lastUpdate !== previousLastUpdate;

            animateGraph ||= isChartParametersUpdate; // Animate / re-draw the chart if chart parameters changed.
            // Clear cached histories, which also clears the chart, on chart parameters update other than only a time
            // range change, in which case we want to keep the cache for the other time range. Note that the condition
            // is not as concise as it could be, but maybe it's better readable like this.
            if (isChartParametersUpdate && isCurrenciesUpdate) {
                for (const range of Object.values(TimeRange)) {
                    histories.value[range] = undefined;
                    historiesLatestRequestedStartTimes[range] = -1;
                }
            }

            const TWO_MINUTES = 2 * 60 * 1000;
            const timeRangeHours = {
                [TimeRange['24h']]: 24,
                [TimeRange['7d']]: 7 * 24,
            }[timeRange];
            const timespan = timeRangeHours * 60 * 60 * 1000; // Milliseconds
            // Request chart data from even 2-minute marks. This allows skipping updates falling into the same 2-minute
            // window, and API response caching by the Coingecko proxy, if used, see FIAT_API_PROVIDER_PRICE_CHART and
            // setCoinGeckoApiUrl.
            const last2MinuteMark = Math.floor(Date.now() / TWO_MINUTES) * TWO_MINUTES;
            const start = last2MinuteMark - timespan;
            // Check whether the exact same history time range from the same start time was already requested previously
            // and does not need to be processed again. Such duplication of requests can for example happen due to the
            // fact that a change of the Wallet's fiat currency in the fiat store triggers an exchange rate update,
            // which eventually triggers an additional invocation of this watcher via the lastExchangeRateUpdateTime.
            // Similarly, regular exchange rate updates scheduled in main.ts soon after switching the fiat currency
            // result in double invocations, too.
            if (historiesLatestRequestedStartTimes[timeRange] === start) return;
            historiesLatestRequestedStartTimes[timeRange] = start;

            const timestamps: number[] = [];
            const sampleCount = 18; // 18 is the number of points determined to look good
            const timestep = timespan / (sampleCount - 1);
            for (let i = 0; i < sampleCount; ++i) {
                timestamps.push(start + i * timestep);
            }
            const historicRates = await getHistoricExchangeRates.apply(null, [
                cryptoCurrency,
                chartFiatCurrency,
                timestamps,
                FIAT_API_PROVIDER_PRICE_CHART,
                // @ts-expect-error provider check on purpose as we might want to change it in the future
                ...(FIAT_API_PROVIDER_PRICE_CHART === Provider.CoinGecko
                    ? [{ disableMinutelyData: true }] as const
                    : [] as const
                ),
            ]);

            // Discard fetched chart data, if the parameters changed from the ones we requested the update for, while we
            // were fetching the update. If only the time range changed, don't discard the data but add it to the cache
            // for the previous range.
            if (cryptoCurrency !== props.currency || chartFiatCurrency !== historyFiatCurrency.value) return;
            histories.value[timeRange] = [...historicRates.entries()]
                .filter((e): e is [(typeof e)[0], Exclude<(typeof e)[1], undefined>] => e[1] !== undefined);

            // Clear outdated data of other time ranges. We do this only after the new rates were fetched, to still
            // enable switching the chart to other time ranges with cached data, while the update has not finished yet,
            // for example due to waiting on rate limits.
            if (isScheduledUpdate) {
                for (const range of Object.values(TimeRange)) {
                    if (range === timeRange || range === props.timeRange) continue;
                    histories.value[range] = undefined;
                    // Don't clear historiesLatestRequestedStartTimes[range] on a scheduled update, because it encodes
                    // time information itself and is specifically used for determining whether initiated requests are
                    // outdated.
                }
            }
        });

        watch(history, async () => {
            if (!path$.value) return;
            if (!animateGraph) return;
            // animate the chart line
            if (history.value.length) {
                // Reset strokeDashArray
                path$.value.style.strokeDasharray = '';
                // strokeDasharray reset gets applied
                await new Promise((resolve) => { requestAnimationFrame(resolve); });
                const pathLength = path$.value.getTotalLength();
                path$.value.style.strokeDasharray = `0 ${pathLength}`;
                // strokeDasharray gets applied
                await new Promise((resolve) => { requestAnimationFrame(resolve); });
                // ready to update strokeDasharray again
                await new Promise((resolve) => { requestAnimationFrame(resolve); });
                path$.value.style.strokeDasharray = `${pathLength} 0`;
                animateGraph = false;
            } else {
                path$.value.style.strokeDasharray = '';
            }
        });

        return {
            svg$,
            path$,
            strokeWidth,
            viewBox,
            path,
            fiatCurrency,
            currentPrice,
            history,
            priceChange,
            priceChangeClass,
        };
    },
    components: {
        FiatAmount,
    },
});
</script>

<style lang="scss" scoped>
.price-chart {
    position: relative;
}

svg {
    flex-grow: 1;
    transition: opacity .3s var(--nimiq-ease);
}

svg path {
    transition: stroke-dasharray 1.2s linear;
}

.timespan {
    position: absolute;
    left: 0;
    top: 0;
    text-transform: uppercase;
    background: rgb(109, 112, 135); // A background of rgba(255, 255, 255, 0.35) on Nimiq Blue
    border: 0.25rem solid var(--bg-secondary);
    margin: -0.25rem;
    border-radius: calc(0.25rem + 0.25rem); // border-width + effective border-radius of the label
    padding: 0.375rem; // 3px
    font-size: var(--tiny-label-size); // 11px
    line-height: 1;
    font-weight: bold;
    color: var(--bg-secondary);
    letter-spacing: 0.055em;
}

.meta {
    min-height: 4.5rem; // to avoid jumping of UI when children are hidden via v-if
    justify-content: space-between;
    color: rgba(255, 255, 255, 0.6);
    font-size: var(--small-size);
    margin-top: 1rem;
}

.price {
    text-align: right;
}

.change {
    font-weight: bold;
}

.change.positive {
    color: var(--nimiq-green);
}

.change.positive::before {
    content: '+';
}
</style>

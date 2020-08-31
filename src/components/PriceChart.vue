<template>
    <div class="price-chart flex-column">
        <svg ref="$svg" xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" preserveAspectRatio="none"
            :style="{ opacity: history.length >= 2 ? 1 : 0 }">
            <path ref="$path"
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
import { defineComponent, computed, ref, watch, onMounted, onUnmounted } from '@vue/composition-api';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { FiatAmount } from '@nimiq/vue-components';
import { CryptoCurrency } from '../lib/Constants';
import { useFiatStore } from '../stores/Fiat';

export enum TimeRange {
    '24h' = '24h',
    '7d' = '7d',
}

export default defineComponent({
    props: {
        currency: {
            type: String,
            required: true,
            validator: (currency) => Object.values(CryptoCurrency).includes(currency),
        },
        showTimespanLabel: {
            type: Boolean,
            default: true,
        },
        timeRange: {
            type: String,
            required: false,
            default: TimeRange['24h'],
            validator: (range) => Object.values(TimeRange).includes(range),
        },
    },
    // @ts-ignore (The "validator" for the currency prop throws off the automatic prop typing)
    setup(props) {
        const $svg = ref<SVGElement|null>(null);
        const $path = ref<SVGPathElement|null>(null);
        const history = ref<Array<[/* timestamp */number, /* price */number]>>([]);

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
            if (!$svg.value) return;
            const svgBoundingBox = $svg.value.getBoundingClientRect();
            width.value = svgBoundingBox.width;
            height.value = svgBoundingBox.height;
        });
        onMounted(() => {
            window.addEventListener('resize', onResize);
            onResize();
        });
        onUnmounted(() => window.removeEventListener('resize', onResize));

        const { exchangeRates, currency: fiatCurrency, timestamp: lastExchangeRateUpdateTime } = useFiatStore();

        // Calculate price change
        const startPrice = computed(() => history.value[0]?.[1]);
        const currentPrice = computed(() => exchangeRates.value[props.currency]?.[fiatCurrency.value]);
        const priceChange = computed(() => (currentPrice.value && startPrice.value)
            ? (currentPrice.value - startPrice.value) / startPrice.value
            : undefined);
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

        watch(() => [
            props.currency,
            props.timeRange,
            fiatCurrency.value,
            lastExchangeRateUpdateTime.value, // Update together with main exchange rate
        ], ([cryptoCurrency, timeRange, fiatCode], oldValues?: any[]) => {
            const oldTimeRange = oldValues ? oldValues[1] : props.timeRange;

            const timeRangeHours = timeRange === TimeRange['24h']
                ? 24
                : 7 * 24; // 7d
            const timespan = timeRangeHours * 60 * 60 * 1000; // Milliseconds
            const sampleCount = 18; // 18 is the number of points determined to look good
            const timestep = timespan / (sampleCount - 1);
            const start = Date.now() - timespan;
            const timestamps: number[] = [];
            for (let i = 0; i < sampleCount; ++i) {
                timestamps.push(start + i * timestep);
            }

            if (oldTimeRange !== timeRange) {
                // Clear chart when switching time range
                history.value = [];
            }

            // eslint-disable-next-line no-console
            console.debug(`Updating historic exchange rates for ${cryptoCurrency.toUpperCase()}`);

            getHistoricExchangeRates(
                cryptoCurrency,
                fiatCode,
                timestamps,
                true, // disable minutely data
            ).then(
                // TODO: Replace last rate with the current price from the FiatStore?
                //       The historic rates latest timestamp can be up to 10 minutes old.
                (historicRates) => history.value = [...historicRates.entries()] as Array<[number, number]>,
            );
        });

        watch(async () => {
            if (!$path.value) return;
            // animate the chart line
            if (history.value.length) {
                const pathLength = $path.value.getTotalLength();
                $path.value.style.strokeDasharray = `0 ${pathLength}`;
                await new Promise((resolve) => requestAnimationFrame(resolve)); // strokeDasharray gets applied
                await new Promise((resolve) => requestAnimationFrame(resolve)); // ready to update strokeDasharray again
                $path.value.style.strokeDasharray = `${pathLength} 0`;
            } else {
                $path.value.style.strokeDasharray = '';
            }
        });

        return {
            $svg,
            $path,
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
    transition: stroke-dasharray 1.5s linear;
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

.change.negative {
    color: var(--nimiq-red);
}
</style>

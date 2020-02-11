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

        <div class="meta flex-row">
            <strong>{{currency.toUpperCase()}}</strong>
            <div class="price">
                <transition name="fade">
                    <!-- TODO: Adapt FiatAmount for this use case and use it here -->
                    <!-- FiatAmount cannot display more than 2 decimals, which is necessary for NIM. -->
                    <!-- <FiatAmount :amount="endPrice" :currency="fiatCurrency"/> -->
                    <div v-if="displayPrice !== undefined">{{ displayPrice }} {{ fiatSymbol }}</div>
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
import { createComponent, computed, ref, watch, onMounted, onUnmounted } from '@vue/composition-api';
import { CurrencyInfo, getHistoricExchangeRates } from '@nimiq/utils';
// import { FiatAmount } from '@nimiq/vue-components';
import { CryptoCurrency } from '../lib/Constants';
import { useFiatStore } from '../stores/Fiat';

function roundToSignificant(number: number, places = 1) {
  const roundingFactor = number < 0.001
    ? 10 ** (3 + places)
    : number < 0.01
        ? 10 ** (2 + places)
        : number < 0.1
            ? 10 ** (1 + places)
            : number < 10
                ? 10 ** (places)
                : 10 ** (places - 1);

    return Math.round(number * roundingFactor) / roundingFactor;
}

export default createComponent({
    name: 'price-chart',
    props: {
        currency: {
            type: String,
            required: true,
            validator: (currency) => Object.values(CryptoCurrency).includes(currency),
        },
    },
    setup(props: any) {
        const $svg = ref<SVGElement|null>(null);
        const $path = ref<SVGPathElement|null>(null);
        const history = ref<Array<[/*timestamp*/number, /*price*/number]>>([]);

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

        // Calculate price change
        const startPrice = computed(() => history.value[0]?.[1]);
        const endPrice = computed(() => history.value[history.value.length - 1]?.[1]);
        const priceChange = computed(() => endPrice.value !== undefined && startPrice.value !== undefined
            ? (endPrice.value - startPrice.value) / startPrice.value
            : undefined);
        const priceChangeClass = computed(() => priceChange.value === undefined
            ? 'none'
            : priceChange.value > 0
                ? 'positive'
                : priceChange.value < 0
                    ? 'negative'
                    : 'none');
        const displayPrice = computed(() => endPrice.value && roundToSignificant(endPrice.value, 3));

        // Calculate path
        const path = computed(() => {
            if (history.value.length < 2) return '';

            // Normalize data points to the SVG's X and Y axis
            const minTimestamp = history.value[0][0];
            const maxTimestamp = history.value[history.value.length - 1][0];
            const xScaleFactor = width.value / (maxTimestamp - minTimestamp);
            const [minPrice, maxPrice] = history.value.reduce((result, [timestamp, price]) => {
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
            }

            const controlPoint = (
                current: number,
                previous: number,
                next: number,
                end: boolean = false,
            ): {x: number, y: number}=> {
                if (previous < 0) previous = current;
                if (next >= dataPoints.length) next = current;

                const line = lineFromIndexToIndex(previous, next);

                return {
                    x: dataPoints[current][0]
                        - Math.cos(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
                    y: dataPoints[current][1]
                        - Math.sin(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
                };
            }

            return `${dataPoints.map(([x, y], index) => {
                if (index === 0) return `M 0 ${y}`;
                const {x: x1, y: y1} = controlPoint(index - 1, index - 2, index);
                const {x: x2, y: y2} = controlPoint(index, index - 1, index + 1, true);
                return `C `
                    + `${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`;
            }).join(' ')}`;
        })

        const fiatStore = useFiatStore();
        const fiatSymbol = computed(() => new CurrencyInfo(fiatStore.currency.value).symbol);

        watch(() => [props.currency, fiatStore.currency.value], ([cryptoCurrency, fiatCurrency]) => {
            const timespan = 7 * 24 * 60 * 60 * 1000; // one week
            const sampleCount = 18;
            const timestep = timespan / (sampleCount - 1);
            const start = Date.now() - timespan;
            const timestamps: number[] = [];
            for (let i = 0; i < sampleCount; ++i) {
                timestamps.push(start + i * timestep)
            }

            // Reset old data.
            history.value = [];

            getHistoricExchangeRates(
                cryptoCurrency,
                fiatCurrency,
                timestamps,
                true, // disable minutely data
            ).then(
                (exchangeRates) => history.value = [...exchangeRates.entries()] as Array<[number, number]>,
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
            displayPrice,
            fiatSymbol,
            history,
            priceChange,
            priceChangeClass,
        }
    },
    components: {
        // FiatAmount,
    },
});
</script>

<style lang="scss" scoped>
svg {
    flex-grow: 1;
    transition: opacity .3s var(--nimiq-ease);
}

svg path {
    transition: stroke-dasharray 1.5s linear;
}

.meta {
    min-height: 4.5rem; // to avoid jumping of UI when children are hidden via v-if
    justify-content: space-between;
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.75rem;
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

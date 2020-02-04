<template>
    <div class="price-chart flex-column">
        <svg xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" preserveAspectRatio="none">
            <path
                :d="`${path}`"
                fill="none"
                stroke="currentColor"
                opacity="0.5"
                :stroke-width="strokeWidth"
                stroke-linecap="round"
                stroke-linejoin="round" />
        </svg>

        <div class="meta flex-row">
            <strong>{{currency.toUpperCase()}}</strong>
            <div class="price">
                <!-- FiatAmount cannot display more than 2 decimals, which is necessary for NIM. -->
                <!-- <FiatAmount :amount="endPrice" :currency="fiatCurrency"/> -->
                <div>{{ endPrice }} {{ fiatSymbol }}</div>
                <div class="change" :class="priceChangeClass">{{ (priceChange * 100).toFixed(1) }}%</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, reactive, ref, computed } from '@vue/composition-api';
// import { FiatAmount } from '@nimiq/vue-components';
import { useFiatStore } from '../stores/Fiat';
import { FIAT_SYMBOLS } from '../lib/Constants';

export default createComponent({
    name: 'price-chart',
    props: {
        currency: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const { state: fiat$ } = useFiatStore();

        // FIXME: Get live data
        const priceHistories = reactive<{[currency: string]: number[]}>({
            'nim': [/*0.000402, 0.000418, 0.000454, */0.000465, 0.000464, 0.000509, 0.000573, 0.000572, 0.000570, 0.000570
],
            'btc': [/*8367.85, 8596.83, 8909.82, */9358.59, 9316.63, 9508.99, 9350.53, 9392.88, 9344.37, 9293.52],
        });
        const prices = computed(() => priceHistories[props.currency]);

        // Calculate price change
        const startPrice = computed(() => prices.value[0]);
        const endPrice = computed(() => prices.value[prices.value.length - 1]);
        const priceChange = computed(() => (endPrice.value - startPrice.value) / startPrice.value);
        const priceChangeClass = computed(() => priceChange.value > 0
            ? 'positive'
            : priceChange.value < 0
                ? 'negative'
                : 'none');

        // Calculate SVG size
        const strokeWidth = 2;
        const padding = strokeWidth * 2;
        const width = 100; // Only used for calculcations, has no effect on display.
        const height = 50; // Only used for calculcations, has no effect on display.
        const viewBox = `-${strokeWidth / 2} -${padding} ${width + strokeWidth} ${height + 2 * padding}`;

        // Calculate path
        const path = computed(() => {
            // Normalize data points to the SVG's Y axis
            const min = Math.min.apply(Math, prices.value as number[]);
            const max = Math.max.apply(Math, prices.value as number[]);
            const spread = max - min;
            const scale = height / spread;

            const normalizedSeries = prices.value.map(value => (value - min) * scale);

            // Invert values (SVG coordinate system has 0 on top)
            const invertedSeries = normalizedSeries.map(value => -value + height);

            // Draw
            // TODO: Apply bezier curves to make the path smoother
            const stepWidth = width / (prices.value.length - 1);

            const lineFromIndexToIndex = (startIndex: number, endIndex: number) => {
                if (startIndex >= 0 && endIndex >= 0
                    && startIndex < invertedSeries.length && endIndex < invertedSeries.length) {
                    const y = invertedSeries[startIndex] - invertedSeries[endIndex];
                    const x = (endIndex - startIndex) * stepWidth;

                    return {
                        length: Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
                        angle: Math.atan2(y, x),
                    };
                }
                throw new Error(`Index out of bounds ${startIndex} ${endIndex}`);
            }

            const smoothingFactor = .2;

            const controlPoint = (current: number, previous: number, next: number, end: boolean = false): {x: number, y: number}=> {
                if (previous < 0) previous = current;
                if (next >= invertedSeries.length) next = current;

                const line = lineFromIndexToIndex(previous, next);

                return {
                    x: current * stepWidth + Math.cos(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
                    y: invertedSeries[current] - Math.sin(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
                };
            }

            return `M 0 ${invertedSeries[0]} ${invertedSeries.map((value, index) => {
                if (index === 0) return `M 0 ${invertedSeries[0]}`;
                const {x: x1, y: y1} = controlPoint(index - 1, index - 2, index);
                const {x: x2, y: y2} = controlPoint(index, index - 1, index + 1, true);
                return `C `
                    + `${x1} ${y1}, ${x2} ${y2}, ${index * stepWidth} ${value}`;
            }).join(' ')}`;
        })

        return {
            strokeWidth,
            viewBox,
            path,
            endPrice,
            fiatSymbol: FIAT_SYMBOLS[fiat$.currency],
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
}

svg * {
    /* Required to be able to scale the SVG dynamically without having to change the viewBox. */
    vector-effect: non-scaling-stroke;
}

.meta {
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

.change.negative::before {
    // content: '-'; /* The number is negative and thus already has a minus sign. */
}
</style>

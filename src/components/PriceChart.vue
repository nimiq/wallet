<template>
    <div v-if="history && history.length" class="price-chart flex-column">
        <svg xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" preserveAspectRatio="none">
            <path
                :d="path"
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
                <!-- TODO: Adapt FiatAmount for this use case and use it here -->
                <!-- FiatAmount cannot display more than 2 decimals, which is necessary for NIM. -->
                <!-- <FiatAmount :amount="endPrice" :currency="fiatCurrency"/> -->
                <div>{{ endPrice.toFixed(4) }} {{ fiatSymbol }}</div>
                <div class="change" :class="priceChangeClass">{{ (priceChange * 100).toFixed(1) }}%</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, reactive, computed } from '@vue/composition-api';
import { CurrencyInfo, getHistoricExchangeRatesByRange } from '@nimiq/utils';
// import { FiatAmount } from '@nimiq/vue-components';
import { CryptoCurrency } from '../lib/Constants';
import { useFiatStore } from '../stores/Fiat';

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
        const priceHistories = reactive<{[currency: string]: Array<[/*timestamp*/number, /*price*/number]>}>(
            Object.values(CryptoCurrency).reduce((history, currency) => ({ ...history, [currency]: [] }), {}),
        );
        const history = computed(() => priceHistories[props.currency]);

        // Calculate price change
        const startPrice = computed(() => history.value?.[0]?.[1]);
        const endPrice = computed(() => history.value?.[history.value.length - 1]?.[1]);
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

        // Calculate SVG size
        const strokeWidth = 2;
        const padding = strokeWidth * 2;
        const width = 100; // Only used for calculcations, has no effect on display.
        const height = 50; // Only used for calculcations, has no effect on display.
        const viewBox = `-${strokeWidth / 2} -${padding} ${width + strokeWidth} ${height + 2 * padding}`;

        // Calculate path
        const path = computed(() => {
            if (!history.value || history.value.length < 2) return '';

            // Normalize data points to the SVG's X and Y axis
            const minTimestamp = history.value[0][0];
            const maxTimestamp = history.value[history.value.length - 1][0];
            const xScaleFactor = width / (maxTimestamp - minTimestamp);
            const [minPrice, maxPrice] = history.value.reduce((result, [timestamp, price]) => {
                // Could be written as one-liner by destructuring + constructing of new array but is more wasteful
                result[0] = Math.min(result[0], price);
                result[1] = Math.max(result[1], price);
                return result;
            }, [Number.MAX_VALUE, Number.MIN_VALUE]);
            const yScaleFactor = height / (maxPrice - minPrice || 1);

            const dataPoints = history.value.map(([timestamp, price]) => [
                (timestamp - minTimestamp) * xScaleFactor,
                height - (price - minPrice) * yScaleFactor, // subtracted from height as in SVG 0 on y-axis is on top
            ]);

            // Draw
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

            const smoothingFactor = .2;

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
                        + Math.cos(line.angle + (end ? Math.PI : 0)) * line.length * smoothingFactor,
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

        // TODO has to react to fiat or crypto currency change
        const now = Date.now();
        getHistoricExchangeRatesByRange(
            props.currency as CryptoCurrency,
            fiatStore.currency.value,
            now - 7 * 24 * 60 * 60 * 1000, // one week before
            now,
        ).then(
            (history) => priceHistories[props.currency] = history,
        );

        return {
            strokeWidth,
            viewBox,
            path,
            endPrice,
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

<template>
    <div class="price-chart flex-column">
        <svg xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" preserveAspectRatio="none">
            <path
                :d="`M ${path}`"
                fill="none"
                stroke="white"
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
import { useFiatStore, SYMBOLS } from '../stores/Fiat';

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
            'nim': [0.000402, 0.000418, 0.000454, 0.000465, 0.000464, 0.000509, 0.000573],
            'btc': [8367.85, 8596.83, 8909.82, 9358.59, 9316.63, 9508.99, 9350.53],
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
        const padding = strokeWidth / 2;
        const width = 100; // Only used for calculcations, has no effect on display.
        const height = 50; // Only used for calculcations, has no effect on display.
        const viewBox = `-${padding} -${padding} ${width + 2 * padding} ${height + 2 * padding}`;

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
            return invertedSeries.map((value, index) => `${index * stepWidth},${value}`).join(' ');
        })

        return {
            strokeWidth,
            viewBox,
            path,
            endPrice,
            fiatSymbol: SYMBOLS[fiat$.currency],
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
    content: '-';
}
</style>

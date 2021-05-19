<template>
    <canvas
        :width="styles.width"
        :height="styles.height"
        aria-label="NIMIQ Graph"
        role="img"
        ref="chartRef"
    />
</template>
<script>
import { ref, onMounted, defineComponent } from '@vue/composition-api';
import {
    Chart,
    // ArcElement,
    LineElement,
    // BarElement,
    PointElement,
    // BarController,
    // BubbleController,
    // DoughnutController,
    LineController,
    // PieController,
    // PolarAreaController,
    // RadarController,
    // ScatterController,
    CategoryScale,
    LinearScale,
    // LogarithmicScale,
    // RadialLinearScale,
    TimeScale,
    TimeSeriesScale,
    Decimation,
    Filler,
    Legend,
    Title,
    Tooltip,
} from 'chart.js';
import 'chartjs-adapter-luxon';

import StakingGraphGridPlugin from '../plugins/StakingGraphGridPlugin';
import StakingGraphPointsPlugin from '../plugins/StakingGraphPointsPlugin';
import { chartJsEventNames, generateEventObject, generateChartJsEventListener } from './includes';

Chart.register(
    // ArcElement,
    LineElement,
    // BarElement,
    PointElement,
    // BarController,
    // BubbleController,
    // DoughnutController,
    LineController,
    // PieController,
    // PolarAreaController,
    // RadarController,
    // ScatterController,
    CategoryScale,
    LinearScale,
    // LogarithmicScale,
    // RadialLinearScale,
    TimeScale,
    TimeSeriesScale,
    Decimation,
    Filler,
    Legend,
    Title,
    Tooltip,
    // StakingGraphGridPlugin,
    StakingGraphPointsPlugin,
);

Chart.defaults.font.family = 'Muli, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.font.weight = '700';
Chart.defaults.font.color = 'rgba(166, 167, 182, 1.0)';

const Vue3ChartJs = defineComponent({
    name: 'Vue3ChartJs',
    props: {
        type: {
            type: String,
            required: true,
        },
        data: {
            type: Object,
            required: true,
        },
        options: {
            type: Object,
            default: () => ({}),
        },
        plugins: {
            type: Array,
            default: () => [],
        },
        chartStyles: {
            type: Object,
            required: false,
            default: () => ({
                width: '129rem',
                height: '35.5rem',
            }),
        },
    },
    emits: chartJsEventNames,
    setup(props, { emit }) {
        const chartRef = ref(null);

        // generate chart.js plugin to emit lib events
        const chartJsEventsPlugin = chartJsEventNames
            .reduce((reduced, eventType) => {
                const event = generateEventObject(eventType, chartRef);
                return { ...reduced, ...generateChartJsEventListener(emit, event) };
            }, { id: 'Vue3ChartJsEventHookPlugin' });

        const chartJSState = {
            chart: null,
            plugins: [
                chartJsEventsPlugin,
                ...props.plugins,
            ],
            props: { ...props },
        };

        const destroy = () => {
            if (chartJSState.chart) {
                chartJSState.chart.destroy();
                chartJSState.chart = null;
            }
        };

        const update = (animateSpeed = 750) => {
            chartJSState.chart.data = { ...chartJSState.chart.data, ...chartJSState.props.data };
            chartJSState.chart.options = { ...chartJSState.chart.options, ...chartJSState.props.options };
            chartJSState.chart.update(animateSpeed);
        };

        const resize = () => chartJSState.chart && chartJSState.chart.resize();

        const render = () => {
            if (chartJSState.chart) {
                return chartJSState.chart.update();
            }

            return chartJSState.chart = new Chart(
                chartRef.value.getContext('2d'), {
                    type: chartJSState.props.type,
                    data: chartJSState.props.data,
                    options: chartJSState.props.options,
                    plugins: chartJSState.plugins,
                },
            );
        };
        onMounted(() => render());

        return {
            chartJSState,
            chartRef,
            render,
            resize,
            update,
            destroy,
            styles: props.chartStyles,
        };
    },
});

Vue3ChartJs.install = (app) => {
    app.component(Vue3ChartJs.name, Vue3ChartJs);
};

export default Vue3ChartJs;

</script>

<template>
    <div class="chart-container">
        <Vue3ChartJs
            :id="chartData.id"
            ref="chartRef"
            :type="chartData.type"
            :data="chartData.data"
            :options="chartData.options" />
    </div>
</template>

<script>
import { defineComponent, ref } from '@vue/composition-api';
import { NIM_MAGNITUDE } from '../../../lib/Constants';
import { i18n } from '../../../i18n/i18n-setup';
import Vue3ChartJs from './lib/Vue3ChartJs.vue';

const getProjectionLine = (apy, staked, steps, stepSize) => {
    const projection = [];
    const apm = (apy / 12.0) / 100.0;

    for (let i = 0; i < steps; i++) {
        projection.push(staked * (1.0 + (apm * stepSize * i)));
    }
    return projection;
};

export default defineComponent({
    setup(props) {
        const chartRef = ref(null);
        const stakedAmount = ref(props.stakedAmount);
        const apy = ref(props.apy);

        const getChartData = (noMonths = 12) => {
            const steps = 5;
            const sideSteps = 2;
            const labeledSteps = steps - sideSteps;
            const stepSize = noMonths / labeledSteps;
            const labels = [];
            const baseGrowth = apy.value / 1.5;
            const bestGrowth = apy.value * 1.5;
            const baseProjection = getProjectionLine(baseGrowth, stakedAmount.value, steps, stepSize);
            const normProjection = getProjectionLine(apy.value, stakedAmount.value, steps, stepSize);
            const bestProjection = getProjectionLine(bestGrowth, stakedAmount.value, steps, stepSize);
            const pointLabels = Array(sideSteps / 2).fill('');
            for (let i = 0; i < sideSteps; i++) {
                labels.push('');
            }
            for (let i = 1; i <= labeledSteps; i++) {
                labels.splice(i, 0, i18n.t('{number}M', { number: i * stepSize }));
            }
            for (let i = sideSteps / 2; i < steps - (sideSteps / 2); i++) {
                // const label = Math.round((bestProjection[i] - baseProjection[i]) / NIM_MAGNITUDE);
                const label = Math.round(normProjection[i] / NIM_MAGNITUDE);
                pointLabels.push(`~${label} NIM`);
            }
            for (let i = 0; i < sideSteps / 2; i++) {
                normProjection.splice(i, 1, null);
                normProjection.splice(normProjection.length - 1 - i, 1, null);
                pointLabels.push('');
            }

            const result = {
                labels,
                datasets: [
                    {
                        fill: false,
                        data: normProjection,
                        showLine: false,
                        pointStyle: pointLabels,
                    },
                    {
                        fill: true,
                        backgroundColor: 'rgba(255, 255, 255, 1.0)',
                        borderColor: 'rgba(33, 188, 165, 0.8)',
                        data: baseProjection,
                        pointStyle: transparentPixel,
                    },
                    {
                        fill: true,
                        backgroundColor: 'rgba(33, 188, 165, 0.1)',
                        borderColor: 'rgba(33, 188, 165, 0.8)',
                        data: bestProjection,
                        pointStyle: transparentPixel,
                    },
                ],
            };

            return result;
        };

        const transparentPixel = new Image(1, 1);
        transparentPixel.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1H'
            + 'AwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

        const chartData = {
            id: 'stakingGraph',
            type: 'line',
            data: getChartData(),
            options: {
                scales: {
                    y: {
                        display: false,
                    },
                    x: {
                        display: true,
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                },
            },
        };

        // const updateChart = () => {
        //     chartData.data.datasets = [{
        //         backgroundColor: 'rgba(33, 188, 165, 0.2)',
        //         data: [450, 1000, 1350],
        //     }];

        //     chartRef.value.update(250);
        // };

        return {
            chartData,
            chartRef,
        };
    },
    props: {
        stakedAmount: {
            type: Number,
            required: true,
        },
        apy: {
            type: Number,
            required: true,
        },
    },
    components: {
        Vue3ChartJs,
    },
});
</script>

<style lang="scss" scoped>
    .chart-container {
        display: flex;
        flex-direction: column;
        margin: 0;
        margin-left: -0.625rem;
        margin-right: -0.625rem;
        overflow: hidden;
    }
</style>

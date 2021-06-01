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
import { Duration, DateTime } from 'luxon';
import { formatSpaceyNumber } from '../../../lib/NumberFormatting';
import { NIM_MAGNITUDE } from '../../../lib/Constants';
import { i18n } from '../../../i18n/i18n-setup';
import Vue3ChartJs from './lib/Vue3ChartJs.vue';

export const NOW = DateTime.now();
export const MONTH = DateTime.fromObject({ months: 1 });

const getProjectionLine = (apy, staked, steps, stepSize, dV = 1.13) => {
    const projection = [];
    const apm = (apy / 12.0) / 100.0;

    for (let i = 0; i < steps; i++) {
        projection.push(
            {
                x: NOW.plus(Duration.fromObject({ months: stepSize * i })).toMillis(),
                y: staked * (1.0 + (apm * stepSize * i * (dV ** i))),
            });
    }
    return projection;
};

const createPatternFill = (lineColor = '', width = 518, height = 103) => {
    const patternCanvas = document.createElement('canvas');
    const patternContext = patternCanvas.getContext('2d');
    patternCanvas.width = width;
    patternCanvas.height = height;

    patternContext.lineWidth = 0.5;
    if (lineColor) {
        patternContext.strokeStyle = lineColor;
    } else {
        patternContext.strokeStyle = 'rgba(31, 35, 72, 0.3)';
    }
    const gaps = [18 / 2.0, 18];

    for (let x = gaps[0] - 1; x <= patternCanvas.width; x += gaps[0]) {
        patternContext.moveTo(x, 0);
        patternContext.lineTo(x, patternCanvas.height);
        x += 0.075;
    }

    for (let y = gaps[1] / 4.0; y <= patternCanvas.height; y += gaps[1]) {
        patternContext.moveTo(0, y);
        patternContext.lineTo(patternCanvas.width, y);
    }
    patternContext.stroke();

    const pattern = patternContext.createPattern(patternCanvas, 'no-repeat');
    return pattern;
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
                const label = formatSpaceyNumber(normProjection[i].y, NIM_MAGNITUDE);

                pointLabels.push(`~ ${label} NIM`);
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
                        fill: 'origin',
                        backgroundColor: createPatternFill(),
                        borderColor: 'rgba(33, 188, 165, 0.8)',
                        data: baseProjection,
                        pointStyle: transparentPixel,
                    },
                    {
                        fill: '-1',
                        tension: 1,
                        backgroundColor: createPatternFill('rgba(33, 188, 165, 0.7)'), // 'rgba(33, 188, 165, 0.1)',
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

        const noMonths = 12;
        const data = getChartData(noMonths);
        const minYValue = data.datasets[1].data[0].y;
        const maxYValue = data.datasets[2].data[data.datasets[2].data.length - 1].y;

        const chartData = {
            id: 'stakingGraph',
            type: 'line',
            data,
            options: {
                scales: {
                    y: {
                        max: maxYValue,
                        min: minYValue,
                        ticks: {
                            // source: 'data',
                            stepSize: (maxYValue - minYValue) / 6.0,
                            // maxTicksLimit: 7,
                            callback: () => '',
                            font: {
                                size: 0,
                            },
                        },
                    },
                    x: {
                        type: 'time',
                        bounds: 'data',
                        min: NOW.toMillis(),
                        max: NOW.plus(Duration.fromObject({ months: noMonths * 1.3334 })).toMillis(),
                        time: {
                            unit: 'month',
                        },
                        ticks: {
                            source: 'data',
                            callback: (value, index) => data.labels[index],
                        },
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

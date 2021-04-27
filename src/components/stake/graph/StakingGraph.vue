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
import { i18n } from '../../../i18n/i18n-setup';
import Vue3ChartJs from './lib/Vue3ChartJs.vue';

export default defineComponent({
    setup() {
        const chartRef = ref(null);

        const getChartData = () => {
            const result = {
                labels: ['', i18n.t('4M'), i18n.t('8M'), i18n.t('12M'), ''],
                datasets: [
                    {
                        fill: true,
                        backgroundColor: 'rgba(255, 255, 255, 1.0)',
                        borderColor: 'rgba(33, 188, 165, 0.8)',
                        data: [9800, 11000, 12200, 13400, 14600],
                        pointStyle: transparentPixel,
                    },
                    {
                        fill: true,
                        backgroundColor: 'rgba(33, 188, 165, 0.1)',
                        borderColor: 'rgba(33, 188, 165, 0.8)',
                        data: [13000, 14450, 16000, 17900, 19000],
                        pointStyle: transparentPixel,
                    },
                ],
            };

            const midLine = {
                fill: false,
                data: [null],
                showLine: false,
                pointStyle: [''],
                labels: [''],
            };

            for (let i = 1; i < result.datasets[0].data.length - 1; i++) {
                const sum = result.datasets[0].data[i] + result.datasets[1].data[i];
                const diff = result.datasets[1].data[i] - result.datasets[0].data[i];
                midLine.data.push(sum / 2.0);
                midLine.pointStyle.push(`~${parseInt(diff, 10)} NIM`);
            }
            midLine.data.push(null);
            midLine.pointStyle.push('');

            result.datasets.splice(0, 0, midLine);

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

        const updateChart = () => {
            chartData.data.datasets = [{
                backgroundColor: 'rgba(33, 188, 165, 0.2)',
                data: [450, 1000, 1350],
            }];

            chartRef.value.update(250);
        };

        return {
            chartData,
            updateChart,
            chartRef,
        };
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

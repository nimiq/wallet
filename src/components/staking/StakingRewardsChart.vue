<template>
    <div class="staking-rewards-chart">
        <div v-if="isLoading" class="loading flex-row">
            <CircleSpinner/>
            <span>{{ $t('Loading chart...') }}</span>
        </div>
        <component
            :is="LineChartComponent"
            v-else-if="chartData && LineChartComponent"
            :chart-data="chartData"
            :chart-options="chartOptions"
            :height="null"
            :width="null"
        />
        <div v-else-if="!chartData" class="no-rewards">
            {{ $t('No rewards yet') }}
        </div>
        <div v-else-if="loadError" class="error">
            {{ $t('Failed to load chart') }}
        </div>
        <div class="timerange-selector">
            <SliderToggle name="timerange-toggle" v-model="selectedRange">
                <template #M3>
                    <button class="reset timerange-btn">{{ $t('3M') }}</button>
                </template>
                <template #M6>
                    <button class="reset timerange-btn">{{ $t('6M') }}</button>
                </template>
                <template #Y1>
                    <button class="reset timerange-btn">{{ $t('1Y') }}</button>
                </template>
                <template #ALL>
                    <button class="reset timerange-btn">{{ $t('ALL') }}</button>
                </template>
            </SliderToggle>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from '@vue/composition-api';
import { SliderToggle, CircleSpinner } from '@nimiq/vue-components';
import { useStakingStore, AggregatedRestakingEvent } from '../../stores/Staking';

type TimeRange = 'ALL' | 'Y1' | 'M6' | 'M3';

// Chart configuration constants
const CHART_POINT_COUNT = 40; // Number of data points to generate for smooth chart
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

// Custom Chart.js plugin for visual effects
const verticalLinesBelowLine = {
    id: 'verticalLinesBelowLine',
    beforeDatasetsDraw(chart: any) {
        const { ctx, data, scales } = chart;
        if (!data.datasets.length) return;
        const dataset = data.datasets[0];
        if (!dataset.data || !dataset.data.length) return;

        // Draw vertical lines
        ctx.save();
        ctx.strokeStyle = 'rgba(31, 35, 72, 0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < dataset.data.length; i++) {
            const x = scales.x.getPixelForValue(i);
            const y = scales.y.getPixelForValue(dataset.data[i]);
            ctx.beginPath();
            ctx.moveTo(x, scales.y.getPixelForValue(scales.y.min));
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw white border effect BEFORE the green line
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (let i = 0; i < dataset.data.length; i++) {
            const x = scales.x.getPixelForValue(i);
            const y = scales.y.getPixelForValue(dataset.data[i]);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.restore();
    },
};

export default defineComponent({
    name: 'StakingRewardsChart',
    setup() {
        const { stakingEvents } = useStakingStore();
        const selectedRange = ref<TimeRange>('ALL');
        const isLoading = ref(true);
        const loadError = ref(false);
        const LineChartComponent = ref(null);
        const ChartJSInstance = ref<any>(null);

        // Calculate date range based on selected time period
        const getDateRange = (
            range: TimeRange,
            rewardEvents: Readonly<AggregatedRestakingEvent[]>,
        ): { startDate: Date, endDate: Date } => {
            const now = new Date();

            switch (range) {
                case 'Y1':
                    return {
                        startDate: new Date(now.getTime() - DAYS_PER_YEAR * MILLISECONDS_PER_DAY),
                        endDate: now,
                    };
                case 'M6':
                    return {
                        startDate: new Date(now.getTime() - 6 * DAYS_PER_MONTH * MILLISECONDS_PER_DAY),
                        endDate: now,
                    };
                case 'M3':
                    return {
                        startDate: new Date(now.getTime() - 3 * DAYS_PER_MONTH * MILLISECONDS_PER_DAY),
                        endDate: now,
                    };
                default: // ALL
                    if (!rewardEvents.length) return { startDate: now, endDate: now };
                    return {
                        startDate: new Date(rewardEvents[0].time_window),
                        endDate: now,
                    };
            }
        };

        // Lazy load Chart.js and its dependencies
        const loadChartDependencies = async () => {
            try {
                isLoading.value = true;
                loadError.value = false;

                // Import Chart.js components and Vue wrapper
                // Dynamic imports - eslint errors are false positives for lazy-loaded dependencies
                /* eslint-disable import/no-unresolved, import/extensions */
                const [
                    { Chart: ChartJS, Title, Tooltip, LineElement, LinearScale, CategoryScale, PointElement },
                    { Line },
                ] = await Promise.all([
                    import('chart.js'),
                    import('vue-chartjs/legacy'),
                ]);
                /* eslint-enable import/no-unresolved, import/extensions */

                // Register all required Chart.js components
                ChartJS.register(
                    Title,
                    Tooltip,
                    LineElement,
                    LinearScale,
                    CategoryScale,
                    PointElement,
                    verticalLinesBelowLine,
                );

                ChartJSInstance.value = ChartJS;
                LineChartComponent.value = Line;
                isLoading.value = false;
            } catch (error) {
                console.error('Failed to load chart dependencies:', error); // eslint-disable-line no-console
                loadError.value = true;
                isLoading.value = false;
            }
        };

        onMounted(() => {
            loadChartDependencies();
        });

        onUnmounted(() => {
            // Cleanup: unregister custom plugin to prevent memory leaks
            if (ChartJSInstance.value) {
                try {
                    ChartJSInstance.value.unregister(verticalLinesBelowLine);
                } catch (error) {
                    // Plugin might not be registered, safe to ignore
                }
            }
        });

        // Generate chart data from staking reward events
        const chartData = computed(() => {
            // Cache result of stakingEvents.value getter to avoid overhead of Vue's reactivity system on access.
            const events = stakingEvents.value;
            if (!events || !events.length) return null;

            const { startDate, endDate } = getDateRange(selectedRange.value, events);

            // Generate data points for smooth chart rendering
            const labels: string[] = [];
            const data: number[] = [];
            const timeRange = endDate.getTime() - startDate.getTime();
            const intervalMs = timeRange / (CHART_POINT_COUNT - 1);

            let eventIndex = 0;
            let cumulativeRewards = 0;
            for (let pointIndex = 0; pointIndex < CHART_POINT_COUNT; pointIndex++) {
                const pointDateIsoString = new Date(startDate.getTime() + (pointIndex * intervalMs)).toISOString();

                // Find the index of the first event that occurred after point date and cumulative rewards until there.
                const eventCount = events.length;
                for (; eventIndex < eventCount; eventIndex++) {
                    const event = events[eventIndex];
                    if (event.time_window > pointDateIsoString) break;
                    cumulativeRewards += event.aggregated_value;
                }

                labels.push(`point-${pointIndex}`); // Simple labels for Chart.js (not displayed)
                data.push(cumulativeRewards);
            }

            return {
                labels,
                datasets: [
                    {
                        label: 'Cumulative Rewards',
                        data,
                        borderColor: '#21BCA5', // Nimiq green
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4, // Smooth curve
                        pointRadius: 0, // Hide points
                        pointHoverRadius: 0,
                        showLine: true,
                        borderDash: [],
                        borderDashOffset: 0,
                        borderCapStyle: 'round',
                        borderJoinStyle: 'round',
                    },
                ],
            };
        });

        // Chart.js configuration options
        const chartOptions = computed(() => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false, // Hide legend
                },
                tooltip: {
                    enabled: false, // Disable tooltips
                },
            },
            scales: {
                x: {
                    display: false, // Hide x-axis
                    ticks: {
                        display: false,
                    },
                    grid: {
                        display: false,
                    },
                    beginAtZero: false,
                },
                y: {
                    display: false, // Hide y-axis
                    ticks: {
                        display: false,
                    },
                    grid: {
                        display: false,
                    },
                    beginAtZero: false,
                },
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
            animation: false, // Disable all animations
        }));

        return {
            selectedRange,
            chartData,
            chartOptions,
            isLoading,
            loadError,
            LineChartComponent,
        };
    },
    components: {
        SliderToggle,
        CircleSpinner,
    },
});
</script>

<style lang="scss" scoped>
.staking-rewards-chart {
    position: relative;
    width: 100%;
    height: 150px;
    border-radius: 0.75rem;
    border: 1px solid var(--text-10);
    overflow: hidden;
    padding: .5px;

    .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-secondary);
        font-size: var(--small-size);

        span {
            font-size: var(--small-size);
            opacity: 0.5;
            margin-left: 1rem;
            font-weight: 600;
        }
    }

    .no-rewards,
    .error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-secondary);
        font-size: var(--small-size);
    }

    .error {
        color: var(--error-color);
    }

    :v-deep canvas {
        width: 100% !important;
        height: 100% !important;
    }
}

.timerange-selector {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    background: white;
    border-radius: 2000rem;
    padding: 0.4rem;
    z-index: 10;

    ::v-deep .slider-toggle {
        font-size: 1.375rem;
        font-weight: 700;

        --verticalPadding: 0.25rem;
        --horizontalPadding: 1rem;
        --padding: 0.2rem;
    }
}
</style>

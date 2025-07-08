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
                <template #ALL>
                    <button class="reset timerange-btn">{{ $t('ALL') }}</button>
                </template>
                <template #Y1>
                    <button class="reset timerange-btn">{{ $t('1Y') }}</button>
                </template>
                <template #M6>
                    <button class="reset timerange-btn">{{ $t('6M') }}</button>
                </template>
                <template #M3>
                    <button class="reset timerange-btn">{{ $t('3M') }}</button>
                </template>
            </SliderToggle>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from '@vue/composition-api';
import { SliderToggle, CircleSpinner } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';

export default defineComponent({
    name: 'StakingRewardsChart',
    setup() {
        const { stakingEvents } = useStakingStore();
        const selectedRange = ref<'ALL' | 'Y1' | 'M6' | 'M3'>('ALL');
        const isLoading = ref(true);
        const loadError = ref(false);
        const LineChartComponent = ref(null);

        // Lazy load chart.js dependencies
        const loadChartDependencies = async () => {
            try {
                isLoading.value = true;
                loadError.value = false;

                // Import chart.js and register components
                const [
                    { Chart: ChartJS, Title, Tooltip, LineElement, LinearScale, CategoryScale, PointElement },
                    { Line }
                ] = await Promise.all([
                    import('chart.js'),
                    import('vue-chartjs/legacy')
                ]);

                // Register chart.js components
                ChartJS.register(
                    Title,
                    Tooltip,
                    LineElement,
                    LinearScale,
                    CategoryScale,
                    PointElement,
                );

                // Register the custom plugin globally
                ChartJS.register(verticalLinesBelowLine);

                // Set the LineChart component
                LineChartComponent.value = Line;
                isLoading.value = false;
            } catch (error) {
                console.error('Failed to load chart dependencies:', error);
                loadError.value = true;
                isLoading.value = false;
            }
        };

        // Load dependencies when component mounts
        onMounted(() => {
            loadChartDependencies();
        });

        // Calculate rewards chart data
        const chartData = computed(() => {
            if (!stakingEvents.value) return null;

            // Filter only reward events (type 6) and sort by date
            const rewardEvents = stakingEvents.value
                .filter((event) => event.type === 6)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (rewardEvents.length === 0) return null;

            // Calculate the date range based on selected time range
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            switch (selectedRange.value) {
                case 'Y1':
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    endDate = now;
                    break;
                case 'M6':
                    startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
                    endDate = now;
                    break;
                case 'M3':
                    startDate = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
                    endDate = now;
                    break;
                default: // ALL
                    startDate = new Date(rewardEvents[0].date);
                    endDate = now;
                    break;
            }

            // Calculate cumulative rewards up to the start date (for proper baseline)
            let baselineRewards = 0;
            if (selectedRange.value !== 'ALL') {
                baselineRewards = rewardEvents
                    .filter((event) => new Date(event.date) < startDate)
                    .reduce((sum, event) => sum + event.value, 0);
            }

            // Group all rewards by month for the entire period
            const monthlyRewards = new Map();
            rewardEvents.forEach((event) => {
                const date = new Date(event.date);
                const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                const currentValue = monthlyRewards.get(monthKey) || 0;
                monthlyRewards.set(monthKey, currentValue + event.value);
            });

            // Create a fixed number of points (e.g., 20 points) for consistent data density
            const FIXED_POINTS = 40;
            const labels: string[] = [];
            const data: number[] = [];
            let cumulativeRewards = baselineRewards;

            // Calculate time interval between points
            const timeRange = endDate.getTime() - startDate.getTime();
            const intervalMs = timeRange / (FIXED_POINTS - 1);

            for (let i = 0; i < FIXED_POINTS; i++) {
                const pointDate = new Date(startDate.getTime() + (i * intervalMs));

                // Calculate cumulative rewards up to this point
                const rewardsUpToPoint = rewardEvents
                    .filter((event) => new Date(event.date) <= pointDate)
                    .reduce((sum, event) => sum + event.value, 0);

                const totalRewards = baselineRewards + rewardsUpToPoint;

                // Format label as "MMM YYYY" for the first, last, and every 5th point
                let label = '';
                if (i === 0 || i === FIXED_POINTS - 1 || i % 5 === 0) {
                    label = pointDate.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                    });
                } else {
                    label = ''; // Empty label for intermediate points
                }

                labels.push(label);
                data.push(totalRewards);
            }

            return {
                labels,
                datasets: [
                    {
                        label: 'Cumulative Rewards',
                        data,
                        borderColor: '#21BCA5' /* --nimiq-green */,
                        // backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        // pointHoverRadius: 4,
                        // pointHoverBackgroundColor: '#21BCA5' /* --nimiq-green */,
                        // pointHoverBorderColor: '#fff',
                        // pointHoverBorderWidth: 2,
                        showLine: true,
                        // Add white border effect using stroke
                        borderDash: [],
                        borderDashOffset: 0,
                        // Use a custom plugin to add white border
                        borderCapStyle: 'round',
                        borderJoinStyle: 'round',
                    },
                ],
            };
        });

                // Custom plugin for vertical lines below the line and white border effect
        const verticalLinesBelowLine = {
            id: 'verticalLinesBelowLine',
            beforeDatasetsDraw(chart: any) {
                const {ctx, chartArea, data, scales} = chart;
                if (!data.datasets.length) return;
                const dataset = data.datasets[0];
                if (!dataset.data || !dataset.data.length) return;

                // Draw vertical lines
                ctx.save();
                ctx.strokeStyle = 'rgba(31, 35, 72, 0.12)'; // light gray, adjust as needed
                ctx.lineWidth = 1;
                for (let i = 0; i < dataset.data.length; i++) {
                    const x = scales.x.getPixelForValue(i);
                    const y = scales.y.getPixelForValue(dataset.data[i]);
                    ctx.beginPath();
                    ctx.moveTo(x, scales.y.getPixelForValue(scales.y.min)); // from x-axis
                    ctx.lineTo(x, y); // up to the data point
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

        // Chart options
        const chartOptions = computed(() => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: false,
                //     mode: 'index',
                //     intersect: false,
                //     backgroundColor: 'rgba(0, 0, 0, 0.8)',
                //     titleColor: '#fff',
                //     bodyColor: '#fff',
                //     borderColor: 'var(--nimiq-green)',
                //     borderWidth: 1,
                //     callbacks: {
                //         label: (context) => {
                //             const value = context.parsed.y;
                //             return `Rewards: ${value.toFixed(2)} NIM`;
                //         },
                //     },
                },
            },
            scales: {
                x: {
                    display: false,
                    ticks: {
                        display: false,
                    },
                    grid: {
                        display: false,
                    },
                    beginAtZero: false,
                },
                y: {
                    display: false,
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
            // elements: {
            //     point: {
            //         hoverRadius: 4,
            //     },
            // },

            animation: false,
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

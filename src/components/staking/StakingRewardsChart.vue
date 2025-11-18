<template>
    <div
        class="staking-rewards-chart"
        @mousemove="handleChartMouseMove"
        @mouseleave="handleChartMouseLeave"
        @blur="handleChartMouseLeave"
    >
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

        <!-- Event tooltip -->
        <div
            v-if="hoveredEvents.length > 0 && tooltipPosition"
            class="event-tooltip"
            :style="{
                left: tooltipPosition.x + 'px',
                top: tooltipPosition.y + 'px',
            }"
        >
            <div v-for="(event, index) in hoveredEvents" :key="event.transactionHash" class="event-item">
                <div class="event-header">{{ event.meaning }}, {{ event.date }}</div>
                <div
                    class="event-amount"
                    :class="{
                        'positive': event.type !== 'remove-stake',
                        'negative': event.type === 'remove-stake',
                    }"
                >
                    {{ event.type === 'remove-stake' ? '-' : '+' }}{{
                        (event.amount / 100000).toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                        })
                    }}&nbsp;NIM
                </div>
                <div v-if="index < hoveredEvents.length - 1" class="event-divider"></div>
            </div>
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
import { useTransactionsStore } from '../../stores/Transactions';
import { getStakingTransactionMeaning } from '../../lib/StakingUtils';
import { STAKING_CONTRACT_ADDRESS } from '../../lib/Constants';

type TimeRange = 'ALL' | 'Y1' | 'M6' | 'M3';

// Chart configuration constants
const CHART_POINT_COUNT = 40; // Number of data points to generate for smooth chart
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

// Staking event marker configuration
const MARKER_RADIUS = 5; // Radius of event marker dots in pixels
const MARKER_HOVER_THRESHOLD = 15; // Distance threshold for hover detection
const MARKER_COLORS = {
    CREATE: '#21BCA5', // Green for create-staker and add-stake
    REMOVE: '#D94432', // Red for remove-stake/unstake
};

// Type for staking event data used in chart
interface StakingEventMarker {
    timestamp: number;
    type: string; // 'create-staker', 'add-stake', 'remove-stake'
    meaning: string; // Human-readable description
    amount: number; // Amount in Luna
    transactionHash: string;
    date: string; // Formatted date
}

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

// Variable to store marker positions for hover detection (shared between plugin and event handlers)
let globalMarkerPositions: Array<{ x: number, y: number, event: StakingEventMarker }> = [];

// Custom Chart.js plugin for staking event markers
const eventMarkersPlugin = {
    id: 'eventMarkers',
    afterDatasetsDraw(chart: any) {
        const { ctx, scales } = chart;
        const events = chart.options?.plugins?.eventMarkers?.events || [];
        const chartData = chart.data?.datasets?.[0]?.data || [];

        if (!events.length || !chartData.length) {
            globalMarkerPositions = [];
            return;
        }

        const markerPositions: Array<{
            x: number,
            y: number,
            event: StakingEventMarker,
        }> = [];

        // Get time range from chart data
        const startDate = chart.options?.plugins?.eventMarkers?.startDate;
        const endDate = chart.options?.plugins?.eventMarkers?.endDate;
        if (!startDate || !endDate) {
            globalMarkerPositions = [];
            return;
        }

        const timeRange = endDate.getTime() - startDate.getTime();

        ctx.save();

        // Draw event markers
        for (const event of events) {
            // Calculate position on chart
            const eventTime = event.timestamp - startDate.getTime();
            const progress = eventTime / timeRange;
            const dataIndex = Math.floor(progress * (chartData.length - 1));

            if (dataIndex < 0 || dataIndex >= chartData.length) continue;

            // Get pixel coordinates
            const x = scales.x.getPixelForValue(dataIndex);
            const y = scales.y.getPixelForValue(chartData[dataIndex]);

            // Store position for hover detection
            markerPositions.push({ x, y, event });

            // Determine marker color based on event type
            const isRemove = event.type === 'remove-stake';
            const markerColor = isRemove ? MARKER_COLORS.REMOVE : MARKER_COLORS.CREATE;

            // Draw white border
            ctx.beginPath();
            ctx.arc(x, y, MARKER_RADIUS + 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // Draw colored marker
            ctx.beginPath();
            ctx.arc(x, y, MARKER_RADIUS, 0, 2 * Math.PI);
            ctx.fillStyle = markerColor;
            ctx.fill();
        }

        ctx.restore();

        // Store marker positions globally for hover detection
        globalMarkerPositions = markerPositions;
        chart.options.plugins.eventMarkers.markerPositions = markerPositions;
        console.log('[Plugin Debug] Stored', markerPositions.length, 'marker positions');
    },
};

export default defineComponent({
    name: 'StakingRewardsChart',
    setup() {
        const { stakingEvents } = useStakingStore();
        const { state: transactionsState } = useTransactionsStore();
        const selectedRange = ref<TimeRange>('ALL');
        const isLoading = ref(true);
        const loadError = ref(false);
        const LineChartComponent = ref(null);
        const ChartJSInstance = ref<any>(null);

        // Tooltip state
        const tooltipPosition = ref<{ x: number, y: number } | null>(null);
        const hoveredEvents = ref<StakingEventMarker[]>([]);

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

        // Extract and filter staking events from transactions
        const stakingEventsForChart = computed(() => {
            const events: StakingEventMarker[] = [];
            const allTransactions = Object.values(transactionsState.transactions);

            // Filter staking transactions
            for (const tx of allTransactions) {
                // Check if transaction is related to staking contract
                const isStaking = tx.recipient === STAKING_CONTRACT_ADDRESS;
                const isUnstaking = tx.sender === STAKING_CONTRACT_ADDRESS;

                if (!isStaking && !isUnstaking) continue;

                // Get transaction type
                let txType: string | null = null;
                if (isStaking && tx.data.type) {
                    txType = tx.data.type;
                } else if (isUnstaking && 'senderData' in tx && (tx as any).senderData?.type) {
                    txType = (tx as any).senderData.type;
                }

                // Filter for relevant event types
                if (!txType || ![
                    'create-staker',
                    'add-stake',
                    'remove-stake',
                ].includes(txType)) continue;

                // Only include confirmed or included transactions
                if (tx.state !== 'confirmed' && tx.state !== 'included') continue;

                // Get transaction meaning
                const meaning = getStakingTransactionMeaning(tx, false);
                if (!meaning) continue;

                // Format date
                const timestamp = tx.timestamp || 0;
                const date = new Date(timestamp);
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                }).format(date);

                events.push({
                    timestamp,
                    type: txType,
                    meaning,
                    amount: tx.value,
                    transactionHash: tx.transactionHash,
                    date: formattedDate,
                });
            }

            // Sort by timestamp
            events.sort((a, b) => a.timestamp - b.timestamp);

            // Filter by selected time range
            const rewardEvents = stakingEvents.value;
            if (!rewardEvents || !rewardEvents.length) return events;

            const { startDate } = getDateRange(selectedRange.value, rewardEvents);
            return events.filter((event) => event.timestamp >= startDate.getTime());
        });

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
                    eventMarkersPlugin,
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
            console.log('[Setup Debug] Component mounted, using Vue event handlers');
        });

        onUnmounted(() => {
            // Cleanup: unregister custom plugins to prevent memory leaks
            if (ChartJSInstance.value) {
                try {
                    ChartJSInstance.value.unregister(verticalLinesBelowLine);
                    ChartJSInstance.value.unregister(eventMarkersPlugin);
                } catch (error) {
                    // Plugins might not be registered, safe to ignore
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
        const chartOptions = computed(() => {
            const rewardEvents = stakingEvents.value;
            const hasRewardEvents = rewardEvents && rewardEvents.length > 0;
            const { startDate, endDate } = hasRewardEvents
                ? getDateRange(selectedRange.value, rewardEvents)
                : { startDate: new Date(), endDate: new Date() };

            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false, // Hide legend
                    },
                    tooltip: {
                        enabled: false, // Disable tooltips
                    },
                    eventMarkers: {
                        events: stakingEventsForChart.value,
                        startDate,
                        endDate,
                        markerPositions: [],
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
            };
        });

        // Hover detection for event markers
        const handleChartMouseMove = (event: MouseEvent) => {
            // Use global marker positions from plugin
            console.log('[Hover Debug] globalMarkerPositions length:', globalMarkerPositions.length);
            if (!globalMarkerPositions.length) return;

            // Get the canvas element to calculate correct coordinates
            const container = event.currentTarget as HTMLElement;
            const canvas = container.querySelector('canvas');
            const modal = document.body.querySelector('.staking-modal .wrapper');
            if (!canvas || !modal) {
                console.log('[Hover Debug] No canvas or modal found');
                return;
            }

            const rect = canvas.getBoundingClientRect();
            console.log('[Hover Debug] Canvas rect:', rect);
            const modalRect = modal.getBoundingClientRect();
            console.log('[Hover Debug] Modal rect:', modalRect);
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            console.log('[Hover Debug] Mouse position:', { mouseX, mouseY });

            // Find markers near cursor
            const nearbyMarkers: StakingEventMarker[] = [];

            for (const { x, y, event: markerEvent } of globalMarkerPositions) {
                const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
                if (distance <= MARKER_HOVER_THRESHOLD) {
                    nearbyMarkers.push(markerEvent);
                }
            }

            if (nearbyMarkers.length > 0) {
                // Group events by date and combine them
                const eventsByDate = new Map<string, StakingEventMarker[]>();
                for (const marker of nearbyMarkers) {
                    const existing = eventsByDate.get(marker.date);
                    if (existing) {
                        existing.push(marker);
                    } else {
                        eventsByDate.set(marker.date, [marker]);
                    }
                }

                // Flatten all events (they will be displayed together)
                const allEvents = Array.from(eventsByDate.values()).flat();

                hoveredEvents.value = allEvents;

                // Use viewport coordinates for fixed positioning
                tooltipPosition.value = {
                    x: event.clientX - modalRect.left,
                    y: event.clientY - modalRect.top,
                };

                console.log('[Tooltip Debug] Tooltip position:', { ...tooltipPosition.value });
            } else {
                hoveredEvents.value = [];
                tooltipPosition.value = null;
            }
        };

        const handleChartMouseLeave = () => {
            hoveredEvents.value = [];
            tooltipPosition.value = null;
        };

        return {
            selectedRange,
            chartData,
            chartOptions,
            isLoading,
            loadError,
            LineChartComponent,
            hoveredEvents,
            tooltipPosition,
            handleChartMouseMove,
            handleChartMouseLeave,
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
    z-index: 3;

    ::v-deep .slider-toggle {
        font-size: 1.375rem;
        font-weight: 700;

        --verticalPadding: 0.25rem;
        --horizontalPadding: 1rem;
        --padding: 0.2rem;
    }
}

.event-tooltip {
    position: fixed;
    background: rgba(31, 35, 72, 0.95);
    color: white;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    font-size: 1.5rem;
    line-height: 1.4;
    z-index: 1000;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 1rem));
    box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.15);
    min-width: 15rem;
    // max-width: 25rem;
    width: fit-content;

    .event-item {
        .event-header {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
            opacity: 0.9;
        }

        .event-amount {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;

            &.positive {
                color: #21BCA5;
            }

            &.negative {
                color: #D94432;
            }
        }

        .event-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.2);
            margin: 0.75rem 0;
        }

        &:last-child .event-amount {
            margin-bottom: 0;
        }
    }
}
</style>

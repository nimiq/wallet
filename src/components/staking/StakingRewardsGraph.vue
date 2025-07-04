<template>
    <div class="rewards-chart">
        <LineChart
            :points="points"
            :stroke-width="2"
            stroke="var(--nimiq-green)"
            :stroke-opacity="1"
            :padding="8"
            height="150px"
            :animate="false"
            :smoothing-factor="0.05"
        >
            <div v-if="points.length === 0" class="no-rewards">
                No rewards yet
            </div>
        </LineChart>
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
import { defineComponent, ref, computed } from 'vue';
import { SliderToggle } from '@nimiq/vue-components';
import LineChart from '../LineChart.vue';
import { useStakingStore } from '../../stores/Staking';

export default defineComponent({
    name: 'StakingRewardsChart',
    components: {
        LineChart,
        SliderToggle,
    },
    setup() {
        const { stakingEvents } = useStakingStore();
        const selectedRange = ref<'ALL' | 'Y1' | 'M6' | 'M3'>('ALL');

        // Calculate rewards chart points
        const points = computed(() => {
            if (!stakingEvents.value) return [];

            // Filter only reward events (type 6) and sort by date
            const rewardEvents = stakingEvents.value
                .filter((event) => event.type === 6)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (rewardEvents.length === 0) return [];

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

            // Create a continuous timeline for the selected range
            const timeline = [];
            const currentDate = new Date(startDate);
            currentDate.setUTCDate(1); // Start from first day of month
            currentDate.setUTCHours(0, 0, 0, 0);

            let cumulativeRewards = baselineRewards;

            while (currentDate <= endDate) {
                const monthKey = `${currentDate.getUTCFullYear()}-${
                    String(currentDate.getUTCMonth() + 1).padStart(2, '0')
                }`;
                const monthlyReward = monthlyRewards.get(monthKey) || 0;
                cumulativeRewards += monthlyReward;

                timeline.push({
                    x: currentDate.getTime(),
                    y: cumulativeRewards,
                });

                // Move to next month
                currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
            }

            // If no data points were created (e.g., no rewards in selected range),
            // add at least one point to show the baseline
            if (timeline.length === 0) {
                timeline.push({
                    x: startDate.getTime(),
                    y: baselineRewards,
                });
            }

            return timeline;
        });

        return {
            selectedRange,
            points,
        };
    },
});
</script>

<style lang="scss" scoped>
.rewards-chart {
    position: relative;
    width: 100%;
    height: 150px;
    border-radius: 0.5rem;

    .no-rewards {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--text-secondary);
        font-size: var(--small-size);
    }
}

.timerange-selector {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    background: white;
    border-radius: 2000rem;
    padding: 0.4rem;

    ::v-deep .slider-toggle {
        font-size: 1.375rem;
        font-weight: 700;

        --verticalPadding: 0.25rem;
        --horizontalPadding: 1rem;
        --padding: 0.2rem;
    }
}
</style>

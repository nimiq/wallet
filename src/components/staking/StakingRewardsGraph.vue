<template>
    <div class="rewards-chart">
        <LineChart
            :points="points"
            :stroke-width="2"
            stroke="var(--nimiq-green)"
            :stroke-opacity="1"
            :padding="8"
            height="150px"
            :animate="true"
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
import { defineComponent, ref, computed } from '@vue/composition-api';
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

            // Group rewards by month
            const monthlyRewards = new Map();
            rewardEvents.forEach((event) => {
                const date = new Date(event.date);
                const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                const currentValue = monthlyRewards.get(monthKey) || 0;
                monthlyRewards.set(monthKey, currentValue + event.value);
            });

            // Calculate cumulative rewards by month
            let cumulativeRewards = 0;
            return Array.from(monthlyRewards.entries())
                .map(([monthKey, monthlyReward]) => {
                    cumulativeRewards += monthlyReward;
                    // Use the first day of the month for the x-axis
                    const [year, month] = monthKey.split('-');
                    return {
                        x: new Date(Date.UTC(Number(year), Number(month) - 1, 1)).getTime(),
                        y: cumulativeRewards,
                    };
                });
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

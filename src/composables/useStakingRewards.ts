import { computed } from '@vue/composition-api';
import { useStakingStore } from '../stores/Staking';

export interface MonthlyReward {
    total: number;
    count: number;
}

export function useStakingRewards() {
    const { stakingEvents } = useStakingStore();

    // Calculate monthly rewards grouped by month
    const monthlyRewards = computed(() => {
        const events = stakingEvents.value;
        if (!events) return new Map<string, MonthlyReward>();

        // Filter only reward events (type 6) and group by month
        const rewardsByMonth = new Map<string, MonthlyReward>();
        events
            .filter((event) => event.type === 6)
            .forEach((event) => {
                const date = new Date(event.date);
                const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                const currentData = rewardsByMonth.get(monthKey) || { total: 0, count: 0 };
                rewardsByMonth.set(monthKey, {
                    total: currentData.total + event.value,
                    count: currentData.count + 1,
                });
            });

        return rewardsByMonth;
    });

    // Get reward for a specific month
    const getMonthlyReward = (monthKey: string): MonthlyReward | undefined => monthlyRewards.value.get(monthKey);

    // Get current month reward
    const getCurrentMonthReward = (): MonthlyReward | undefined => {
        const now = new Date();
        const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        return getMonthlyReward(currentMonthKey);
    };

    // Get total rewards across all months
    const totalRewards = computed(() => {
        let total = 0;
        let count = 0;
        monthlyRewards.value.forEach((reward) => {
            total += reward.total;
            count += reward.count;
        });
        return { total, count };
    });

    return {
        monthlyRewards,
        getMonthlyReward,
        getCurrentMonthReward,
        totalRewards,
    };
}

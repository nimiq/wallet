import { computed } from 'vue';
import { useStakingStore } from '../stores/Staking';

export interface MonthlyReward {
    total: number;
    count: number;
}

/**
 * useStakingRewards composable
 *
 * Provides computed staking rewards data grouped by month, including total rewards and transaction counts.
 * Calculates monthly reward summaries from staking events and provides utility functions to
 * access reward data for specific time periods.
 *
 * @returns {
 *   monthlyRewards: ComputedRef<Map<string, MonthlyReward>>,
 *   getMonthlyReward: (monthKey: string) => MonthlyReward | undefined,
 *   getCurrentMonthReward: () => MonthlyReward | undefined,
 *   totalRewards: ComputedRef<{ total: number, count: number }>
 * }
 *
 * @example
 * import { useStakingRewards } from '@/composables/useStakingRewards';
 *
 * const { monthlyRewards, getMonthlyReward, getCurrentMonthReward, totalRewards } = useStakingRewards();
 *
 * // Access all monthly rewards
 * console.log(monthlyRewards.value);
 *
 * // Get rewards for a specific month (format: 'YYYY-MM')
 * const januaryRewards = getMonthlyReward('2024-01');
 *
 * // Get current month rewards
 * const currentRewards = getCurrentMonthReward();
 *
 * // Get total rewards across all months
 * console.log(totalRewards.value.total); // Total reward amount
 * console.log(totalRewards.value.count); // Total number of reward transactions
 */
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

    /**
     * Get reward data for a specific month
     * @param monthKey - Month identifier in 'YYYY-MM' format (e.g., '2024-01' for January 2024)
     * @returns MonthlyReward object containing total rewards and transaction count, or undefined
     * if no rewards exist for that month
     */
    const getMonthlyReward = (monthKey: string): MonthlyReward | undefined => monthlyRewards.value.get(monthKey);

    /**
     * Get reward data for the current month
     * @returns MonthlyReward object for the current month, or undefined if no rewards exist
     */
    const getCurrentMonthReward = (): MonthlyReward | undefined => {
        const now = new Date();
        const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        return getMonthlyReward(currentMonthKey);
    };

    /**
     * Calculate total rewards across all months
     * Aggregates all monthly rewards to provide overall staking reward statistics
     */
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

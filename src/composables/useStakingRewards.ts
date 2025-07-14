import { computed } from '@vue/composition-api';
import { useI18n } from '@/lib/useI18n';
import { useStakingStore } from '@/stores/Staking';

export interface MonthlyReward {
    total: number;
    count: number;
    validators: string[];
}

/**
 * useStakingRewards composable
 *
 * Provides computed staking rewards data grouped by month, including total rewards, transaction counts,
 * and a list of validators that provided rewards for that month.
 * Calculates monthly reward summaries from staking events and provides utility functions to
 * access reward data for specific time periods.
 * Optimized for handling millions of events efficiently.
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
 * console.log(januaryRewards?.validators); // List of validator addresses
 *
 * // Get current month rewards
 * const currentRewards = getCurrentMonthReward();
 *
 * // Get total rewards across all months
 * console.log(totalRewards.value.total); // Total reward amount
 * console.log(totalRewards.value.count); // Total number of reward transactions
 */
export function useStakingRewards() {
    const { locale, $t } = useI18n();
    const { stakingEvents, activeStake } = useStakingStore();

    // Calculate monthly rewards grouped by month
    const monthlyRewards = computed(() => {
        const events = stakingEvents.value;
        const rewardsByMonth = new Map<string, MonthlyReward>();
        if (!events) return rewardsByMonth;

        // Cache event count, to avoid repeatedly accessing it with the overhead of Vue's reactivity system, which can
        // become noticeable here as we're processing potentially tens of thousands of staking events.
        const eventCount = events.length;

        // Filter only reward events (type 6) and group by month
        for (let i = 0; i < eventCount; ++i) {
            const event = events[i];
            if (event.type !== /* reward */ 6) continue;
            const date = new Date(event.date);
            const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            let currentData = rewardsByMonth.get(monthKey);
            if (!currentData) {
                // Create new month data only once
                currentData = { total: 0, count: 0, validators: [] };
                rewardsByMonth.set(monthKey, currentData);
            }

            // Update totals
            currentData.total += event.value;
            currentData.count += 1;

            // Add validator if not already present
            // Cache the senderAddress, to avoid accessing it twice, with the overhead of Vue's reactivity system.
            const senderAddress = event.sender_address;
            if (!currentData.validators.includes(senderAddress)) {
                currentData.validators.push(senderAddress);
            }
        }

        return rewardsByMonth;
    });

    /**
     * Get reward data for a specific month
     * @param monthKey - Month identifier in 'YYYY-MM' format (e.g., '2024-01' for January 2024)
     * @returns MonthlyReward object containing total rewards, transaction count, and validator list, or undefined
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

    /**
     * Get the label for a month
     * @param monthKey - Month identifier in 'YYYY-MM' format (e.g., '2024-01' for January 2024)
     * @returns Month label as a string
     */
    const getMonthLabel = (monthKey: string): string => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
        const now = new Date();

        // Check if it's the current month
        const isCurrentYear = date.getFullYear() === now.getFullYear();
        if (isCurrentYear && date.getMonth() === now.getMonth()) {
            return $t('This month').toString();
        }

        return new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: !isCurrentYear ? 'numeric' : undefined,
        }).format(date);
    };

    /**
     * Check if the current month is ongoing
     * @param monthKey - Month identifier in 'YYYY-MM' format (e.g., '2024-01' for January 2024)
     * @returns true if the current month is ongoing, false otherwise
     * (if the user is currently staking with the last validator in the list, it's ongoing)
     */
    const isOngoingMonth = (monthKey: string): boolean => {
        // Check if it's the current month
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
        const now = new Date();
        const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

        if (!isCurrentMonth) return false;

        // Check if the user is currently staking with any of the validators in this list
        if (!activeStake.value || !activeStake.value.validator) return false;

        // Check if the active validator is the last one in the list (most recent rewards)
        const validators = getMonthlyReward(monthKey)?.validators;
        const lastValidatorAddress = validators?.[validators.length - 1];
        return activeStake.value.validator === lastValidatorAddress;
    };

    return {
        monthlyRewards,
        getMonthlyReward,
        getCurrentMonthReward,
        totalRewards,
        getMonthLabel,
        isOngoingMonth,
    };
}

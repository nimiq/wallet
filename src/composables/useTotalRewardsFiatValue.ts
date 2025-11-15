import { ref, computed, watch, Ref } from '@vue/composition-api';
import { getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { useFiatStore } from '@/stores/Fiat';
import { AggregatedRestakingEvent } from '@/stores/Staking';
import {
    CryptoCurrency,
    FiatCurrency,
    FIAT_API_PROVIDER_TX_HISTORY,
    FIAT_PRICE_UNAVAILABLE,
} from '@/lib/Constants';
import { getEndOfMonthTimestamp, isCurrentMonthAndYear } from '@/lib/StakingUtils';

/**
 * Type for monthly rewards map
 */
export type MonthlyRewardsMap = Map<string, { total: number, validators: string[] }>;

/**
 * Composable for calculating total fiat value of all staking rewards across all months
 * Uses month-based exchange rates:
 * - Past months: End-of-month exchange rate
 * - Current month: Current exchange rate (real-time)
 */
export function useTotalRewardsFiatValue(
    monthlyRewards: Ref<MonthlyRewardsMap>,
    stakingEvents:
        | Ref<AggregatedRestakingEvent[] | undefined | null>
        | Ref<Readonly<AggregatedRestakingEvent[] | null>>,
) {
    const { currency: preferredFiatCurrency, exchangeRates } = useFiatStore();

    const fiatCurrency = computed<FiatCurrency>(() => isHistorySupportedFiatCurrency(
        preferredFiatCurrency.value,
        FIAT_API_PROVIDER_TX_HISTORY,
    ) ? preferredFiatCurrency.value : FiatCurrency.USD);

    const totalRewardsFiatValue = ref<number | typeof FIAT_PRICE_UNAVAILABLE | undefined>(undefined);

    const calculateTotalRewardsFiatValue = async () => {
        if (!monthlyRewards.value.size) {
            totalRewardsFiatValue.value = undefined;
            return;
        }

        // Collect all timestamps we need rates for
        const allTimestamps: number[] = [];
        const monthTimestampMap = new Map<string, { isCurrentMonth: boolean, timestamp?: number }>();

        for (const [monthKey] of monthlyRewards.value.entries()) {
            const { isCurrentMonth } = isCurrentMonthAndYear(monthKey);

            if (!isCurrentMonth) {
                // For past months: collect end-of-month timestamp
                const endOfMonthTimestamp = getEndOfMonthTimestamp(monthKey);
                allTimestamps.push(endOfMonthTimestamp);
                monthTimestampMap.set(monthKey, { isCurrentMonth: false, timestamp: endOfMonthTimestamp });
            } else {
                // For current month: will use current exchange rate (no timestamp needed)
                monthTimestampMap.set(monthKey, { isCurrentMonth: true });
            }
        }

        // Fetch all rates in a single API call
        const ratesMap = await getHistoricExchangeRates(
            CryptoCurrency.NIM,
            fiatCurrency.value,
            allTimestamps,
            FIAT_API_PROVIDER_TX_HISTORY,
        );

        // Calculate total fiat value
        let totalFiat = 0;
        for (const [monthKey, monthData] of monthlyRewards.value.entries()) {
            const monthInfo = monthTimestampMap.get(monthKey);
            if (!monthInfo) continue;

            if (!monthInfo.isCurrentMonth && monthInfo.timestamp) {
                // For past months: Use end-of-month exchange rate
                const rate = ratesMap.get(monthInfo.timestamp);
                if (rate === undefined) {
                    totalRewardsFiatValue.value = FIAT_PRICE_UNAVAILABLE;
                    return;
                }
                // Convert from Luna (1e5 = 1 NIM) to NIM, then to fiat
                totalFiat += rate * (monthData.total / 1e5);
            } else {
                // For current month: Use current exchange rate for total amount
                const currentRate = exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value];
                if (currentRate === undefined) {
                    totalRewardsFiatValue.value = FIAT_PRICE_UNAVAILABLE;
                    return;
                }
                // Convert from Luna (1e5 = 1 NIM) to NIM, then to fiat
                totalFiat += currentRate * (monthData.total / 1e5);
            }
        }

        totalRewardsFiatValue.value = totalFiat;
    };

    // Recalculate when relevant data changes
    watch([
        () => monthlyRewards.value.size,
        fiatCurrency,
        () => stakingEvents.value?.length,
        exchangeRates, // Watch exchange rates for real-time updates
    ], calculateTotalRewardsFiatValue, { lazy: false });

    return {
        totalRewardsFiatValue,
        fiatCurrency,
    };
}

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
 * Composable for calculating fiat value of staking rewards for a given month
 * Uses month-based exchange rates:
 * - Past months: End-of-month exchange rate
 * - Current month: Current exchange rate (real-time)
 */
export function useMonthlyRewardFiatValue(
    monthKey: Ref<string>,
    nimAmount: Ref<number>,
    stakingEvents:
        | Ref<AggregatedRestakingEvent[] | undefined | null>
        | Ref<Readonly<AggregatedRestakingEvent[] | null>>,
) {
    const { currency: preferredFiatCurrency, exchangeRates } = useFiatStore();

    const fiatCurrency = computed<FiatCurrency>(() => isHistorySupportedFiatCurrency(
        preferredFiatCurrency.value,
        FIAT_API_PROVIDER_TX_HISTORY,
    ) ? preferredFiatCurrency.value : FiatCurrency.USD);

    const fiatValue = ref<number | typeof FIAT_PRICE_UNAVAILABLE | undefined>(undefined);

    const calculateFiatValue = async () => {
        const { isCurrentMonth } = isCurrentMonthAndYear(monthKey.value);

        if (!isCurrentMonth) {
            // For past months: Use end-of-month exchange rate
            const endOfMonthTimestamp = getEndOfMonthTimestamp(monthKey.value);
            const ratesMap = await getHistoricExchangeRates(
                CryptoCurrency.NIM,
                fiatCurrency.value,
                [endOfMonthTimestamp],
                FIAT_API_PROVIDER_TX_HISTORY,
            );

            const rate = ratesMap.get(endOfMonthTimestamp);
            if (rate === undefined) {
                fiatValue.value = FIAT_PRICE_UNAVAILABLE;
                return;
            }

            // Convert from Luna (1e5 = 1 NIM) to NIM, then to fiat
            fiatValue.value = rate * (nimAmount.value / 1e5);
        } else {
            // For current month: Use current exchange rate for total amount
            const currentRate = exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency.value];
            if (currentRate === undefined) {
                fiatValue.value = FIAT_PRICE_UNAVAILABLE;
                return;
            }
            // Convert from Luna (1e5 = 1 NIM) to NIM, then to fiat
            fiatValue.value = currentRate * (nimAmount.value / 1e5);
        }
    };

    // Recalculate when relevant data changes
    watch([
        monthKey,
        nimAmount,
        fiatCurrency,
        () => stakingEvents.value?.length,
        exchangeRates, // Watch exchange rates for real-time updates
    ], calculateFiatValue, { lazy: false });

    return {
        fiatValue,
        fiatCurrency,
    };
}

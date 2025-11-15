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
 * - Current month: Per-event historic rates
 */
export function useMonthlyRewardFiatValue(
    monthKey: Ref<string>,
    nimAmount: Ref<number>,
    stakingEvents:
        | Ref<AggregatedRestakingEvent[] | undefined | null>
        | Ref<Readonly<AggregatedRestakingEvent[] | null>>,
) {
    const { currency: preferredFiatCurrency } = useFiatStore();

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
            // For current month: Use historic rates for each individual event
            const events = (stakingEvents.value || []).filter((event) =>
                event.time_window.startsWith(monthKey.value));

            if (events.length === 0) {
                fiatValue.value = 0;
                return;
            }

            const timestamps = events.map((event) => new Date(event.time_window).getTime());
            const ratesMap = await getHistoricExchangeRates(
                CryptoCurrency.NIM,
                fiatCurrency.value,
                timestamps,
                FIAT_API_PROVIDER_TX_HISTORY,
            );

            let totalFiat = 0;
            for (const event of events) {
                const timestamp = new Date(event.time_window).getTime();
                const rate = ratesMap.get(timestamp);
                if (rate === undefined) {
                    fiatValue.value = FIAT_PRICE_UNAVAILABLE;
                    return;
                }
                // Convert from Luna (1e5 = 1 NIM) to NIM, then to fiat
                totalFiat += rate * (event.aggregated_value / 1e5);
            }
            fiatValue.value = totalFiat;
        }
    };

    // Recalculate when relevant data changes
    watch([
        monthKey,
        nimAmount,
        fiatCurrency,
        () => stakingEvents.value?.length,
    ], calculateFiatValue, { lazy: false });

    return {
        fiatValue,
        fiatCurrency,
    };
}

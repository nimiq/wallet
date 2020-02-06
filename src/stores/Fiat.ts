import { createStore } from 'pinia'
import { getExchangeRates } from '@nimiq/utils';
import { CryptoCurrency, FiatCurrency } from '../lib/Constants';
import { useTransactionsStore } from './Transactions';

export const useFiatStore = createStore({
    id: 'fiat',
    state: () => ({
        currency: FiatCurrency.EUR,
        exchangeRates: {} as { [crypto: string]: { [fiat: string]: number | undefined } },
    }),
    getters: {
        currency: (state) => state.currency,
        exchangeRates: (state) => state.exchangeRates,
    },
    actions: {
        setCurrency(currency: FiatCurrency) {
            this.state.currency = currency;
            useTransactionsStore().calculateFiatAmounts();
        },

        async updateExchangeRates(failGracefully = true) {
            try {
                this.state.exchangeRates = await getExchangeRates(
                    Object.values(CryptoCurrency) as CryptoCurrency[],
                    Object.values(FiatCurrency) as FiatCurrency[],
                );
            } catch (e) {
                if (failGracefully) {
                    // eslint-disable-next-line no-console
                    console.warn('Exchange rate update failed', e);
                } else {
                    throw e;
                }
            }
        }
    },
})


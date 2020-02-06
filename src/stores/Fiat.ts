import { createStore } from 'pinia'
import { getExchangeRates } from '@nimiq/utils';
import { CryptoCurrency, FiatCurrency } from '../lib/Constants';
import { useTransactionsStore } from './Transactions';

export type FiatState = {
    currency: FiatCurrency,
    timestamp: number,
    exchangeRates: { [crypto: string]: { [fiat: string]: number | undefined } },
};

export const useFiatStore = createStore({
    id: 'fiat',
    state: (): FiatState => ({
        currency: FiatCurrency.EUR,
        timestamp: 0,
        exchangeRates: {},
    }),
    getters: {
        currency: (state) => state.currency,
        exchangeRates: (state) => state.exchangeRates,
        timestamp: (state): Readonly<number> => state.timestamp,
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
                this.state.timestamp = Date.now();
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


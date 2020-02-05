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
    getters: {},
    actions: {
        // TODO This is likely not the way to do this. We would like the store to react whenever the currency changes
        // in the state, not be forced to update the state only via an action. Additionally, there is currently a
        // mutual dependency between the transaction store and the fiat store which should be avoided according to
        // the pinia documentation.
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


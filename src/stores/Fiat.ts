import { FiatCurrency } from '../lib/Constants';
import { createStore } from 'pinia'
import { useTransactionsStore } from './Transactions';

export const useFiatStore = createStore({
    id: 'fiat',
    state: () => ({
        currency: FiatCurrency.EUR,
        exchangeRate: 0.000275, // TODO remove
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
    },
})


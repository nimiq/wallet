import { FiatCurrency } from '../lib/Constants';
import { createStore } from 'pinia'

export const useFiatStore = createStore({
    id: 'fiat',
    state: () => ({
        currency: FiatCurrency.EUR,
        exchangeRate: 0.000275,
    }),
    getters: {},
    actions: {},
})


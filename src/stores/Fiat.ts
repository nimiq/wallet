import { createStore } from 'pinia'

export enum Currencies {
    EUR,
    USD,
}

export const SYMBOLS = {
    [Currencies.EUR]: '€',
    [Currencies.USD]: '$',
}

export const useFiatStore = createStore({
    id: 'fiat',
    state: () => ({
        currency: Currencies.EUR,
        exchangeRate: 0.000275,
    }),
    getters: {},
    actions: {},
})

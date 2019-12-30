import { createStore } from 'pinia'

export enum Currencies {
    EUR,
    USD,
}

export const SYMBOLS = {
    [Currencies.EUR]: '€',
    [Currencies.USD]: '$',
}

export const useFiatStore = createStore(
    // name of the store
    // it is used in devtools and allows restoring state
    'fiat',
    // a function that returns a fresh state
    () => ({
        currency: Currencies.EUR,
        exchangeRate: 0.000275,
    }),
    // optional getters
    {}
)

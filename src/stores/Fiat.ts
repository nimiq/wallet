import { createStore } from 'pinia';
import { getExchangeRates } from '@nimiq/utils';
import { CryptoCurrency, FiatCurrency } from '../lib/Constants';
import { useTransactionsStore } from './Transactions'; // eslint-disable-line import/no-cycle

export type FiatState = {
    currency: FiatCurrency,
    timestamp: number,
    exchangeRates: { [crypto: string]: { [fiat: string]: number | undefined } },
};

function guessUserCurrency() {
    const currencies = Object.values(FiatCurrency);

    // parse navigator.language which is formatted according to https://tools.ietf.org/html/bcp47#section-2.1
    const languageRegex = new RegExp(
        '^'
        + '(\\w+)' // obligatory language
        + '(?:-\\w{3,4})*' // non-capturing group for optional extlang or script subtags which are 3 to 4 chars long
        + '(?:-(\\w{2})\\b)?', // region tag which is exactly 2 chars long
        'i',
    );
    const match = navigator.language.match(languageRegex);
    if (!match) return FiatCurrency.USD;
    const [, language, region] = match;

    // Find currency by region
    if (region) {
        // Find a currency which starts by a region. From currencies supported by FiatApi, that are actually all but EUR
        const currencyRegionRegex = new RegExp(`^${region}`, 'i');
        const currencyByRegion = currencies.find((currency) => currencyRegionRegex.test(currency));
        if (currencyByRegion) return currencyByRegion;

        // check whether it's a country in the euro zone.
        const euroZoneRegex = /^(AT|BE|CY|EE|FI|FR|DE|GR|IE|IT|LV|LT|LU|MT|NL|PT|SK|SI|ES)$/i;
        if (euroZoneRegex.test(region)) return FiatCurrency.EUR;
    }

    // Check for languages in the euro zone (but leaving out some that are also spoken in other regions)
    const euroLanguageRegex = /^(de|fr|nl|el|et|fi|sv|ga|it|lv|lt|lb|mt|sk|sl)$/i;
    if (euroLanguageRegex.test(language)) return FiatCurrency.EUR;

    // Use USD by default
    return FiatCurrency.USD;
}

export const useFiatStore = createStore({
    id: 'fiat',
    state: (): FiatState => ({
        currency: guessUserCurrency(),
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
            this.updateExchangeRates();
            useTransactionsStore().calculateFiatAmounts();
        },
        async updateExchangeRates(failGracefully = true) {
            try {
                this.state.exchangeRates = await getExchangeRates(
                    [CryptoCurrency.NIM, CryptoCurrency.BTC],
                    Object.values(FiatCurrency),
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
        },
    },
});

import { createStore } from 'pinia';
import {
    getExchangeRates,
    isHistorySupportedFiatCurrency,
    isProviderSupportedFiatCurrency,
    // setCoinGeckoApiUrl,
} from '@nimiq/utils';
import {
    CryptoCurrency,
    FiatCurrency,
    FIAT_CURRENCIES_OFFERED,
    FIAT_API_PROVIDER_CURRENT_PRICES,
} from '../lib/Constants';
import { useTransactionsStore } from './Transactions';
import { useBtcTransactionsStore } from './BtcTransactions';
import { useUsdcTransactionsStore } from './UsdcTransactions';

export type FiatState = {
    currency: FiatCurrency,
    timestamp: number,
    exchangeRates: { [crypto: string]: { [fiat: string]: number | undefined } },
};

// Use CoinGecko via a proxy.
// setCoinGeckoApiUrl('https://nq-coingecko-proxy.deno.dev/api/v3');

export function guessUserCurrency(regionOverwrite?: string) {
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
    let [, language, region] = match;

    if (regionOverwrite) {
        region = regionOverwrite;
    }

    // Find currency by region
    if (region) {
        // Find a currency which starts by a region. From currencies supported by FiatApi, that are actually most, see
        // getFiatCurrencyCountry in Settings.vue.
        const currencyRegionRegex = new RegExp(`^${region}`, 'i');
        const currencyByRegion = FIAT_CURRENCIES_OFFERED.find((currency) => currencyRegionRegex.test(currency));
        if (currencyByRegion) return currencyByRegion;

        // check whether it's a country in the euro zone.
        const euroZoneRegex = /^(AT|BE|CY|EE|FI|FR|DE|GR|HR|IE|IT|LV|LT|LU|MT|NL|PT|SK|SI|ES)$/i;
        if (euroZoneRegex.test(region)) return FiatCurrency.EUR;
    }

    // Check for languages in the euro zone (but leaving out some that are also spoken in other regions)
    const euroLanguageRegex = /^(de|fr|nl|el|et|fi|sv|ga|hr|it|lv|lt|lb|mt|sk|sl)$/i;
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
            useBtcTransactionsStore().calculateFiatAmounts();
            useUsdcTransactionsStore().calculateFiatAmounts();
        },
        async updateExchangeRates(failGracefully = true) {
            try {
                const currentCurrency = this.state.currency;
                const isCurrentCurrencyHistorySupported = isHistorySupportedFiatCurrency(
                    currentCurrency,
                    // Not FIAT_API_PROVIDER_TX_HISTORY because we're checking here whether the provider for current
                    // exchange rates does not hypothetically support historic rates for the current currency, in which
                    // case it's a currency bridged via the CPL API, which does not support historic rates.
                    FIAT_API_PROVIDER_CURRENT_PRICES,
                );
                const currenciesToUpdate = FIAT_CURRENCIES_OFFERED.filter((currency) => currency === currentCurrency
                    // Include all provider supported currencies, as at least one always has to be fetched via the
                    // provider api, either because it's a directly supported currency, or because it's a currency
                    // bridged via USD, also fetched from the provider, and fetching multiple currencies vs. only
                    // one still counts as only one api request.
                    || isProviderSupportedFiatCurrency(currency, FIAT_API_PROVIDER_CURRENT_PRICES)
                    // If our current currency is not history enabled, it's a currency bridged via CPL, in which case we
                    // can include all other CPL bridged currencies without additional api requests.
                    || (!isCurrentCurrencyHistorySupported
                        && !isHistorySupportedFiatCurrency(currency, FIAT_API_PROVIDER_CURRENT_PRICES)),
                );
                this.state.exchangeRates = await getExchangeRates(
                    [CryptoCurrency.NIM, CryptoCurrency.BTC, CryptoCurrency.USDC],
                    currenciesToUpdate,
                    FIAT_API_PROVIDER_CURRENT_PRICES,
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

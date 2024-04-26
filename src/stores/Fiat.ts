import { createStore } from 'pinia';
import {
    Provider,
    RateType,
    getExchangeRates,
    isProviderSupportedFiatCurrency,
    isBridgedFiatCurrency,
    isHistorySupportedFiatCurrency,
    // setCoinGeckoApiUrl,
} from '@nimiq/utils';
import {
    CryptoCurrency,
    FiatCurrency,
    FiatCurrencyOffered,
    FIAT_CURRENCIES_OFFERED,
    FIAT_API_PROVIDER_CURRENT_PRICES,
} from '../lib/Constants';
import { useTransactionsStore } from './Transactions';
import { useBtcTransactionsStore } from './BtcTransactions';
import { useUsdcTransactionsStore } from './UsdcTransactions';

export type FiatState = {
    currency: FiatCurrencyOffered,
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
        setCurrency(currency: FiatCurrencyOffered) {
            this.state.currency = currency;
            this.updateExchangeRates();
            useTransactionsStore().calculateFiatAmounts();
            useBtcTransactionsStore().calculateFiatAmounts();
            useUsdcTransactionsStore().calculateFiatAmounts();
        },
        async updateExchangeRates(failGracefully = true) {
            try {
                const currentCurrency = this.state.currency;
                // If a currency is bridged, but not by a bridge that supports historic rates, it's bridged via CPL Api.
                const isCplBridgedFiatCurrency = (currency: FiatCurrency) => isBridgedFiatCurrency(
                    currency,
                    FIAT_API_PROVIDER_CURRENT_PRICES,
                    RateType.CURRENT,
                ) && !isHistorySupportedFiatCurrency(currency, FIAT_API_PROVIDER_CURRENT_PRICES);
                const isCurrentCurrencyCplBridged = isCplBridgedFiatCurrency(currentCurrency);
                const prioritizedFiatCurrenciesOffered: Array<FiatCurrencyOffered> = [...new Set<FiatCurrencyOffered>([
                    // As we limit the currencies we fetch for CryptoCompare to 25, prioritize a few currencies, we'd
                    // prefer to be included, roughly the highest market cap currencies according to fiatmarketcap.com,
                    // plus some smaller currencies for which Nimiq has strong communities.
                    currentCurrency,
                    ...(['USD', 'CNY', 'EUR', 'JPY', 'GBP', 'KRW', 'INR', 'CAD', 'HKD', 'BRL', 'AUD', 'CRC', 'GMD',
                        'XOF'] as const).map((ticker) => FiatCurrency[ticker]),
                    // After that, prefer to include currencies CryptoCompare supports historic rates for, because it is
                    // for CryptoCompare that we limit the number of currencies to update. For CoinGecko, all currencies
                    // can be updated in a single request.
                    ...FIAT_CURRENCIES_OFFERED.filter((currency) => isProviderSupportedFiatCurrency(
                        currency,
                        Provider.CryptoCompare,
                        RateType.HISTORIC,
                    )),
                    // Finally, all the remaining currencies
                    ...FIAT_CURRENCIES_OFFERED,
                ])];
                const currenciesToUpdate: Array<FiatCurrencyOffered> = [];
                for (const currency of prioritizedFiatCurrenciesOffered) {
                    if (currency !== currentCurrency
                        // Include all provider supported currencies, as at least one always has to be fetched via the
                        // provider api, either because it's a directly supported currency, or because it's a currency
                        // bridged via USD, also fetched from the provider, and fetching multiple currencies vs. only
                        // one still counts as only one api request.
                        && !isProviderSupportedFiatCurrency(
                            currency,
                            FIAT_API_PROVIDER_CURRENT_PRICES,
                            RateType.CURRENT,
                        )
                        // If current currency is a CPL bridged currency, we can include other CPL bridged currencies
                        // without additional API request.
                        && !(isCurrentCurrencyCplBridged && isCplBridgedFiatCurrency(currency))
                    ) continue; // omit currency
                    currenciesToUpdate.push(currency);
                    // @ts-expect-error provider check on purpose as we might want to change it in the future
                    if (FIAT_API_PROVIDER_CURRENT_PRICES === Provider.CryptoCompare
                        && currenciesToUpdate.length >= 25) {
                        // CryptoCompare only allows 25 currencies per request, and we don't want to send more than one.
                        break;
                    }
                }
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

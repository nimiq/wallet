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

const CRYPTO_CURRENCIES = new Set([
    CryptoCurrency.NIM,
    CryptoCurrency.BTC,
    CryptoCurrency.USDC,
    CryptoCurrency.USDT,
]);

function areSetsEqual(a: Set<unknown>, b: Set<unknown>): boolean {
    return a === b || (a.size === b.size && [...a].every((entry) => b.has(entry)));
}

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

class ExchangeRateRequest {
    private static TIME_THRESHOLD_SKIPPABLE_REQUEST = 1.5 * 60 * 1000;

    private result: ReturnType<typeof this.execute> | undefined;
    private failed = false;
    private finishTime = -1;
    constructor(
        private readonly cryptoCurrencies: Set<CryptoCurrency>,
        private readonly vsCurrencies: Set<FiatCurrencyOffered>,
        private readonly failGracefully: boolean,
    ) {}

    get finished() {
        return this.finishTime !== -1;
    }

    async execute(): Promise<Record<CryptoCurrency, Record<FiatCurrencyOffered, number | undefined>> | undefined> {
        if (this.result) return this.result.catch((e) => this.failGracefully ? undefined : Promise.reject(e));
        try {
            this.result = getExchangeRates(
                [...this.cryptoCurrencies],
                [...this.vsCurrencies],
                FIAT_API_PROVIDER_CURRENT_PRICES,
            );
            return await this.result;
        } catch (e) {
            this.failed = true;
            if (!this.failGracefully) throw e;
            // eslint-disable-next-line no-console
            console.warn('Exchange rate request failed', e);
            return undefined;
        } finally {
            this.finishTime = Date.now();
        }
    }

    canSkip(previousRequest: ExchangeRateRequest): boolean {
        if (!areSetsEqual(this.cryptoCurrencies, previousRequest.cryptoCurrencies)
            || !areSetsEqual(this.vsCurrencies, previousRequest.vsCurrencies)) return false; // different currencies
        if (!previousRequest.finished) return true; // let previous request finish instead of issuing a new one
        return !previousRequest.failed
            && Date.now() - previousRequest.finishTime < ExchangeRateRequest.TIME_THRESHOLD_SKIPPABLE_REQUEST;
    }
}

let lastExchangeRateRequest: ExchangeRateRequest | undefined;

export const useFiatStore = createStore({
    id: 'fiat',
    state: (): FiatState => ({
        currency: guessUserCurrency(),
        timestamp: 0, // Time when the exchange rates were retrieved
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
            const currentCurrency = this.state.currency;
            // If a currency is bridged, but not by a bridge that supports historic rates, it's bridged via CPL Api.
            const isCplBridgedFiatCurrency = (currency: FiatCurrency) => isBridgedFiatCurrency(
                currency,
                FIAT_API_PROVIDER_CURRENT_PRICES,
                RateType.CURRENT,
            ) && !isHistorySupportedFiatCurrency(currency, FIAT_API_PROVIDER_CURRENT_PRICES);
            const isCurrentCurrencyCplBridged = isCplBridgedFiatCurrency(currentCurrency);
            const prioritizedFiatCurrenciesOffered: Array<FiatCurrencyOffered> = [...new Set<FiatCurrencyOffered>([
                // As we limit the currencies we fetch for CryptoCompare to 25, prioritize a few currencies, we'd prefer
                // to be included, roughly the highest market cap currencies according to fiatmarketcap.com, plus some
                // smaller currencies for which Nimiq has strong communities.
                currentCurrency,
                ...(['USD', 'CNY', 'EUR', 'JPY', 'GBP', 'KRW', 'INR', 'CAD', 'HKD', 'BRL', 'AUD', 'CRC', 'GMD',
                    'XOF'] as const).map((ticker) => FiatCurrency[ticker]),
                // After that, prefer to include currencies CryptoCompare supports historic rates for, because it is for
                // CryptoCompare that we limit the number of currencies to update. For CoinGecko, all currencies can be
                // updated in a single request.
                ...FIAT_CURRENCIES_OFFERED.filter((currency) => isProviderSupportedFiatCurrency(
                    currency,
                    Provider.CryptoCompare,
                    RateType.HISTORIC,
                )),
                // Finally, all the remaining currencies
                ...FIAT_CURRENCIES_OFFERED,
            ])];
            const currenciesToUpdate = new Set<FiatCurrencyOffered>();
            let providerCurrenciesToUpdateCount = 0;
            for (const currency of prioritizedFiatCurrenciesOffered) {
                const isProviderCurrency = isProviderSupportedFiatCurrency(
                    currency,
                    FIAT_API_PROVIDER_CURRENT_PRICES,
                    RateType.CURRENT,
                );
                if (currency !== currentCurrency
                    && (
                        // Include all provider supported currencies, as at least one always has to be fetched via the
                        // provider api, either because it's a directly supported currency, or because it's a currency
                        // bridged via USD, also fetched from the provider, and fetching multiple currencies vs. only
                        // one still counts as only one api request, as long as we're not above the limit of currencies
                        // that can be fetched in a single request, see next condition.
                        !isProviderCurrency
                        // CryptoCompare only allows 25 currencies per request, and we don't want to send more than one.
                        || (
                            FIAT_API_PROVIDER_CURRENT_PRICES === Provider.CryptoCompare
                            && providerCurrenciesToUpdateCount >= 25
                        )
                    )
                    // If current currency is a CPL bridged currency, we can include other CPL bridged currencies
                    // without additional API request.
                    && !(isCurrentCurrencyCplBridged && isCplBridgedFiatCurrency(currency))
                ) continue; // omit currency
                currenciesToUpdate.add(currency);
                if (isProviderCurrency) {
                    providerCurrenciesToUpdateCount++;
                }
            }
            const exchangeRateRequest = new ExchangeRateRequest(
                CRYPTO_CURRENCIES,
                currenciesToUpdate,
                failGracefully,
            );
            if (!!lastExchangeRateRequest && exchangeRateRequest.canSkip(lastExchangeRateRequest)) {
                // Skip duplicate requests within ExchangeRateRequest.TIME_THRESHOLD_SKIPPABLE_REQUEST. Such can happen
                // for example on currency changes via setCurrency that result in the same currenciesToUpdate, or if an
                // update scheduled in main.ts is requested soon after changing the currency.
                return;
            }
            lastExchangeRateRequest = exchangeRateRequest;
            const exchangeRates = await exchangeRateRequest.execute();
            if (!exchangeRates
                || (lastExchangeRateRequest !== exchangeRateRequest && lastExchangeRateRequest.finished)) {
                // Failed to retrieve exchange rates, and we failed gracefully, or a different request was issued in the
                // meantime, which already finished, such that we don't want to override its result.
                return;
            }
            this.state.exchangeRates = exchangeRates;
            this.state.timestamp = Date.now();
        },
    },
});

import { FiatCurrency, Provider } from '@nimiq/utils';

export { FiatCurrency };
export { CryptoCurrency } from '@nimiq/utils';

export const CASHLINK_ADDRESS = 'cashlink';
export const BANK_ADDRESS = 'bank';

export const ENV_MAIN = 'main';
export const ENV_TEST = 'test';
export const ENV_DEV = 'dev';

// Manually curated list of fiat currencies to offer in the Wallet. Arguably somewhat arbitrary.
export const FIAT_CURRENCIES_OFFERED = ([
    'AED', 'ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'CRC', 'CZK', 'DKK', 'EUR', 'GBP', 'GMD', 'GTQ', 'HKD',
    'HUF', 'IDR', 'ILS', 'INR', 'JPY', 'KRW', 'MXN', 'MYR', 'NGN', 'NOK', 'NZD', 'PHP', 'PKR', 'PLN', 'RUB', 'SEK',
    'SGD', 'THB', 'TRY', 'TWD', 'UAH', 'USD', 'VND', 'XOF', 'ZAR',
] as const).map((ticker) => FiatCurrency[ticker]);
export type FiatCurrencyOffered = (typeof FIAT_CURRENCIES_OFFERED)[number];

// Using CryptoCompare and CryptoCompareLegacy in tandem for load balancing and increasing our effective rate limits, as
// both track usages separately. For historic rates and price charts, use the new CryptoCompare API, as historic rates
// in the legacy API seem to be inaccurate as of Nov 2024. For current rates though, use of the legacy API is fine, as
// rates between both APIs did typically not deviate more than 0.1% in our experiments.
// Not using CoinGecko currently, as it seems to have completely disabled access to their public API without API token
// as of July 2, 2024, at least on our Wallet domain. On requests without a domain e.g. via curl / localhost it seems to
// still be working. If we'd want to balance requests between CryptoCompare and CoinGecko, CoinGecko requests can be run
// through a proxy which forwards requests, by setting a custom CoinGecko endpoint via setCoinGeckoApiUrl.
export const FIAT_API_PROVIDER_CURRENT_PRICES = Provider.CryptoCompareLegacy;
export const FIAT_API_PROVIDER_PRICE_CHART = Provider.CryptoCompare;
export const FIAT_API_PROVIDER_TX_HISTORY = Provider.CryptoCompare;

export const FIAT_PRICE_UNAVAILABLE = null;

export const BTC_ADDRESS_GAP = 10; // TODO: Update to standard 20
export const BTC_MAX_COPYABLE_ADDRESSES = 5; // TODO: Update to 10 when BTC_ADDRESS_GAP is set to 20
export const BTC_UNCOPYABLE_ADDRESS_GAP = 1;
export const BTC_DUST_LIMIT = 546; // satoshis

export const OASIS_EUR_DETECTION_DELAY = 5; // minutes

// LocalStorage flag used to determine whether the new welcome screen should be shown, ignoring whether the
// original welcome screen was already shown.
export const WELCOME_MODAL_LOCALSTORAGE_KEY = 'welcome-2-modal-shown';
export const WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY = 'welcome-staking-modal-shown';

// Albatross
// export const BATCH_LENGTH = 60;
// export const BATCHES_PER_EPOCH = 720;
// export const EPOCH_LENGTH = BATCH_LENGTH * BATCHES_PER_EPOCH;
export const MIN_STAKE = 100e5;

export const STAKING_CONTRACT_ADDRESS = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';

// Pre-Staking
export const BURNER_ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';

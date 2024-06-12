import { FiatCurrency, Provider } from '@nimiq/utils';

export { FiatCurrency };
export { CryptoCurrency } from '@nimiq/utils';

export const CASHLINK_ADDRESS = 'cashlink';
export const BANK_ADDRESS = 'bank';

export const ENV_MAIN = 'main';
export const ENV_TEST = 'test';
export const ENV_DEV = 'dev';

export const MAINNET_ORIGIN = 'https://wallet.nimiq.com';
export const TESTNET_ORIGIN = window.location.hostname === 'localhost' || window.location.hostname === 'bs-local.com'
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : 'https://wallet.nimiq-testnet.com';

// Manually curated list of fiat currencies to offer in the Wallet. Arguably somewhat arbitrary.
export const FIAT_CURRENCIES_OFFERED = ([
    'AED', 'ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'CRC', 'CZK', 'DKK', 'EUR', 'GBP', 'GMD', 'GTQ', 'HKD',
    'HUF', 'IDR', 'ILS', 'INR', 'JPY', 'KRW', 'MXN', 'MYR', 'NGN', 'NOK', 'NZD', 'PHP', 'PKR', 'PLN', 'RUB', 'SEK',
    'SGD', 'THB', 'TRY', 'TWD', 'UAH', 'USD', 'VND', 'XOF', 'ZAR',
] as const).map((ticker) => FiatCurrency[ticker]);
export type FiatCurrencyOffered = (typeof FIAT_CURRENCIES_OFFERED)[number];

// Not using CoinGecko currently, as it seems to have completely disabled access to their public API without API token
// as of July 2, 2024, at least on our Wallet domain. On requests without a domain e.g. via curl / localhost it seems to
// still be working. If we'd want to balance requests between CryptoCompare and CoinGecko, CoinGecko requests can be run
// through a proxy which forwards requests, by setting a custom CoinGecko endpoint via setCoinGeckoApiUrl.
export const FIAT_API_PROVIDER_CURRENT_PRICES = Provider.CryptoCompare;
export const FIAT_API_PROVIDER_PRICE_CHART = Provider.CryptoCompare;
export const FIAT_API_PROVIDER_TX_HISTORY = Provider.CryptoCompare;

export const FIAT_PRICE_UNAVAILABLE = null;

export const BTC_ADDRESS_GAP = 10; // TODO: Update to standard 20
export const BTC_MAX_COPYABLE_ADDRESSES = 5; // TODO: Update to 10 when BTC_ADDRESS_GAP is set to 20
export const BTC_UNCOPYABLE_ADDRESS_GAP = 1;
export const BTC_DUST_LIMIT = 546; // satoshis

export const OASIS_EUR_DETECTION_DELAY = 5; // minutes
export const OASIS_CRC_DETECTION_DELAY = 5; // minutes

// LocalStorage flag used to determine whether the new welcome screen should be shown, ignoring whether the
// original welcome screen was already shown.
export const WELCOME_MODAL_LOCALSTORAGE_KEY = 'welcome-2-modal-shown';

// Pre-Staking
export const MIN_PRESTAKE = 100e5;
export const BURNER_ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';

// Parameters for first testnet migration test
// Taken from https://github.com/nimiq/core-rs-albatross/blob/albatross/pow-migration/src/lib.rs
export const PRESTAKING_BLOCK_H_START = 3023730; // 2024-04-19 00:00
export const PRESTAKING_BLOCK_H_END = 3028050; // 2024-04-22 00:00

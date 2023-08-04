import { FiatCurrency, Provider } from '@nimiq/utils';

export { FiatCurrency };
export { CryptoCurrency } from '@nimiq/utils';

export const CASHLINK_ADDRESS = 'cashlink';
export const BANK_ADDRESS = 'bank';

export const ENV_MAIN = 'main';
export const ENV_TEST = 'test';
export const ENV_DEV = 'dev';

// export const MAINNET_ORIGIN = 'https://wallet.nimiq.com';//
// export const TESTNET_ORIGIN = window.location.hostname === 'localhost' || window.location.hostname === 'bs-local.com'
//     ? `${window.location.protocol}//${window.location.hostname}:8081`
//     : 'https://wallet.nimiq-testnet.com';
// export const DEVNET_ORIGIN = window.location.hostname === 'localhost'
//     ? 'http://localhost:8082'
//     : process.env.VUE_APP_HUB_URL!.replace('hub', 'wallet');

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

// LocalStorage flag used to determine whether the new welcome screen should be shown, ignoring whether the
// original welcome screen was already shown.
export const WELCOME_MODAL_LOCALSTORAGE_KEY = 'welcome-2-modal-shown';

// Albatross
export const BATCH_LENGTH = 60;
export const BATCHES_PER_EPOCH = 360;
export const GENESIS_BLOCK_HEIGHT = 0;
export const EPOCH_LENGTH = BATCH_LENGTH * BATCHES_PER_EPOCH;

export function nextElectionBlock(height: number): number {
    return Math.floor((height - GENESIS_BLOCK_HEIGHT) / EPOCH_LENGTH + 1) * EPOCH_LENGTH;
}

export const STAKING_CONTRACT_ADDRESS = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';
export const STAKING_ACCOUNT_TYPE = 3;
export const StakingTransactionType = {
    UNSTAKE: 1,

    CREATE_STAKER: 5,
    ADD_STAKE: 6,
    UPDATE_STAKER: 7,
    SET_INACTIVE_STAKE: 8,
};

// Pre-Staking
export const BURNER_ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';

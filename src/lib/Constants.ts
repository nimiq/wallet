export {
    FiatApiSupportedFiatCurrency as FiatCurrency,
    FiatApiSupportedCryptoCurrency as CryptoCurrency,
} from '@nimiq/utils';

export const FIAT_PRICE_UNAVAILABLE = null;
export const CASHLINK_ADDRESS = 'cashlink';

export const ENV_MAIN = 'main';
export const ENV_TEST = 'test';
export const ENV_DEV = 'dev';

export const MAINNET_ORIGIN = 'https://wallet.nimiq.com';
export const TESTNET_ORIGIN = 'https://wallet.nimiq-testnet.com';

export const FIAT_CURRENCY_DENYLIST = [
    'BDT', 'BHD', 'BMD', 'KWD', 'LKR', 'MMK', 'SAR',
];

export const BTC_ADDRESS_GAP = 5; // TODO: Update to standard 20

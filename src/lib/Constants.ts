export {
    FiatApiSupportedFiatCurrency as FiatCurrency,
    FiatApiSupportedCryptoCurrency as CryptoCurrency,
} from '@nimiq/utils';

export const FIAT_PRICE_UNAVAILABLE = null;
export const CASHLINK_ADDRESS = 'cashlink';
export const BANK_ADDRESS = 'bank';

export const ENV_MAIN = 'main';
export const ENV_TEST = 'test';
export const ENV_DEV = 'dev';

export const MAINNET_ORIGIN = 'https://wallet.nimiq.com';
export const TESTNET_ORIGIN = 'https://wallet.nimiq-testnet.com';

export const FIAT_CURRENCY_DENYLIST = [
    'BDT', 'BHD', 'BMD', 'KWD', 'LKR', 'MMK', 'SAR',
];

export const BTC_ADDRESS_GAP = 10; // TODO: Update to standard 20
export const BTC_MAX_COPYABLE_ADDRESSES = 5; // TODO: Update to 10 when BTC_ADDRESS_GAP is set to 20
export const BTC_UNCOPYABLE_ADDRESS_GAP = 1;

export const OASIS_EUR_DETECTION_DELAY = 5; // minutes

export const WELCOME_MODAL_LOCALSTORAGE_KEY = 'welcome-modal-shown';

export const NIM_DECIMALS = 5;
export const NIM_MAGNITUDE = 1e5;

export const STAKING_CONTRACT_ADDRESS = 'NQ38 STAK 1NG0 0000 0000 C0NT RACT 0000 0000';
export const STAKING_ACCOUNT_TYPE = 3;
export const StakingTransactionType = {
    CREATE_STAKER: 5,
    STAKE: 6,
    UPDATE_STAKER: 7,
    RETIRE_STAKER: 8,
    REACTIVATE_STAKER: 9,
}

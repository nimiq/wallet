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

// export const MAINNET_ORIGIN = 'https://wallet.nimiq.com';//
// export const TESTNET_ORIGIN = window.location.hostname === 'localhost' || window.location.hostname === 'bs-local.com'
//     ? `${window.location.protocol}//${window.location.hostname}:8081`
//     : 'https://wallet.nimiq-testnet.com';
// export const DEVNET_ORIGIN = window.location.hostname === 'localhost'
//     ? 'http://localhost:8082'
//     : process.env.VUE_APP_HUB_URL!.replace('hub', 'wallet');

export const FIAT_CURRENCY_DENYLIST = [
    'BDT', 'BHD', 'BMD', 'KWD', 'LKR', 'MMK', 'SAR',
];

export const BTC_ADDRESS_GAP = 10; // TODO: Update to standard 20
export const BTC_MAX_COPYABLE_ADDRESSES = 5; // TODO: Update to 10 when BTC_ADDRESS_GAP is set to 20
export const BTC_UNCOPYABLE_ADDRESS_GAP = 1;
export const BTC_DUST_LIMIT = 546; // satoshis

export const OASIS_EUR_DETECTION_DELAY = 5; // minutes

// LocalStorage flag used to determine whether the new welcome screen should be shown, ignoring whether the
// original welcome screen was already shown.
export const WELCOME_MODAL_LOCALSTORAGE_KEY = 'welcome-2-modal-shown';

// Albatross
// export const BATCH_LENGTH = 60;
// export const BATCHES_PER_EPOCH = 360;
// export const EPOCH_LENGTH = BATCH_LENGTH * BATCHES_PER_EPOCH;

// export function nextElectionBlock(height: number): number {
//     return Math.floor(height / EPOCH_LENGTH + 1) * EPOCH_LENGTH;
// }

export const STAKING_CONTRACT_ADDRESS = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';
export const STAKING_ACCOUNT_TYPE = 3;
export const StakingTransactionType = {
    UNSTAKE: 1,

    CREATE_STAKER: 5,
    STAKE: 6,
    UPDATE_STAKER: 7,
};

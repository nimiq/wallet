import posthog from 'posthog-js';
import { useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { CryptoCurrency } from './Constants';

// --------------- Initialisation ---------------

export function initPostHog(apiKey: string, apiHost: string) {
    posthog.init(apiKey, {
        api_host: apiHost,
        // Disable automatic capture of page views, clicks, etc. – we only track explicit events.
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        // Do not persist the anonymous user ID across sessions so that the tracking is fully anonymous.
        persistence: 'memory',
        // Do not send any device / browser metadata that could be used to fingerprint users.
        disable_session_recording: true,
    });
}

// --------------- Event names ---------------

export const enum PostHogEvent {
    ACCOUNT_SIGNUP = 'account_signup',
    ACCOUNT_LOGIN = 'account_login',
    TRANSACTION_SENT_NIM = 'transaction_sent_nim',
    TRANSACTION_SENT_BTC = 'transaction_sent_btc',
    TRANSACTION_SENT_USDC = 'transaction_sent_usdc',
    TRANSACTION_SENT_USDT = 'transaction_sent_usdt',
    SWAP_INITIATED = 'swap_initiated',
    ACCOUNT_SWITCHED = 'account_switched',
    APP_STARTED = 'app_started',
}

// --------------- Helper: collect balance flags for the active account ---------------

type BalanceFlags = {
    hasNimBalance: boolean,
    hasBtcBalance: boolean,
    hasUsdcBalance: boolean,
    hasUsdtBalance: boolean,
};

function getActiveAccountBalanceFlags(): BalanceFlags {
    const { accountBalance: nimBalance } = useAddressStore();
    const { accountBalance: btcBalance } = useBtcAddressStore();
    const { accountUsdcBalance, accountUsdtBridgedBalance } = usePolygonAddressStore();

    return {
        hasNimBalance: (nimBalance.value || 0) > 0,
        hasBtcBalance: (btcBalance.value || 0) > 0,
        hasUsdcBalance: (accountUsdcBalance.value || 0) > 0,
        hasUsdtBalance: (accountUsdtBridgedBalance.value || 0) > 0,
    };
}

// --------------- Tracking functions ---------------

/**
 * Fired when a user creates a brand-new account (signup).
 */
export function trackAccountSignup() {
    posthog.capture(PostHogEvent.ACCOUNT_SIGNUP);
}

/**
 * Fired when a user logs in to an existing account.
 */
export function trackAccountLogin() {
    posthog.capture(PostHogEvent.ACCOUNT_LOGIN);
}

/**
 * Fired when a NIM transaction is successfully submitted.
 */
export function trackNimTransactionSent() {
    posthog.capture(PostHogEvent.TRANSACTION_SENT_NIM);
}

/**
 * Fired when a BTC transaction is successfully submitted.
 */
export function trackBtcTransactionSent() {
    posthog.capture(PostHogEvent.TRANSACTION_SENT_BTC);
}

/**
 * Fired when a USDC transaction is successfully submitted.
 */
export function trackUsdcTransactionSent() {
    posthog.capture(PostHogEvent.TRANSACTION_SENT_USDC);
}

/**
 * Fired when a USDT transaction is successfully submitted.
 */
export function trackUsdtTransactionSent() {
    posthog.capture(PostHogEvent.TRANSACTION_SENT_USDT);
}

/**
 * Fired when a swap is successfully signed and submitted to the watchtower.
 * @param fromAsset  The asset being sold (e.g. 'NIM', 'BTC').
 * @param toAsset    The asset being bought.
 */
export function trackSwapInitiated(fromAsset: string, toAsset: string) {
    posthog.capture(PostHogEvent.SWAP_INITIATED, {
        from_asset: fromAsset,
        to_asset: toAsset,
    });
}

/**
 * Fired when the user switches to a different account.
 * Includes the number of NIM addresses on the newly selected account and whether each balance is non-zero.
 */
export function trackAccountSwitched() {
    const { accountNimAddresses, accountInfos } = useAccountStore();
    posthog.capture(PostHogEvent.ACCOUNT_SWITCHED, {
        account_count: Object.keys(accountInfos.value).length,
        nim_address_count: (accountNimAddresses.value as string[]).length,
        ...getActiveAccountBalanceFlags(),
    });
}

/**
 * Fired once on application start.
 * Includes the total number of accounts logged in, the total number of NIM addresses across all accounts,
 * and balance flags for the initially selected account.
 */
export function trackAppStarted() {
    const { accountInfos } = useAccountStore();
    const accounts = Object.values(accountInfos.value);
    const totalNimAddresses = accounts.reduce(
        (sum, account) => sum + account.addresses.length,
        0,
    );

    posthog.capture(PostHogEvent.APP_STARTED, {
        account_count: accounts.length,
        nim_address_count: totalNimAddresses,
        ...getActiveAccountBalanceFlags(),
    });
}

/**
 * Fired when the stablecoin (USDC or USDT) selection is inferred from the account switch context.
 * Used internally to provide the correct currency label in {@link trackUsdcTransactionSent} /
 * {@link trackUsdtTransactionSent}.
 */
export function trackStablecoinTransactionSent(currency: CryptoCurrency.USDC | CryptoCurrency.USDT) {
    if (currency === CryptoCurrency.USDC) {
        trackUsdcTransactionSent();
    } else {
        trackUsdtTransactionSent();
    }
}

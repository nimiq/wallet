import posthog from 'posthog-js';
import type { BeforeSendFn } from 'posthog-js';
import { useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { CryptoCurrency } from './Constants';

// --------------- Privacy: scrub sensitive path segments from URL-like properties ---------------

// PostHog automatically attaches URL-like properties (e.g. `$current_url`, `$pathname`,
// `$referrer`) to every event. Wallet routes can contain transaction hashes and addresses
// (e.g. `/transaction/:hash`, `/nimiq:NQ07...`), which would otherwise leak into analytics.
// The `before_send` hook below redacts any path segment that looks like a Nimiq address,
// an EVM address / hash, or a raw hex identifier.
const URL_LIKE_PROPERTIES = [
    '$current_url',
    '$pathname',
    '$referrer',
    '$initial_current_url',
    '$initial_pathname',
    '$initial_referrer',
] as const;

const REDACTED = '[redacted]';

function isSensitivePathSegment(segment: string): boolean {
    if (!segment) return false;
    // Nimiq addresses: "NQxx ...", case-insensitive for safety.
    if (/^NQ/i.test(segment)) return true;
    // EVM addresses (0x + 40 hex) and tx hashes (0x + 64 hex).
    if (/^0x/i.test(segment)) return true;
    // URI-handoff routes: `/nimiq:NQ07...`, `/bitcoin:bc1...`, `/polygon:0x...`.
    // These collapse to a single path segment whose prefix is the scheme, so the
    // address/amount payload isn't caught by the NQ/0x/hex checks above.
    if (/^(?:nimiq|bitcoin|polygon):/i.test(segment)) return true;
    // Bare hex strings (e.g. NIM / BTC tx hashes). Require ≥ 8 chars to avoid
    // matching short numeric ids or hex-shaped route names like `buy`.
    if (/^[0-9a-fA-F]{8,}$/.test(segment)) return true;
    return false;
}

function scrubPath(path: string): string {
    return path
        .split('/')
        .map((seg) => (isSensitivePathSegment(seg) ? REDACTED : seg))
        .join('/');
}

function scrubUrlLikeValue(value: unknown): unknown {
    if (typeof value !== 'string' || !value) return value;
    // `$current_url` is a full URL; `$pathname` is a bare path. Try URL parsing first,
    // fall back to treating the string as a path.
    try {
        const url = new URL(value);
        url.pathname = scrubPath(url.pathname);
        return url.toString();
    } catch {
        return scrubPath(value);
    }
}

const scrubSensitivePaths: BeforeSendFn = (captureResult) => {
    if (!captureResult) return captureResult;
    for (const key of URL_LIKE_PROPERTIES) {
        if (key in captureResult.properties) {
            captureResult.properties[key] = scrubUrlLikeValue(captureResult.properties[key]);
        }
    }
    return captureResult;
};

// --------------- Initialisation ---------------

let postHogInitialized = false;

export function initPostHog(apiKey: string, apiHost: string) {
    if (postHogInitialized) return;
    postHogInitialized = true;
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
        // Strip transaction hashes and addresses from URL-like properties before sending.
        before_send: scrubSensitivePaths,
    });
}

export function isPostHogInitialized() {
    return postHogInitialized;
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
    SWAP_COMPLETED = 'swap_completed',
    SWAP_FAILED = 'swap_failed',
    HUB_REQUEST_ABORTED = 'hub_request_aborted',
    HUB_ERROR = 'hub_error',
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
 * Fired when a swap reaches the COMPLETE state (both legs settled on-chain).
 * @param fromAsset  The asset that was sold.
 * @param toAsset    The asset that was received.
 */
export function trackSwapCompleted(fromAsset: string, toAsset: string) {
    posthog.capture(PostHogEvent.SWAP_COMPLETED, {
        from_asset: fromAsset,
        to_asset: toAsset,
    });
}

/**
 * Fired when a swap fails – either because signing was rejected/errored, or because
 * the swap expired before completion.
 * @param fromAsset  The asset being sold (may be undefined if the assets are unknown).
 * @param toAsset    The asset being bought.
 * @param reason     A short string describing the failure: 'signing_error' | 'expired'.
 */
export function trackSwapFailed(fromAsset: string, toAsset: string, reason: 'signing_error' | 'expired') {
    posthog.capture(PostHogEvent.SWAP_FAILED, {
        from_asset: fromAsset,
        to_asset: toAsset,
        reason,
    });
}

/**
 * Fired when the user cancels/closes a Hub request before it completes.
 */
export function trackHubRequestAborted() {
    posthog.capture(PostHogEvent.HUB_REQUEST_ABORTED);
}

/**
 * Fired when the Hub returns an unexpected error (not a user-initiated abort).
 * @param error  The error returned by the Hub.
 */
export function trackHubError(error: Error) {
    posthog.capture(PostHogEvent.HUB_ERROR, {
        error_message: error.message,
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
 * Convenience wrapper that calls either {@link trackUsdcTransactionSent} or {@link trackUsdtTransactionSent}
 * depending on the stablecoin currency provided.
 */
export function trackStablecoinTransactionSent(currency: CryptoCurrency.USDC | CryptoCurrency.USDT) {
    if (currency === CryptoCurrency.USDC) {
        trackUsdcTransactionSent();
    } else {
        trackUsdtTransactionSent();
    }
}

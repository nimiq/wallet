import { ValidationUtils } from '@nimiq/utils';
import { useConfig } from '../composables/useConfig';
import Time from './Time';
import { i18n } from '../i18n/i18n-setup';

export enum GoCryptoPaymentStatus {
    Opened,
    InPayment, // This is the standard case when a request link is scanned.
    Paid,
    Processing,
    AutoClosed,
    Failed,
    NotValid,
    Refund,
    Cancelled,
}

export interface GoCryptoPaymentDetails {
    id: string;
    status: GoCryptoPaymentStatus;
    expiry: number; // timestamp in ms
    storeName: string;
    recipient: string;
    amount: number;
}

export function parseGoCryptoRequestLink(requestLink: string | URL) {
    const { config } = useConfig();
    if (!config.goCrypto.enabled) return null;

    const url = toUrl(requestLink);
    // Note that we don't use the rather vague Regexs provided in GoCrypto's documentation but manually implement a
    // little stricter parsing.
    if (!url || !(
        /(?:^|\.)gocrypto\.com$/i.test(url.hostname)
        || /^gocrypto:$/i.test(url.protocol) // for scanning GoCrypto deep-links
    )) return null;

    // Note: searchParams.get also url decodes the parameters already
    const merchantId = url.searchParams.get('merchant_id');
    if (merchantId && !/\w+/.test(merchantId)) return null;
    const paymentId = url.searchParams.get('gocrypto_id');
    if (paymentId && !/\w+/.test(paymentId)) return null;

    if (merchantId) {
        return { merchantId };
    }
    if (paymentId) {
        return { paymentId };
    }
    return null;
}

export async function fetchGoCryptoPaymentDetails(parsedLink: { merchantId: string } | { paymentId: string })
: Promise<GoCryptoPaymentDetails | null> {
    const { config } = useConfig();
    if (!config.goCrypto.enabled) return null;

    // Note: for querying data by merchant id for fixed QR code stickers in the shop, the documentation claims that
    // <apiEndpoint>/v3/custodial/payment?merchant_id=<merchantId> should be queried, and chapter 4 suggests that v2 is
    // to be used. However, all those URLs are invalid or at least not CORS enabled. Experimentation showed, that the
    // same url path as querying for payment ids has to be used instead: /publicapi/payment.
    const url = `${config.goCrypto.apiEndpoint}publicapi/payment?${'merchantId' in parsedLink
        ? `merchant_id=${parsedLink.merchantId}`
        : `payment_id=${parsedLink.paymentId}`}`;
    const headers = {
        // Note: As of August 2023, setting a custom user agent is possible in Firefox and Safari, but not in Chrome
        // yet, see https://bugs.chromium.org/p/chromium/issues/detail?id=571722. However, the Chrome uer agent is good
        // enough for now, according to GoCrypto.
        'User-Agent': 'Nimiq Wallet',
        Authorization: `publicauth ${config.goCrypto.apiKey}`,
        'Content-Type': 'application/json',
    };

    try {
        const [response, timeOffset] = await Promise.all([
            fetch(url, {
                headers,
                cache: 'no-cache',
                referrerPolicy: 'no-referrer',
            }),
            Time.now().then((serverTime) => serverTime - Date.now()),
        ]);
        if (!response.ok) return null;
        const data = await response.json();

        const id: string = data.id; // eslint-disable-line prefer-destructuring
        if (typeof id !== 'string' || !/\w+/.test(id)
            || ('paymentId' in parsedLink && id !== parsedLink.paymentId)) return null;

        const status: GoCryptoPaymentStatus = data.status; // eslint-disable-line prefer-destructuring
        if (typeof status !== 'number' || !Object.values(GoCryptoPaymentStatus).includes(status)) return null;

        const expiry = Date.parse(data.expires_at) - timeOffset; // convert expiry to user's clock
        if (Number.isNaN(expiry)) return null;

        const storeName: string = data.store_full_name; // eslint-disable-line prefer-destructuring
        if (typeof storeName !== 'string' || !storeName) return null;

        // Only support Nimiq because GoCrypto doesn't support USDC and BTC is only supported as Lightning on Terminals.
        const nimiqPaymentOptions = Array.isArray(data.payment_options)
            && data.payment_options.find((option: any) => !!option && option.currency_name === 'NIM');
        if (!nimiqPaymentOptions || nimiqPaymentOptions.currency !== /* GoCrypto id for Nimiq */ 207) return null;

        const recipient: string = nimiqPaymentOptions.wallet_address
            .toUpperCase() // format as uppercase
            .replace(/\s/g, '') // strip spaces and dashes
            .replace(/(.)(?=(.{4})+$)/g, '$1 '); // reformat with spaces, forming blocks of 4 chars
        if (!ValidationUtils.isValidAddress(nimiqPaymentOptions.wallet_address)) return null;

        const amount = Math.round(Number.parseFloat(nimiqPaymentOptions.amount) * 1e5);
        if (Number.isNaN(amount) || !Number.isFinite(amount)) return null;

        return {
            id,
            status,
            expiry,
            storeName,
            recipient,
            amount,
        };
    } catch (e) {
        console.error('Failed to fetch GoCrypto payment info:', e); // eslint-disable-line no-console
        return null;
    }
}

export function goCryptoStatusToUserFriendlyMessage(paymentDetails: GoCryptoPaymentDetails)
: { paymentStatus: 'pending' }
    | { paymentStatus: 'accepted', title: string }
    | { paymentStatus: 'failed', title: string, message: string } {
    const successDefaults = {
        paymentStatus: 'accepted' as const,
    };
    const errorDefaults = {
        paymentStatus: 'failed' as const,
        // Concatenate sentences to re-use individual translations.
        // eslint-disable-next-line prefer-template
        message: i18n.t('Please ask the merchant to create a new payment request.') + ' '
            + i18n.t('If you already made a payment, please contact GoCrypto for a refund.'),
    };
    switch (paymentDetails.status) {
        case GoCryptoPaymentStatus.Paid: return {
            ...successDefaults,
            title: i18n.t('Payment request has already been paid') as string,
        };
        case GoCryptoPaymentStatus.Processing: return {
            ...successDefaults,
            title: i18n.t('Your payment is being processed') as string,
        };
        case GoCryptoPaymentStatus.Failed: return {
            ...errorDefaults,
            title: i18n.t('Your payment failed') as string,
        };
        case GoCryptoPaymentStatus.NotValid: return {
            ...errorDefaults,
            title: i18n.t('Your payment is invalid') as string,
        };
        case GoCryptoPaymentStatus.Refund: return {
            ...errorDefaults,
            title: i18n.t('Your payment was refunded') as string,
            message: i18n.t('Please ask the merchant to create a new payment request.') as string,
        };
        case GoCryptoPaymentStatus.Cancelled: return {
            ...errorDefaults,
            title: i18n.t('Your payment was cancelled') as string,
        };
        default: // do nothing and continue with checks below
    }
    if (paymentDetails.status === GoCryptoPaymentStatus.AutoClosed || paymentDetails.expiry < Date.now()) {
        return {
            ...errorDefaults,
            title: i18n.t('The payment request expired') as string,
        };
    }
    // Unpaid request without any errors.
    return {
        paymentStatus: 'pending',
    };
}

function toUrl(link: string | URL): null | URL {
    if (link instanceof URL) return link;

    if (!link.includes(':')) {
        // If the link does not include a protocol, include a protocol to be parseable as URL. We assume https by
        // default, but it could be any dummy protocol. The // after the : can be omitted.
        link = `https:${link}`;
    }

    try {
        return new URL(link);
    } catch (e) {
        return null;
    }
}

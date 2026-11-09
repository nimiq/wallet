/* eslint-disable no-console */
import type { Contract } from 'ethers';
import type {
    SignedPolygonHtlcOpen,
    SignedPolygonHtlcSettlement,
} from '@nimiq/hub-api';
import { useConfig } from '../../composables/useConfig';
import { getPolygonClient, receiptToTransaction, updatePolygonBalances } from '../../ethers';
import { GASLESS_HTLC_CONTRACT_ABI } from './ContractABIs';
import { getGaslessPins, isGaslessTransferConfigured } from './Gasless';

/**
 * Gasless USDC and USDT0 HTLCs for swaps: the user signs the opening (over a token permit), the redeem or the refund of
 * an HTLC in the Keyguard (via the Hub), and the Nimiq relay submits it to the GaslessHTLC contract and pays the gas in
 * POL. Its fee is paid in the HTLC's token: on top of the HTLC amount when opening, from the HTLC amount when redeeming
 * or refunding.
 *
 * PROVISIONAL: neither the GaslessHTLC contract nor the relay's HTLC endpoints exist yet in
 * https://github.com/NimiqToolbox/gas-abstraction. Requests and responses mirror the relay's transfer API (fee quotes
 * per `operation`, POST of the signed request, GET /v1/requests/:id), and the contract is assumed to emit the events
 * of the former OpenGSN HTLC contracts. HTLC requests carry no intent nonce: an HTLC id can only be opened once and
 * settled once.
 */

export type GaslessHtlcOperation = 'htlc.open' | 'htlc.redeem' | 'htlc.refund';

export type GaslessHtlcFeeQuote = {
    fee: string,
    relay: string,
    /** The gas price of the quote, in wei. */
    gasPrice: string,
    /** The POL/USD price of the quote, as a decimal number string. */
    polUsd: string,
};

type RelayRequestState = {
    id: string,
    status: 'queued' | 'submitted' | 'mined' | 'confirmed' | 'failed' | 'expired',
    txHash: string | null,
    error: { code: string, message: string } | null,
};

export function isGaslessHtlcConfigured() {
    const { config } = useConfig();
    return isGaslessTransferConfigured() && !!config.polygon.gasless.htlcContract;
}

function relayUrl(path: string) {
    const { config } = useConfig();
    return `${config.polygon.gasless.relayUrl.replace(/\/+$/, '')}${path}`;
}

async function callRelay<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const response = await fetch(relayUrl(path), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
        const error = json && json.error;
        throw new Error(error && error.message
            ? `${error.message} (${error.code})`
            : `Relay request failed with HTTP status ${response.status}`);
    }
    return json as T;
}

/**
 * The relay's fee for an HTLC operation with the given token, in token units. Refuses quotes above the Wallet's
 * `maxAcceptableFee` and for relays the Wallet does not trust; the Keyguard checks the same when signing.
 */
export async function quoteGaslessHtlcFee(
    operation: GaslessHtlcOperation,
    token: string,
): Promise<GaslessHtlcFeeQuote> {
    const [pins, quote] = await Promise.all([
        getGaslessPins(),
        callRelay<GaslessHtlcFeeQuote & { operation: string, token: string }>('GET', `/v1/fee?${new URLSearchParams({
            operation,
            token,
            // Only the opening takes the token from the user's address, with a permit
            authMode: operation === 'htlc.open' ? 'permit' : 'none',
        })}`),
    ]);
    if (quote.operation !== operation || quote.token.toLowerCase() !== token.toLowerCase()) {
        throw new Error('The relay quoted a fee for something else');
    }
    if (!pins.relays.some((relay) => relay.toLowerCase() === quote.relay.toLowerCase())) {
        throw new Error('The relay quoted a fee for an unknown relay address');
    }
    const { config } = useConfig();
    if (BigInt(quote.fee) > BigInt(config.polygon.gasless.maxAcceptableFee)) {
        throw new Error('The network fee is currently too high');
    }
    return {
        fee: quote.fee,
        relay: quote.relay,
        gasPrice: quote.gasPrice,
        polUsd: quote.polUsd,
    };
}

/** Submits a signed HTLC opening. Resolves to the relay's request id. */
export async function submitGaslessHtlcOpen({ request, signature, authorization }: SignedPolygonHtlcOpen) {
    const { id } = await callRelay<{ id: string }>('POST', '/v1/htlc/open', { request, signature, authorization });
    return id;
}

/** Submits a signed HTLC redeem with the swap's secret (0x-prefixed). Resolves to the relay's request id. */
export async function submitGaslessHtlcRedeem({ request, signature }: SignedPolygonHtlcSettlement, secret: string) {
    const { id } = await callRelay<{ id: string }>('POST', '/v1/htlc/redeem', { request, signature, secret });
    return id;
}

/** Submits a signed HTLC refund. Resolves to the relay's request id. */
export async function submitGaslessHtlcRefund({ request, signature }: SignedPolygonHtlcSettlement) {
    const { id } = await callRelay<{ id: string }>('POST', '/v1/htlc/refund', { request, signature });
    return id;
}

/** Waits until the relay's request is mined. Resolves to the transaction hash. */
export async function waitForGaslessHtlcTransaction(id: string, timeoutMs = 3 * 60e3): Promise<string> {
    const until = Date.now() + timeoutMs;
    for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const state = await callRelay<RelayRequestState>('GET', `/v1/requests/${id.toLowerCase()}`).catch((error) => {
            // Transient errors are retried until the timeout
            console.warn('Could not get the relay request state', id, error);
            return null;
        });
        if (state && (state.status === 'mined' || state.status === 'confirmed') && state.txHash) return state.txHash;
        if (state && (state.status === 'failed' || state.status === 'expired')) {
            throw new Error(state.error ? state.error.message : `The relay request ${state.status}`);
        }
        if (Date.now() > until) throw new Error('The transaction was not mined in time');
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => { setTimeout(resolve, 2000); });
    }
}

async function minedTransaction(id: string, token: string, filterByFromAddress?: string) {
    const txHash = await waitForGaslessHtlcTransaction(id);
    const client = await getPolygonClient();
    const receipt = await client.provider.waitForTransaction(txHash, 1);
    return receiptToTransaction(token, receipt, filterByFromAddress);
}

/** Opens an HTLC with the signed opening. Resolves to the mined transaction. */
export async function sendGaslessHtlcOpen(signed: SignedPolygonHtlcOpen) {
    const { token, from } = signed.request;
    const tx = await minedTransaction(await submitGaslessHtlcOpen(signed), token, from);
    // Trigger manual balance update for outgoing transactions
    updatePolygonBalances(token, [from]);
    return tx;
}

/** Redeems an HTLC of the given token with the signed redeem and the secret. Resolves to the mined transaction. */
export async function sendGaslessHtlcRedeem(signed: SignedPolygonHtlcSettlement, secret: string, token: string) {
    return minedTransaction(await submitGaslessHtlcRedeem(signed, secret), token);
}

/** Refunds an HTLC of the given token with the signed refund. Resolves to the mined transaction. */
export async function sendGaslessHtlcRefund(signed: SignedPolygonHtlcSettlement, token: string) {
    return minedTransaction(await submitGaslessHtlcRefund(signed), token);
}

/**
 * The swap HTLC contract for the swap handler and the history, with the events of the former OpenGSN HTLC contracts.
 */
let htlcContract: Contract | null = null;
export async function getGaslessHtlcContract(): Promise<Contract> {
    if (htlcContract) return htlcContract;
    const { ethers, provider } = await getPolygonClient();
    const { config } = useConfig();
    htlcContract = new ethers.Contract(config.polygon.gasless.htlcContract, GASLESS_HTLC_CONTRACT_ABI, provider);
    return htlcContract;
}

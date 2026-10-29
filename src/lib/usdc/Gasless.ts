/* eslint-disable no-console */
import type { Contract, providers } from 'ethers';
import type { Client } from 'viem';
import type { ChainPins, TransferRequest, TokenAuthorization } from '@nimiq/gasless-sdk/core';
import type { FeeResponse, RelayClient, SubmitTransferBody } from '@nimiq/gasless-sdk/relay';
import type { TransferOutcome } from '@nimiq/gasless-sdk/viem';
import type { SignedPolygonGaslessTransfer, SignPolygonGaslessTransferRequest } from '@nimiq/hub-api';
import { useConfig } from '../../composables/useConfig';
import { ENV_MAIN } from '../Constants';
import { getPolygonClient, gaslessReceiptToTransaction, updatePolygonBalances } from '../../ethers';
import {
    useGaslessPaymentsStore,
    GaslessPayment,
    GaslessPaymentStatus,
    gaslessPaymentKey,
} from '../../stores/GaslessPayments';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { Transaction, useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import { useUsdtTransactionsStore } from '../../stores/UsdtTransactions';

/**
 * Gasless USDC and USDT0 transfers through the GaslessTransfer contract and the Nimiq relay, see
 * https://github.com/NimiqToolbox/gas-abstraction. The user signs a token permit and a transfer intent over it in the
 * Keyguard (via the Hub), the relay submits it and pays the gas in POL, and receives its fee in the transferred token.
 *
 * Rules followed here to never let the user pay twice (sdk/README.md, "Failures, retries and replacements"):
 * - One payment, one intent nonce. A new payment takes the sender's on-chain `nonces(from)`, and only once the
 *   sender's previous payment is decided. A retry of a payment is a correction that keeps the nonce (`corrects`), so
 *   that at most one version executes.
 * - Every signed version of a payment is recorded before it is submitted, and kept until the payment's outcome is
 *   final.
 * - Before a correction is signed, the chain is checked for whether the payment's nonce was used already.
 */

export type GaslessFeeQuote = Pick<FeeResponse, 'token' | 'fee' | 'relay' | 'quoteId' | 'expiresAt'>;

export class GaslessTransferError extends Error {
    /**
     * The payment's latest signed version. A retry of this payment must pass it as `corrects`, to keep the payment's
     * nonce, instead of starting a new payment.
     */
    public readonly payment: TransferRequest | null;

    constructor(message: string, payment: TransferRequest | null) {
        super(message);
        this.name = 'GaslessTransferError';
        this.payment = payment;
    }
}

const TOKEN_ABI = [
    'function nonces(address owner) view returns (uint256)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
];

async function loadSdk() {
    const [core, relay, viem] = await Promise.all([
        // The package's subpath exports are not supported by the eslint import resolver
        // eslint-disable-next-line import/no-unresolved, import/extensions
        import(/* webpackChunkName: "gasless-sdk" */ '@nimiq/gasless-sdk/core'),
        // eslint-disable-next-line import/no-unresolved, import/extensions
        import(/* webpackChunkName: "gasless-sdk" */ '@nimiq/gasless-sdk/relay'),
        // eslint-disable-next-line import/no-unresolved, import/extensions
        import(/* webpackChunkName: "gasless-sdk" */ '@nimiq/gasless-sdk/viem'),
    ]);
    return { core, relay, viem };
}

export function isGaslessTransferConfigured() {
    const { config } = useConfig();
    const { gasless } = config.polygon;
    return !!gasless.relayUrl && !!gasless.transferContract && gasless.relays.length > 0;
}

let pinsPromise: Promise<ChainPins> | null = null;
/**
 * The deployment the Wallet trusts: contract, relay addresses and token domains. The relay's /v1/info must match them.
 * The Keyguard pins the same deployment independently.
 */
export async function getGaslessPins(): Promise<ChainPins> {
    if (pinsPromise) return pinsPromise;
    pinsPromise = (async () => {
        if (!isGaslessTransferConfigured()) throw new Error('Gasless Polygon transfers are not configured');
        const { core } = await loadSdk();
        const { config } = useConfig();
        const chainId = config.polygon.networkId;
        return core.definePins({
            chainId,
            transfer: config.polygon.gasless.transferContract,
            relays: config.polygon.gasless.relays,
            tokens: config.environment === ENV_MAIN
                // On Polygon mainnet, definePins also checks the tokens against these frozen, verified constants.
                ? core.POLYGON_TOKENS
                : [{
                    symbol: 'USDC',
                    address: config.polygon.usdc.tokenContract,
                    decimals: 6,
                    authModes: ['permit', 'none'],
                    domain: {
                        name: 'USD Coin',
                        version: '2',
                        chainId,
                        verifyingContract: config.polygon.usdc.tokenContract as `0x${string}`,
                    },
                }, {
                    symbol: 'USDT0',
                    address: config.polygon.usdt_bridged.tokenContract,
                    decimals: 6,
                    authModes: ['permit', 'metaTxApprove', 'none'],
                    domain: {
                        name: 'USDT0',
                        version: '1',
                        verifyingContract: config.polygon.usdt_bridged.tokenContract as `0x${string}`,
                        salt: core.chainIdSalt(chainId),
                    },
                }],
            deployBlock: config.polygon.gasless.deployBlock,
        });
    })();
    pinsPromise.catch(() => { pinsPromise = null; });
    return pinsPromise;
}

let relayClientPromise: Promise<RelayClient> | null = null;
async function getRelayClient(): Promise<RelayClient> {
    if (relayClientPromise) return relayClientPromise;
    relayClientPromise = (async () => {
        const [{ relay }, pins] = await Promise.all([loadSdk(), getGaslessPins()]);
        const { config } = useConfig();
        return new relay.RelayClient(config.polygon.gasless.relayUrl, { pins });
    })();
    relayClientPromise.catch(() => { relayClientPromise = null; });
    return relayClientPromise;
}

let transferContract: Contract | null = null;
async function getTransferContract(): Promise<Contract> {
    if (transferContract) return transferContract;
    const [{ core }, pins, client] = await Promise.all([loadSdk(), getGaslessPins(), getPolygonClient()]);
    transferContract = new client.ethers.Contract(
        pins.transfer.address,
        core.gaslessTransferAbi as unknown as string[],
        client.provider,
    );
    return transferContract;
}

let viemClient: Client | null = null;
/** A viem client for the SDK's outcome check, on top of the Wallet's ethers provider. */
async function getViemClient(): Promise<Client> {
    if (viemClient) return viemClient;
    // eslint-disable-next-line import/no-unresolved, import/extensions
    const { createClient, custom } = await import(/* webpackChunkName: "gasless-sdk" */ 'viem');
    viemClient = createClient({
        transport: custom({
            async request({ method, params }) {
                // The provider is either a StaticJsonRpcProvider or a WebSocketProvider, see getPolygonClient
                const provider = (await getPolygonClient()).provider as providers.JsonRpcProvider;
                return provider.send(method, (params as unknown[] | undefined) || []);
            },
        }, {
            // The outcome check polls by itself, and expects refused reads (e.g. of old state) to fail right away
            retryCount: 0,
        }),
    });
    return viemClient;
}

/** The sender's next intent nonce, `nonces(from)` at the latest block. */
async function readIntentNonce(from: string): Promise<bigint> {
    const contract = await getTransferContract();
    return BigInt((await contract.nonces(from)).toString());
}

/**
 * The relay's fee for a permit transfer of the given token, in token units. Refuses quotes above the Wallet's
 * `maxAcceptableFee`; the Keyguard applies the same limit when signing.
 */
export async function quoteGaslessFee(token: string): Promise<GaslessFeeQuote> {
    const relay = await getRelayClient();
    const { config } = useConfig();
    const quote = await relay.fee({
        token: token as `0x${string}`,
        authMode: 'permit',
        maxAcceptableFee: BigInt(config.polygon.gasless.maxAcceptableFee),
    });
    return {
        token: quote.token,
        fee: quote.fee,
        relay: quote.relay,
        quoteId: quote.quoteId,
        expiresAt: quote.expiresAt,
    };
}

/** The owner's permit nonce in the token contract, after checking that the token's domain is still the pinned one. */
export async function readPermitNonceAndCheckDomain(token: string, owner: string): Promise<number> {
    const [{ core }, pins, client] = await Promise.all([loadSdk(), getGaslessPins(), getPolygonClient()]);
    const pinned = core.findPinnedToken(pins, token);
    if (!pinned) throw new Error(`Token ${token} is not supported for gasless transfers`);
    const tokenContract = new client.ethers.Contract(pinned.address, TOKEN_ABI, client.provider);
    const [nonce, domainSeparator] = await Promise.all([
        tokenContract.nonces(owner),
        tokenContract.DOMAIN_SEPARATOR() as Promise<string>,
    ]);
    // USDT0's admin can rename the token, which changes its domain. A permit signed with the pinned domain would then
    // be invalid.
    if (domainSeparator.toLowerCase() !== pinned.domainSeparator.toLowerCase()) {
        throw new Error(`The ${pinned.symbol} token domain changed, gasless transfers are unavailable`);
    }
    return nonce.toNumber();
}

function tokenTransactionsStore(token: string) {
    const { config } = useConfig();
    return token.toLowerCase() === config.polygon.usdc.tokenContract.toLowerCase()
        ? useUsdcTransactionsStore()
        : useUsdtTransactionsStore();
}

async function transactionFromOutcome(outcome: TransferOutcome): Promise<Transaction | null> {
    if (!outcome.txHash || !outcome.executedTransfer) return null;
    const client = await getPolygonClient();
    const receipt = await client.provider.getTransactionReceipt(outcome.txHash);
    if (!receipt) return null;
    return gaslessReceiptToTransaction(receipt, outcome.executedTransfer.request);
}

function wentThrough(outcome: TransferOutcome) {
    return outcome.status === 'executed' || outcome.status === 'other_version_executed';
}

/**
 * Waits until the payment's outcome is final at the finalized block, then forgets the payment. An execution that the
 * Wallet did not see yet (e.g. after a reload) gets added to the transaction history. Resolves to null if a later
 * version of the payment was signed meanwhile, whose own check decides.
 */
async function decidePayment(payment: GaslessPayment, timeoutMs?: number): Promise<TransferOutcome | null> {
    const store = useGaslessPaymentsStore();
    const [{ viem }, pins, client, relay] = await Promise.all([
        loadSdk(),
        getGaslessPins(),
        getViemClient(),
        getRelayClient(),
    ]);
    const { latest, versions } = payment;
    const outcome = await viem.waitForTransferOutcome(client, pins, { ...latest, versions }, { relay, timeoutMs });
    const nonce = BigInt(latest.request.nonce);
    if (wentThrough(outcome)) {
        const tx = await transactionFromOutcome(outcome);
        if (tx) tokenTransactionsStore(tx.token!).addTransactions([tx]);
    } else if (outcome.status === 'expired') {
        // Only this version expired. If a later version of the payment was signed meanwhile, its own check decides.
        const stored = store.state.payments[gaslessPaymentKey(latest.request)];
        if (stored && stored.id !== payment.id) return null;
        // No version can execute anymore, and the nonce is still unused: the next payment takes it again.
        store.settle(latest.request, nonce);
        return outcome;
    }
    // Executed, or the nonce was used by another payment of the sender or invalidated
    store.settle(latest.request, nonce + BigInt(1));
    return outcome;
}

const settling = new Set<string>();
function settleInBackground(request: Pick<TransferRequest, 'from' | 'nonce'>) {
    const payment = useGaslessPaymentsStore().state.payments[gaslessPaymentKey(request)];
    if (!payment || settling.has(payment.id)) return;
    settling.add(payment.id);
    decidePayment(payment).catch((error) => {
        // Not final yet, or the chain could not be read. Keep the payment and check again on the next launch.
        console.warn('Gasless payment outcome not final yet', payment.id, error);
    }).finally(() => settling.delete(payment.id));
}

let resumed = false;
/** Resumes the outcome checks of payments that were pending when the Wallet was closed. */
export function resumePendingGaslessPayments() {
    if (resumed || !isGaslessTransferConfigured()) return;
    resumed = true;
    for (const payment of Object.values(useGaslessPaymentsStore().state.payments)) {
        settleInBackground(payment.latest.request);
    }
}

/**
 * Relay error codes after which the relay did not store the version and the same body can be posted again later
 * (sdk/README.md "What to do"). `conflict` and `nonce_used` are not among them: another version of the payment, or
 * another payment, may execute.
 */
const RETRYABLE_RELAY_ERRORS = ['rate_limited', 'unavailable', 'internal_error', 'sender_busy', 'nonce_too_high'];
const MAX_SUBMIT_ATTEMPTS = 4;
/** How long to wait for the outcome of the sender's previous payment before a new signature, once its nonce is used. */
const DECIDE_TIMEOUT_MS = 3 * 60e3;

/**
 * Sends a gasless transfer from the active Polygon address.
 *
 * @param sign - Asks the user to sign the transfer, via the Hub and Keyguard. Resolves to null if the user cancels.
 * @param corrects - When retrying a payment that failed (`GaslessTransferError.payment`), its latest signed version.
 * @returns The mined transaction, or null if the user cancelled.
 */
export async function sendGaslessTransfer({ token, to, amount, recipientLabel, quote, corrects, sign }: {
    token: string,
    to: string,
    amount: number,
    recipientLabel?: string,
    quote?: GaslessFeeQuote,
    corrects?: TransferRequest,
    sign: (request: Omit<SignPolygonGaslessTransferRequest, 'appName'>)
        => Promise<SignedPolygonGaslessTransfer | null | void>,
}): Promise<Transaction | null> {
    const addressInfo = usePolygonAddressStore().addressInfo.value;
    if (!addressInfo) throw new Error('No active Polygon address');
    const from = addressInfo.address;

    const [{ core, relay: relayModule }, pins, relay] = await Promise.all([
        loadSdk(),
        getGaslessPins(),
        getRelayClient(),
    ]);
    const client = await getPolygonClient();
    const store = useGaslessPaymentsStore();

    // The sender's open payment. A new payment takes the sender's `nonces(from)`, which stays at the open payment's
    // nonce until that one is decided, so there is at most one.
    const open: GaslessPayment | undefined = Object.values(store.state.payments)
        .filter(({ latest }) => core.sameAddress(latest.request.from, from))
        .sort((a, b) => b.signedAt - a.signedAt)[0];
    // A payment of the same token to the same recipient that failed as far as the user was told (`corrects`, or as
    // recorded in the store) might still execute. Sending again is therefore a correction of its latest version, which
    // keeps its nonce, not a new payment. A payment that was settled already is decided, and a new payment is safe.
    const isCorrectable = !!open
        && core.sameAddress(open.latest.request.token, token)
        && core.sameAddress(open.latest.request.to, to)
        && (open.status !== GaslessPaymentStatus.SUBMITTED
            || (!!corrects && gaslessPaymentKey(corrects) === gaslessPaymentKey(open.latest.request)));
    corrects = isCorrectable ? open!.latest.request : undefined;

    let nonce = await readIntentNonce(from);
    if (open && nonce > BigInt(open.latest.request.nonce)) {
        // The open payment's nonce is used: it is decided once its block is final. Never sign a correction for it.
        let outcome: TransferOutcome | null;
        try {
            outcome = await decidePayment(open, DECIDE_TIMEOUT_MS);
        } catch (error) {
            throw new GaslessTransferError(
                'Your previous payment is still being confirmed. Please try again in a few minutes.',
                corrects || null,
            );
        }
        if (outcome && wentThrough(outcome) && corrects) {
            // The payment went through after all. Never sign again for it.
            throw new GaslessTransferError(
                'Your earlier payment to this recipient went through after all. No new payment was made.',
                null,
            );
        }
        corrects = undefined;
        nonce = await readIntentNonce(from);
    } else if (open && !corrects) {
        // The open payment might still execute, and a new payment would get the same nonce
        settleInBackground(open.latest.request);
        throw new GaslessTransferError(
            'Your previous payment is still pending. Please wait until it completed or expired, which takes up to '
                + '15 minutes, before sending another one.',
            null,
        );
    }
    if (!corrects && nonce < BigInt(store.state.minNonces[from.toLowerCase()] || '0')) {
        // An RPC node behind the chain could hand out a nonce that an earlier payment used
        throw new GaslessTransferError('The Polygon network is not up to date. Please try again shortly.', null);
    }
    const intentNonce = corrects ? corrects.nonce : nonce.toString();

    if (!quote || quote.token.toLowerCase() !== token.toLowerCase() || quote.expiresAt < Date.now() / 1000 + 10) {
        quote = await quoteGaslessFee(token);
    }
    const fee = Number(quote.fee);

    // Ensure to send only what is possible with the current fee
    const balance = (token.toLowerCase() === useConfig().config.polygon.usdc.tokenContract.toLowerCase()
        ? addressInfo.balanceUsdc
        : addressInfo.balanceUsdtBridged) || 0;
    amount = Math.min(amount, Math.max(balance - fee, 0));
    if (amount <= 0) throw new GaslessTransferError('Insufficient balance to pay the fee', corrects || null);

    const tokenNonce = await readPermitNonceAndCheckDomain(token, from);

    const signed = await sign({
        request: {
            token,
            from,
            to,
            amount: amount.toString(),
            fee: quote.fee,
            relay: quote.relay,
            nonce: intentNonce,
        },
        tokenNonce,
        corrects,
        recipientLabel,
    });
    if (!signed) return null;

    // Make sure the signed transfer is the one we asked for, and valid for our pins
    const request = core.normalizeTransferRequest(signed.request);
    if (!core.sameAddress(request.token, token) || !core.sameAddress(request.from, from)
        || !core.sameAddress(request.to, to) || request.amount !== amount.toString() || request.fee !== quote.fee
        || !core.sameAddress(request.relay, quote.relay) || request.nonce !== intentNonce) {
        throw new Error('The signed transfer does not match the requested transfer');
    }
    const authorization = core.normalizeTokenAuthorization(signed.authorization as TokenAuthorization);
    const body: SubmitTransferBody = core.buildSubmitTransferBody({
        request,
        signature: signed.signature,
        authorization,
        quoteId: quote.quoteId,
    });
    const id = core.transferDigest(pins.chainId, pins.transfer.address, request, authorization);

    // Record the version as the payment's latest before submitting it
    store.recordSigned({ request, authHash: core.tokenAuthHash(authorization) }, id);

    try {
        // Submit. After an unclear answer, post the identical body again: the relay answers a body it stored with 200.
        let unclear = false;
        for (let attempt = 1; ; attempt++) {
            try {
                await relay.submitTransfer(body, { repost: unclear }); // eslint-disable-line no-await-in-loop
                store.setStatus(request, GaslessPaymentStatus.SUBMITTED);
                break;
            } catch (error) {
                if (error instanceof relayModule.RelayApiError) {
                    if (error.code === 'conflict' || error.code === 'nonce_used') {
                        // Another version of this payment is stored or executed. Its outcome decides.
                        settleInBackground(request);
                        throw new GaslessTransferError(
                            'Another version of this payment is pending. Please wait a few minutes before retrying.',
                            request,
                        );
                    }
                    if (!RETRYABLE_RELAY_ERRORS.includes(error.code)) {
                        // The relay refused this version and did not store it
                        settleInBackground(request);
                        throw new GaslessTransferError(`The relay refused the transfer: ${error.message}`, request);
                    }
                    if (error.code === 'internal_error') unclear = true;
                    if ((error.code === 'sender_busy' || error.code === 'nonce_too_high')
                        // eslint-disable-next-line no-await-in-loop
                        && await readIntentNonce(from) > BigInt(request.nonce)) {
                        // The nonce was used meanwhile: the payment is decided. Its outcome tells how.
                        settleInBackground(request);
                        throw new GaslessTransferError(
                            'Another payment from this address was executed meanwhile. Please wait a few minutes '
                                + 'before retrying.',
                            request,
                        );
                    }
                } else if (error instanceof relayModule.RelayClientError) {
                    if (error.code === 'pin_mismatch') {
                        settleInBackground(request);
                        throw new GaslessTransferError('The relay does not match the Wallet\'s configuration', request);
                    }
                    unclear = true;
                } else {
                    // Validation errors before sending: nothing was sent in this attempt
                    settleInBackground(request);
                    throw new GaslessTransferError(error instanceof Error ? error.message : String(error), request);
                }
                if (attempt >= MAX_SUBMIT_ATTEMPTS) {
                    settleInBackground(request);
                    throw new GaslessTransferError(`Could not reach the relay: ${(error as Error).message}`, request);
                }
                await new Promise((resolve) => { window.setTimeout(resolve, 2000 * attempt); }); // eslint-disable-line
            }
        }

        let txHash: string | null;
        try {
            const state = await relay.waitForRequest(id, { until: 'mined', timeoutMs: 3 * 60e3 });
            txHash = state.txHash;
        } catch (error) {
            settleInBackground(request);
            if (error instanceof relayModule.RelayRequestFailedError) {
                throw new GaslessTransferError(
                    `The transfer failed: ${error.state.error?.message || error.relayCode || error.message}`,
                    request,
                );
            }
            throw new GaslessTransferError(
                'The transfer is still pending. It shows up in your history once it is included.',
                request,
            );
        }

        // Settle the payment once its block is final
        settleInBackground(request);

        const receipt = txHash ? await client.provider.getTransactionReceipt(txHash) : null;
        if (!receipt) {
            throw new GaslessTransferError('The transfer was sent, but its receipt is not available yet', request);
        }
        updatePolygonBalances(token, [from]);
        return gaslessReceiptToTransaction(receipt, request);
    } catch (error) {
        if (error instanceof GaslessTransferError && error.payment) {
            store.setStatus(error.payment, GaslessPaymentStatus.FAILED);
        }
        throw error;
    }
}

/* eslint-disable no-console */
import type { Contract } from 'ethers';
import type { ChainPins, TransferRequest } from '@nimiq/gasless-sdk/core';
import type { FeeResponse, RelayClient, SubmitTransferBody } from '@nimiq/gasless-sdk/relay';
import type { SignedPolygonTransaction, SignPolygonTransactionRequest } from '@nimiq/hub-api';
import { useConfig } from '../../composables/useConfig';
import { ENV_MAIN } from '../Constants';
import { getPolygonClient, gaslessReceiptToTransaction, updatePolygonBalances } from '../../ethers';
import { useGaslessPaymentsStore, GaslessPaymentStatus, gaslessPaymentKey } from '../../stores/GaslessPayments';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { Transaction, useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import { useUsdtTransactionsStore } from '../../stores/UsdtTransactions';
import { waitForTransferOutcome, TransferOutcome } from './GaslessOutcome';

/**
 * Gasless USDC and USDT0 transfers through the GaslessTransfer contract and the Nimiq relay, see
 * https://github.com/NimiqToolbox/gas-abstraction. The user signs a transfer intent and a token permit in the Keyguard
 * (via the Hub), the relay submits it and pays the gas in POL, and receives its fee in the transferred token.
 *
 * Rules followed here to never let the user pay twice (sdk/README.md, "Failures, retries and replacements"):
 * - One payment, one intent nonce. A retry of a payment is a correction that keeps the nonce (`corrects`), so that at
 *   most one version executes. A new nonce is only signed for a new payment.
 * - The latest signed version of a payment is recorded before it is submitted, and kept until its outcome is final.
 * - Before a correction is signed, the chain is checked for whether a version of the payment already executed.
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
    const [core, relay] = await Promise.all([
        // The package's subpath exports are not supported by the eslint import resolver
        // eslint-disable-next-line import/no-unresolved, import/extensions
        import(/* webpackChunkName: "gasless-sdk" */ '@nimiq/gasless-sdk/core'),
        // eslint-disable-next-line import/no-unresolved, import/extensions
        import(/* webpackChunkName: "gasless-sdk" */ '@nimiq/gasless-sdk/relay'),
    ]);
    return { core, relay };
}

export function isGaslessTransferConfigured() {
    const { config } = useConfig();
    const { gasless } = config.polygon;
    return !!gasless.relayUrl && !!gasless.transferContract && gasless.relays.length > 0;
}

let pinsPromise: Promise<ChainPins> | null = null;
/**
 * The deployment the Wallet trusts: contract, relay addresses, token domains and MAX_FEE. The relay's /v1/info must
 * match them. The Keyguard pins the same deployment independently.
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
            maxFee: config.polygon.gasless.maxFee,
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

async function readPermitNonceAndCheckDomain(token: string, owner: string): Promise<number> {
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
    return gaslessReceiptToTransaction(receipt, outcome.executedTransfer.from);
}

/**
 * Waits in the background until the payment's outcome is final at the finalized block, then forgets the payment. An
 * execution that the Wallet did not see yet (e.g. after a reload) gets added to the transaction history.
 */
async function settleInBackground(latest: TransferRequest, id: string) {
    const store = useGaslessPaymentsStore();
    try {
        const [pins, contract, client, relay] = await Promise.all([
            getGaslessPins(),
            getTransferContract(),
            getPolygonClient(),
            getRelayClient(),
        ]);
        const outcome = await waitForTransferOutcome(client.provider, contract, pins, latest, id, { relay });
        if (outcome.status === 'executed' || outcome.status === 'other_version_executed') {
            const tx = await transactionFromOutcome(outcome);
            if (tx) tokenTransactionsStore(tx.token!).addTransactions([tx]);
        } else if (outcome.status === 'expired') {
            // Only this version expired. If a later version of the payment was signed meanwhile, its own check decides.
            const stored = store.state.payments[gaslessPaymentKey(latest)];
            if (stored && stored.id !== id) return;
        }
        store.settle(latest);
    } catch (error) {
        // Not final yet, or the chain could not be read. Keep the payment and check again on the next launch.
        console.warn('Gasless payment outcome not final yet', id, error);
    }
}

let resumed = false;
/** Resumes the outcome checks of payments that were pending when the Wallet was closed. */
export function resumePendingGaslessPayments() {
    if (resumed || !isGaslessTransferConfigured()) return;
    resumed = true;
    for (const payment of Object.values(useGaslessPaymentsStore().state.payments)) {
        settleInBackground(payment.latest, payment.id);
    }
}

/**
 * Relay error codes after which the relay did not store the version (sdk/README.md "What to do"). `conflict` and
 * `nonce_used` are not among them: another version of the payment may execute.
 */
const RETRYABLE_RELAY_ERRORS = ['rate_limited', 'unavailable', 'internal_error'];
const MAX_SUBMIT_ATTEMPTS = 4;

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
    sign: (request: Omit<SignPolygonTransactionRequest, 'appName'>)
        => Promise<SignedPolygonTransaction | null | void>,
}): Promise<Transaction | null> {
    const addressInfo = usePolygonAddressStore().addressInfo.value;
    if (!addressInfo) throw new Error('No active Polygon address');
    const from = addressInfo.address;

    const [{ core, relay: relayModule }, pins, relay, contract] = await Promise.all([
        loadSdk(),
        getGaslessPins(),
        getRelayClient(),
        getTransferContract(),
    ]);
    const client = await getPolygonClient();
    const store = useGaslessPaymentsStore();

    if (corrects) {
        // Before signing a new version of the payment, make sure that no version executed yet.
        const used = await contract.nonceUsed(corrects.from, corrects.nonce) as boolean;
        if (used) {
            const id = core.transferDigest(pins.chainId, pins.transfer.address, corrects);
            const outcome = await waitForTransferOutcome(client.provider, contract, pins, corrects, id, { relay });
            store.settle(corrects);
            if (outcome.status === 'executed' || outcome.status === 'other_version_executed') {
                // The payment went through. Never sign again for it.
                return transactionFromOutcome(outcome);
            }
            // The sender invalidated the nonce: no version can execute, and a new payment is safe.
            corrects = undefined;
        }
    }

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
        || !core.sameAddress(request.relay, quote.relay) || (corrects && request.nonce !== corrects.nonce)) {
        throw new Error('The signed transfer does not match the requested transfer');
    }
    const body: SubmitTransferBody = core.buildSubmitTransferBody({
        request,
        signature: signed.signature,
        authorization: signed.authorization as SubmitTransferBody['authorization'],
        quoteId: quote.quoteId,
    });
    const id = core.transferDigest(pins.chainId, pins.transfer.address, request);

    // Record the version as the payment's latest before submitting it
    store.recordSigned(request, id);

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
                    settleInBackground(request, id);
                    throw new GaslessTransferError(
                        'Another version of this payment is pending. Please wait a few minutes before retrying.',
                        request,
                    );
                }
                if (!RETRYABLE_RELAY_ERRORS.includes(error.code)) {
                    // The relay refused this version and did not store it
                    store.setStatus(request, GaslessPaymentStatus.REFUSED);
                    settleInBackground(request, id);
                    throw new GaslessTransferError(`The relay refused the transfer: ${error.message}`, request);
                }
                if (error.code === 'internal_error') unclear = true;
            } else if (error instanceof relayModule.RelayClientError) {
                if (error.code === 'pin_mismatch') {
                    settleInBackground(request, id);
                    throw new GaslessTransferError('The relay does not match the Wallet\'s configuration', request);
                }
                unclear = true;
            } else {
                // Validation errors before sending: nothing was sent in this attempt
                settleInBackground(request, id);
                throw new GaslessTransferError(error instanceof Error ? error.message : String(error), request);
            }
            if (attempt >= MAX_SUBMIT_ATTEMPTS) {
                settleInBackground(request, id);
                throw new GaslessTransferError(`Could not reach the relay: ${(error as Error).message}`, request);
            }
            await new Promise((resolve) => { window.setTimeout(resolve, 2000 * attempt); }); // eslint-disable-line
        }
    }

    let txHash: string | null;
    try {
        const state = await relay.waitForRequest(id as `0x${string}`, { until: 'mined', timeoutMs: 3 * 60e3 });
        txHash = state.txHash;
    } catch (error) {
        settleInBackground(request, id);
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
    settleInBackground(request, id);

    const receipt = txHash ? await client.provider.getTransactionReceipt(txHash) : null;
    if (!receipt) {
        throw new GaslessTransferError('The transfer was sent, but its receipt is not available yet', request);
    }
    updatePolygonBalances(token, [from]);
    return gaslessReceiptToTransaction(receipt, from);
}

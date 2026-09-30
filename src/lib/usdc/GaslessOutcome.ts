/* eslint-disable no-await-in-loop */
import type { BigNumber, Contract, providers } from 'ethers';
import type { ChainPins, TransferRequest } from '@nimiq/gasless-sdk/core';
import type { RelayClient, RequestState, RequestStatus } from '@nimiq/gasless-sdk/relay';

/**
 * Port of the gasless SDK's `confirmOnChain` and `waitForTransferOutcome` (sdk/src/viem/confirm.ts and outcome.ts in
 * https://github.com/NimiqToolbox/gas-abstraction) to ethers v5, which the Wallet uses instead of viem.
 *
 * Every version of a payment is signed with one intent nonce, and the contract executes at most one intent per
 * (from, nonce). These checks therefore answer for the payment, not only for the given version, and read the chain
 * directly without trusting the relay. Only an answer read at the finalized block allows signing a new payment.
 */

/** See OnChainStatus in the SDK. `pending` and `unresolved` are not final. */
export type OnChainStatus = 'executed' | 'other_version_executed' | 'pending' | 'expired' | 'nonce_consumed'
    | 'unresolved';

export type ExecutedTransfer = Readonly<Omit<TransferRequest, 'deadline'>>;

export interface OnChainConfirmation {
    readonly status: OnChainStatus;
    readonly txHash: string | null;
    readonly blockNumber: number | null;
    readonly executedTransfer: ExecutedTransfer | null;
}

export type TransferOutcome = OnChainConfirmation & {
    readonly status: Exclude<OnChainStatus, 'pending' | 'unresolved'>,
    readonly relayState: RequestState | null,
};

export type ConfirmBlockTag = 'latest' | 'safe' | 'finalized';

/** The longest lifetime the SDK and relay accept (7200 s), plus 600 s for clocks and lagging nodes. */
const SEARCH_BEFORE_DEADLINE_SECONDS = 7200 + 600;
/** Blocks per eth_getLogs query at first; halved each time the RPC refuses a range. */
const LOG_RANGE_BLOCKS = 1000;
const MAX_DEADLINE_SECONDS = 7200;
const FINALITY_SLACK_SECONDS = 1800;
const MIN_DEFAULT_WAIT_SECONDS = 60;
const DEFAULT_POLL_INTERVAL_MS = 4000;
const DECIDED: readonly RequestStatus[] = ['mined', 'confirmed', 'failed', 'expired'];
const FINAL: readonly OnChainStatus[] = ['executed', 'other_version_executed', 'expired', 'nonce_consumed'];

interface Block {
    readonly number: number;
    readonly timestamp: number;
    readonly hash: string;
}

interface Context {
    readonly provider: providers.Provider;
    readonly contract: Contract; // The pinned GaslessTransfer contract
    readonly request: TransferRequest;
}

type NonceUse = { readonly kind: 'transfer', readonly transfer: ExecutedTransfer } | { readonly kind: 'invalidation' };

function sameAddress(a: string, b: string) {
    return a.toLowerCase() === b.toLowerCase();
}

function nonceUseOf({ contract, request }: Context, log: providers.Log): NonceUse | undefined {
    if (log.removed || !sameAddress(log.address, contract.address) || !log.topics.length) return undefined;
    let event;
    try {
        event = contract.interface.parseLog(log);
    } catch (error) {
        return undefined;
    }
    if (event.name === 'TransferRelayed') {
        const { args } = event;
        if (!sameAddress(args.from, request.from) || (args.nonce as string).toLowerCase() !== request.nonce) {
            return undefined;
        }
        return {
            kind: 'transfer',
            transfer: Object.freeze({
                token: args.token,
                from: args.from,
                to: args.to,
                amount: (args.amount as BigNumber).toString(),
                fee: (args.fee as BigNumber).toString(),
                relay: args.relay,
                nonce: (args.nonce as string).toLowerCase() as TransferRequest['nonce'],
            }),
        };
    }
    if (event.name === 'NonceInvalidated') {
        const { args } = event;
        if (!sameAddress(args.signer, request.from) || (args.nonce as string).toLowerCase() !== request.nonce) {
            return undefined;
        }
        return { kind: 'invalidation' };
    }
    return undefined;
}

function answerOf(use: NonceUse, request: TransferRequest, txHash: string, blockNumber: number): OnChainConfirmation {
    if (use.kind === 'invalidation') {
        return { status: 'nonce_consumed', txHash, blockNumber, executedTransfer: null };
    }
    const t = use.transfer;
    const exact = sameAddress(t.token, request.token)
        && sameAddress(t.to, request.to)
        && t.amount === request.amount
        && t.fee === request.fee
        && sameAddress(t.relay, request.relay);
    return { status: exact ? 'executed' : 'other_version_executed', txHash, blockNumber, executedTransfer: t };
}

function notUsed(status: 'pending' | 'expired' | 'unresolved'): OnChainConfirmation {
    return { status, txHash: null, blockNumber: null, executedTransfer: null };
}

async function getBlock(provider: providers.Provider, blockTag: number | ConfirmBlockTag): Promise<Block> {
    const block = await provider.getBlock(blockTag);
    if (!block) throw new Error(`Block ${blockTag} not found`);
    return block;
}

/**
 * The lowest block number in [low, high.number] whose timestamp is at least `target`, or high.number + 1 if there is
 * none. Interpolation steps alternate with bisection steps.
 */
async function firstBlockAtOrAfter(
    provider: providers.Provider,
    target: number,
    low: number,
    high: Block,
): Promise<number> {
    if (high.timestamp < target) return high.number + 1;
    if (low >= high.number) return high.number;
    let lo = low;
    let loTs = (await getBlock(provider, lo)).timestamp;
    if (loTs >= target) return lo;
    let hi = high.number;
    let hiTs = high.timestamp;
    for (let step = 0; hi - lo > 1; step++) {
        let mid = step % 2 === 0
            ? lo + Math.floor(((target - loTs) * (hi - lo)) / (hiTs - loTs))
            : lo + Math.floor((hi - lo) / 2);
        if (mid <= lo) mid = lo + 1;
        if (mid >= hi) mid = hi - 1;
        const ts = (await getBlock(provider, mid)).timestamp;
        if (ts >= target) {
            hi = mid;
            hiTs = ts;
        } else {
            lo = mid;
            loTs = ts;
        }
    }
    return hi;
}

/**
 * The eth_getLogs filters of the event search, each matching only events the sender caused: its TransferRelayed
 * events (any version of the payment; the nonce is compared in the log data) and its NonceInvalidated of this nonce.
 */
function searchFilters({ contract, request }: Context): string[][] {
    const sender = `0x${request.from.slice(2).toLowerCase().padStart(64, '0')}`;
    return [
        [contract.interface.getEventTopic('TransferRelayed'), null as unknown as string, sender],
        [contract.interface.getEventTopic('NonceInvalidated'), sender, request.nonce],
    ];
}

async function firstNonceUse(
    context: Context,
    logs: readonly providers.Log[],
    lo: number,
    hi: number,
): Promise<OnChainConfirmation | undefined> {
    for (const log of logs) {
        if (!log.transactionHash || typeof log.blockNumber !== 'number' || !log.blockHash) continue;
        if (log.blockNumber < lo || log.blockNumber > hi) continue;
        const use = nonceUseOf(context, log);
        if (use) {
            // Only canonical evidence may decide the outcome, as log responses can be cached across reorgs.
            const canonical = await getBlock(context.provider, log.blockNumber);
            if (canonical.hash.toLowerCase() === log.blockHash.toLowerCase()) {
                return answerOf(use, context.request, log.transactionHash, log.blockNumber);
            }
        }
    }
    return undefined;
}

async function scan(
    context: Context,
    bounds: { readonly from: number, readonly to: number, readonly downward: boolean },
    cursor: { range: number },
): Promise<OnChainConfirmation | undefined> {
    const filters = searchFilters(context);
    let { from, to } = bounds;
    while (from <= to) {
        const size = cursor.range;
        const lo = bounds.downward ? (to - from + 1 > size ? to - size + 1 : from) : from;
        const hi = bounds.downward ? to : (to - from + 1 > size ? from + size - 1 : to);
        let refused = false;
        for (const topics of filters) {
            let logs: providers.Log[];
            try {
                logs = await context.provider.getLogs({
                    address: context.contract.address,
                    topics,
                    fromBlock: lo,
                    toBlock: hi,
                });
            } catch (error) {
                // Providers limit the range of one query, and differently: try half of it.
                if (hi === lo) throw error;
                cursor.range = Math.floor((hi - lo + 1) / 2);
                refused = true;
                break;
            }
            // At most one event uses a nonce, so the first match is the answer.
            const answer = await firstNonceUse(context, logs, lo, hi);
            if (answer) return answer;
        }
        if (refused) continue;
        if (bounds.downward) to = lo - 1;
        else from = hi + 1;
    }
    return undefined;
}

async function findNonceUse(context: Context, pins: ChainPins, block: Block): Promise<OnChainConfirmation | undefined> {
    const floor = pins.deployBlock ?? 0;
    const deadline = Number(context.request.deadline);
    let from = await firstBlockAtOrAfter(context.provider, deadline - SEARCH_BEFORE_DEADLINE_SECONDS, floor, block);
    if (from < floor) from = floor;
    if (from > block.number) return undefined;
    const executionEnd = block.timestamp <= deadline
        ? block.number
        : (await firstBlockAtOrAfter(context.provider, deadline + 1, from, block)) - 1;
    const cursor = { range: LOG_RANGE_BLOCKS };
    return (await scan(context, { from, to: executionEnd, downward: true }, cursor))
        ?? scan(context, { from: executionEnd + 1, to: block.number, downward: false }, cursor);
}

/**
 * Independent on-chain check of a payment at one block (default the latest). See `confirmOnChain` in the SDK.
 */
export async function confirmOnChain(
    provider: providers.Provider,
    contract: Contract,
    pins: ChainPins,
    request: TransferRequest,
    options: { readonly txHash?: string, readonly blockTag?: ConfirmBlockTag } = {},
): Promise<OnChainConfirmation> {
    const { chainId } = await provider.getNetwork();
    if (chainId !== pins.chainId) throw new Error(`Polygon client is on chain ${chainId}, expected ${pins.chainId}`);

    const context: Context = { provider, contract, request };
    const block = await getBlock(provider, options.blockTag || 'latest');
    const deadline = Number(request.deadline);
    if (pins.deployBlock !== null && block.number < pins.deployBlock) {
        return notUsed(block.timestamp > deadline ? 'expired' : 'pending');
    }
    const used = await contract.nonceUsed(request.from, request.nonce, { blockTag: block.number }) as boolean;
    if (!used) return notUsed(block.timestamp > deadline ? 'expired' : 'pending');

    // The nonce is used: by this intent, by another version of the payment, or by the sender's invalidation.
    if (options.txHash) {
        const receipt = await provider.getTransactionReceipt(options.txHash);
        // A replaced (sped-up) transaction has no receipt; fall back to the event search.
        if (receipt && receipt.status === 1 && receipt.blockNumber <= block.number) {
            const canonical = receipt.blockNumber === block.number
                ? block
                : await getBlock(provider, receipt.blockNumber);
            if (canonical.hash.toLowerCase() === receipt.blockHash.toLowerCase()) {
                for (const log of receipt.logs) {
                    if (log.blockHash.toLowerCase() !== receipt.blockHash.toLowerCase()) continue;
                    const use = nonceUseOf(context, log);
                    if (use) return answerOf(use, request, receipt.transactionHash, receipt.blockNumber);
                }
            }
        }
    }
    return (await findNonceUse(context, pins, block)) ?? notUsed('unresolved');
}

/**
 * Waits until the chain shows the payment executed (by this or another version), expired or its nonce consumed, read
 * at the finalized block by default. Pass the payment's latest version. The relay only says when reading the chain is
 * worthwhile, and its txHash saves the log search. See `waitForTransferOutcome` in the SDK.
 */
export async function waitForTransferOutcome(
    provider: providers.Provider,
    contract: Contract,
    pins: ChainPins,
    request: TransferRequest,
    id: string,
    options: {
        readonly relay?: RelayClient,
        readonly blockTag?: ConfirmBlockTag,
        readonly pollIntervalMs?: number,
        readonly timeoutMs?: number,
    } = {},
): Promise<TransferOutcome> {
    const blockTag = options.blockTag || 'finalized';
    const pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    const now = () => Math.floor(Date.now() / 1000);
    const deadline = Number(request.deadline);
    const start = now();
    const lastDeadline = Math.min(deadline, start + MAX_DEADLINE_SECONDS);
    const giveUpAt = Date.now()
        + (options.timeoutMs
            ?? Math.max(MIN_DEFAULT_WAIT_SECONDS, lastDeadline + FINALITY_SLACK_SECONDS - start) * 1000);

    let relayState: RequestState | null = null;
    let unresolved = false;
    for (;;) {
        // Before the deadline, the chain is only read once the relay reports a decision or does not answer. After the
        // deadline, on every poll.
        let readChain = now() > deadline;
        if (options.relay && !readChain) {
            try {
                relayState = await options.relay.getRequest(id as `0x${string}`);
                readChain = DECIDED.includes(relayState.status);
            } catch (error) {
                readChain = true;
            }
        } else if (!options.relay) {
            readChain = true;
        }

        if (readChain) {
            const confirmation = await confirmOnChain(provider, contract, pins, request, {
                txHash: relayState?.txHash || undefined,
                blockTag,
            });
            if (FINAL.includes(confirmation.status)) {
                return { ...confirmation, relayState } as TransferOutcome;
            }
            unresolved = confirmation.status === 'unresolved';
        }

        if (Date.now() >= giveUpAt) {
            throw new Error(`The outcome of transfer ${id} is not final yet${unresolved
                ? ': its nonce is used, but the event that used it was not found'
                : ''}; do not sign again for this payment`);
        }
        await new Promise((resolve) => { window.setTimeout(resolve, pollIntervalMs); });
    }
}

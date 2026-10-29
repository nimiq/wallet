// The declarations of @nimiq/gasless-sdk/viem import viem's, which TypeScript 4.5 cannot parse. The tsconfigs map the
// module to these declarations of the parts that the Wallet uses, see sdk/src/viem in
// https://github.com/NimiqToolbox/gas-abstraction.
import type { ChainPins, Hex, TransferVersion } from '@nimiq/gasless-sdk/core';
import type { RequestState } from '@nimiq/gasless-sdk/relay';
import type { Client } from 'viem';

export type OnChainStatus = 'executed' | 'other_version_executed' | 'other_payment_executed' | 'pending' | 'expired'
    | 'nonce_consumed' | 'unresolved';

export type ConfirmBlockTag = 'latest' | 'safe' | 'finalized';

export interface OnChainConfirmation {
    readonly status: OnChainStatus;
    readonly txHash: Hex | null;
    readonly blockNumber: bigint | null;
    readonly executedTransfer: TransferVersion | null;
    readonly reason?: 'no_history' | 'not_found';
}

export interface TransferOutcome extends OnChainConfirmation {
    readonly status: Exclude<OnChainStatus, 'pending' | 'unresolved'>;
    readonly relayState: RequestState | null;
}

export interface WaitForTransferOutcomeOptions {
    readonly relay?: { getRequest(id: Hex, options?: { readonly signal?: AbortSignal }): Promise<RequestState> };
    readonly blockTag?: ConfirmBlockTag;
    readonly pollIntervalMs?: number;
    readonly timeoutMs?: number;
    readonly fromBlock?: bigint;
    readonly signal?: AbortSignal;
    readonly now?: () => number;
}

export function waitForTransferOutcome(
    client: Client,
    pins: ChainPins,
    target: TransferVersion & { readonly id?: Hex, readonly versions?: readonly TransferVersion[] },
    options?: WaitForTransferOutcomeOptions,
): Promise<TransferOutcome>;

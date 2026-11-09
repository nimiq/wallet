import Vue from 'vue';
import { createStore } from 'pinia';
import type { TransferRequest, TransferVersion } from '@nimiq/gasless-sdk/core';

/**
 * Gasless USDC/USDT0 payments whose outcome is not final yet.
 *
 * Every version of a payment (e.g. re-signed with a higher fee) keeps the payment's intent nonce, so that at most one
 * version executes. To never let the user pay twice, each version is recorded as soon as it is signed, before it is
 * submitted, and kept until the chain shows at the finalized block that the payment either executed or can no longer
 * execute. Only the signed fields and the hash of the token permit are stored (`TransferVersion`), never signatures.
 *
 * A new payment takes the sender's on-chain `nonces(from)`, which stays at the nonce of an open payment until that one
 * is decided. There is therefore at most one open payment per sender.
 */
export enum GaslessPaymentStatus {
    /** Signed, but not (yet) known to be stored by the relay. */
    SIGNED = 'signed',
    /** Stored by the relay, and on its way to be executed. */
    SUBMITTED = 'submitted',
    /**
     * Sending this version failed, as far as the user was told. It might still execute, though. The next send of the
     * same token to the same recipient is therefore a correction of it, with the same nonce.
     */
    FAILED = 'failed',
}

export interface GaslessPayment {
    /** The payment's latest signed version, the one with the latest deadline. */
    latest: TransferVersion;
    /** Every version signed for the payment, including `latest`. */
    versions: TransferVersion[];
    /** EIP-712 digest of `latest`, the relay request id. */
    id: string;
    status: GaslessPaymentStatus;
    /** Unix milliseconds */
    signedAt: number;
}

/** Keyed by sender and intent nonce, which identify a payment. */
export function gaslessPaymentKey(request: Pick<TransferRequest, 'from' | 'nonce'>) {
    return `${request.from.toLowerCase()}-${request.nonce}`;
}

export const useGaslessPaymentsStore = createStore({
    id: 'gaslessPayments',
    state: () => ({
        payments: {} as Record<string, GaslessPayment>,
        /**
         * The lowest intent nonce a new payment of a sender may take, by lowercase sender address: the nonce after its
         * last decided payment, or that payment's nonce if it expired. Guards against an RPC node behind the chain.
         */
        minNonces: {} as Record<string, string>,
    }),
    getters: {
        payments: (state): Readonly<Record<string, GaslessPayment>> => state.payments,
    },
    actions: {
        /** Records a newly signed version of a payment as its latest, keeping its earlier versions. */
        recordSigned(version: TransferVersion, id: string) {
            const key = gaslessPaymentKey(version.request);
            const earlier = this.state.payments[key]?.versions || [];
            Vue.set(this.state.payments, key, {
                latest: version,
                versions: [...earlier, version],
                id,
                status: GaslessPaymentStatus.SIGNED,
                signedAt: Date.now(),
            });
        },
        setStatus(request: Pick<TransferRequest, 'from' | 'nonce'>, status: GaslessPaymentStatus) {
            const payment = this.state.payments[gaslessPaymentKey(request)];
            if (!payment) return;
            Vue.set(this.state.payments, gaslessPaymentKey(request), { ...payment, status });
        },
        /**
         * Removes a payment once its outcome is final. `nextNonce` is the lowest nonce a new payment of the sender may
         * take afterwards.
         */
        settle(request: Pick<TransferRequest, 'from' | 'nonce'>, nextNonce: bigint) {
            Vue.delete(this.state.payments, gaslessPaymentKey(request));
            const sender = request.from.toLowerCase();
            if (BigInt(this.state.minNonces[sender] || '0') < nextNonce) {
                Vue.set(this.state.minNonces, sender, nextNonce.toString());
            }
        },
    },
});

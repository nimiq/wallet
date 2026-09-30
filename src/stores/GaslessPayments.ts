import Vue from 'vue';
import { createStore } from 'pinia';
import type { TransferRequest } from '@nimiq/gasless-sdk/core';

/**
 * Gasless USDC/USDT0 payments whose outcome is not final yet.
 *
 * Every version of a payment (e.g. re-signed with a higher fee) keeps the payment's intent nonce, so that at most one
 * version executes. To never let the user pay twice, the latest signed version of each payment is recorded as soon as
 * it is signed, before it is submitted, and kept until the chain shows at the finalized block that the payment either
 * executed or can no longer execute. Only the signed fields are stored, never signatures or the token permit.
 */
export enum GaslessPaymentStatus {
    /** Signed, but not (yet) known to be stored by the relay. */
    SIGNED = 'signed',
    /** Stored by the relay. */
    SUBMITTED = 'submitted',
    /** The relay refused this version and did not store it. A retry must be a correction with the same nonce. */
    REFUSED = 'refused',
}

export interface GaslessPayment {
    /** The payment's latest signed version. */
    latest: TransferRequest;
    /** EIP-712 digest of `latest`, the relay request id. */
    id: string;
    status: GaslessPaymentStatus;
    /** Unix milliseconds */
    signedAt: number;
}

/** Keyed by sender and intent nonce, which identify a payment. */
export function gaslessPaymentKey(request: Pick<TransferRequest, 'from' | 'nonce'>) {
    return `${request.from.toLowerCase()}-${request.nonce.toLowerCase()}`;
}

export const useGaslessPaymentsStore = createStore({
    id: 'gaslessPayments',
    state: () => ({
        payments: {} as Record<string, GaslessPayment>,
    }),
    getters: {
        payments: (state): Readonly<Record<string, GaslessPayment>> => state.payments,
    },
    actions: {
        /** Records a newly signed version of a payment, replacing an earlier version of it. */
        recordSigned(latest: TransferRequest, id: string) {
            Vue.set(this.state.payments, gaslessPaymentKey(latest), {
                latest,
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
        /** Removes a payment once its outcome is final. */
        settle(request: Pick<TransferRequest, 'from' | 'nonce'>) {
            Vue.delete(this.state.payments, gaslessPaymentKey(request));
        },
    },
});

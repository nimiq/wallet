/* eslint-disable import/no-cycle */

import { Transaction, TransactionState } from '@/stores/Transactions';
import { useCashlinkStore } from '@/stores/Cashlink';

// const FUNDING_CASHLINK = new Uint8Array([0, 130, 128, 146, 135]);
// const CLAIMING_CASHLINK = new Uint8Array([0, 139, 136, 141, 138]);

export const FUNDING_CASHLINK_HEX = '0082809287';
export const CLAIMING_CASHLINK_HEX = '008b888d8a';

export function isFundingCashlink(data: string | Readonly<string>) {
    return data.toLowerCase() === FUNDING_CASHLINK_HEX;
}

export function isClaimingCashlink(data: string | Readonly<string>) {
    return data.toLowerCase() === CLAIMING_CASHLINK_HEX;
}

export function isCashlinkData(data: string | Readonly<string>): boolean {
    return isFundingCashlink(data) || isClaimingCashlink(data);
}

export function handleFundingCashlinkTransaction(
    plain: Transaction,
    transactions: {[id: string]: Transaction},
): Transaction[] {
    const cashlinkAddress = plain.recipient;
    // Check if the related claiming tx is already known
    // This can be the case when I send cashlinks between two of my own addresses,
    // or when the transaction that is added right now is triggered by the cashlink's
    // transaction-history getting.
    const { claimed, removeClaimedCashlink, addFundedCashlink } = useCashlinkStore();
    if (claimed.value.includes(cashlinkAddress)) {
        // Find related claiming transaction
        // TODO: Use filter() to find multiple claiming txs?
        const claimingTx = Object.values(transactions)
            .find((tx) => tx.sender === cashlinkAddress);

        if (!claimingTx) {
            console.error(
                'A claiming tx for this cashlink should exist in the store, but none found.',
                cashlinkAddress,
            );
            return [plain];
        }

        if (claimingTx.state === TransactionState.CONFIRMED) {
            removeClaimedCashlink(cashlinkAddress);
        }

        return [
            { ...plain, relatedTransactionHash: claimingTx.transactionHash },
            { ...claimingTx, relatedTransactionHash: plain.transactionHash },
        ];
    }

    // Check blockchain for claiming tx, otherwise subscribe for future txs
    addFundedCashlink(cashlinkAddress);
    return [plain];
}

export function handleClaimingCashlinkTransaction(
    plain: Transaction,
    transactions: {[id: string]: Transaction},
): Transaction[] {
    const cashlinkAddress = plain.sender;
    // Check if the related funding tx is already known
    // This can be the case when I send cashlinks between two of my own addresses,
    // or when the transaction that is added right now is triggered by the cashlink's
    // transaction-history getting or subscription.
    const { funded, removeFundedCashlink, addClaimedCashlink } = useCashlinkStore();
    if (funded.value.includes(cashlinkAddress)) {
        // Find related funding transaction
        // TODO: Use filter() to find multiple funding txs?
        const fundingTx = Object.values(transactions)
            .find((tx) => tx.recipient === cashlinkAddress);

        if (!fundingTx) {
            console.error(
                'A funding tx for this cashlink should exist in the store, but none found.',
                cashlinkAddress,
            );
            return [plain];
        }


        if (fundingTx.state === TransactionState.CONFIRMED) {
            removeFundedCashlink(cashlinkAddress);
        }

        return [
            { ...plain, relatedTransactionHash: fundingTx.transactionHash },
            { ...fundingTx, relatedTransactionHash: plain.transactionHash },
        ];
    }

    // Check blockchain for funding tx
    addClaimedCashlink(cashlinkAddress);
    return [plain];
}

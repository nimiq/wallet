/* eslint-disable import/no-cycle */

import { Transaction, TransactionState } from '@/stores/Transactions';
import { useCashlinkStore } from '@/stores/Cashlink';

// const FUNDING_CASHLINK = new Uint8Array([0, 130, 128, 146, 135]);
// const CLAIMING_CASHLINK = new Uint8Array([0, 139, 136, 141, 138]);

const FUNDING_CASHLINK_HEX = '0082809287';
const CLAIMING_CASHLINK_HEX = '008b888d8a';

export function isFundingCashlink(data: string | Readonly<string>) {
    return data.toLowerCase() === FUNDING_CASHLINK_HEX;
}

export function isClaimingCashlink(data: string | Readonly<string>) {
    return data.toLowerCase() === CLAIMING_CASHLINK_HEX;
}

export function isCashlinkData(data: string | Readonly<string>): boolean {
    return isFundingCashlink(data) || isClaimingCashlink(data);
}

export function handleCashlinkTransaction(tx: Transaction, knownTransactions: Transaction[]): Transaction[] {
    const isFunding = isFundingCashlink(tx.data.raw);

    const cashlinkAddress = isFunding ? tx.recipient : tx.sender;

    // Check if the related tx is already known.
    // This can be the case when I send cashlinks between two of my own addresses,
    // or when the transaction that is added right now is triggered by the cashlink's
    // transaction-history or subscription.

    const { addFundedCashlink, addClaimedCashlink, removeFundedCashlink, removeClaimedCashlink } = useCashlinkStore();

    // Find related transaction
    // TODO: Use filter() to find multiple related txs?
    const relatedTx = knownTransactions.find((knownTx) =>
        (isFunding ? knownTx.sender : knownTx.recipient) === cashlinkAddress);

    if (!relatedTx) {
        if (isFunding) {
            // Check blockchain for related tx, otherwise subscribe for future txs
            addFundedCashlink(cashlinkAddress);
        } else {
            // Check blockchain for related tx
            addClaimedCashlink(cashlinkAddress);
        }

        return [tx];
    }

    if (relatedTx.state === TransactionState.CONFIRMED) {
        if (isFunding) {
            removeClaimedCashlink(cashlinkAddress);
        } else {
            removeFundedCashlink(cashlinkAddress);
        }
    }

    return [
        { ...tx, relatedTransactionHash: relatedTx.transactionHash },
        { ...relatedTx, relatedTransactionHash: tx.transactionHash },
    ];
}

import { Transaction, TransactionState } from '@/stores/Transactions';
import { useCashlinkStore } from '@/stores/Cashlink';
import { useAddressStore } from '@/stores/Address';

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

    const { addFundedCashlink, addClaimedCashlink, removeCashlink } = useCashlinkStore();

    // Find related transaction
    // TODO: Use filter() to find multiple related txs?
    const relatedTx = knownTransactions.find((knownTx) =>
        (isFunding ? knownTx.sender : knownTx.recipient) === cashlinkAddress);

    if (!relatedTx) {
        if (isFunding) {
            // Store cashlink, which triggers checking for related tx, or subscribing for future txs
            addFundedCashlink(cashlinkAddress);
        } else {
            // Store cashlink, which triggers checking for related tx
            addClaimedCashlink(cashlinkAddress);
        }

        return [tx];
    }

    // Check if either one of the cashlink transactions is both
    // - not yet confirmed
    // - does not belong to any of our addresses, which means we would not get network updates about it
    let needToSubscribeToCashlink = false;
    if (tx.state !== TransactionState.CONFIRMED) {
        const { state: addresses$ } = useAddressStore();
        needToSubscribeToCashlink = !addresses$.addressInfos[isFunding ? tx.sender : tx.recipient];
    }
    if (!needToSubscribeToCashlink && relatedTx.state !== TransactionState.CONFIRMED) {
        const { state: addresses$ } = useAddressStore();
        needToSubscribeToCashlink = !addresses$.addressInfos[isFunding ? relatedTx.recipient : relatedTx.sender];
    }

    if (needToSubscribeToCashlink) {
        if (isFunding) {
            // Store cashlink, which triggers checking for related tx, or subscribing for future txs
            addFundedCashlink(cashlinkAddress);
        } else {
            // Store cashlink, which triggers checking for related tx
            addClaimedCashlink(cashlinkAddress);
        }
    } else {
        removeCashlink(cashlinkAddress);
    }

    return [
        { ...tx, relatedTransactionHash: relatedTx.transactionHash },
        { ...relatedTx, relatedTransactionHash: tx.transactionHash },
    ];
}

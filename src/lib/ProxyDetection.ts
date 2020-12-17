import { Transaction, TransactionState } from '@/stores/Transactions';
import { useProxyStore } from '@/stores/Proxy';
import { useAddressStore } from '@/stores/Address';

export enum ProxyType {
    CASHLINK = 'cashlink',
}

export enum ProxyTransactionDirection {
    FUND = 'fund',
    REDEEM = 'redeem',
}

function proxyTransactionIdentifierToExtraData(identifier: string) {
    const extraData = new Uint8Array([
        0, // leading 0 to mark identifier extra data
        ...(identifier.split('').map((c) => c.charCodeAt(0) + 63)), // mapped to outside of basic ascii range
    ]);
    // convert to hex
    return extraData.reduce((hex, value) => hex + value.toString(16).padStart(2, '0'), '');
}

const ProxyExtraData = {
    [ProxyType.CASHLINK]: {
        [ProxyTransactionDirection.FUND]: proxyTransactionIdentifierToExtraData('CASH'),
        [ProxyTransactionDirection.REDEEM]: proxyTransactionIdentifierToExtraData('LINK'),
    },
};

export function isProxyData(data: string, proxyType?: ProxyType, transactionDirection?: ProxyTransactionDirection) {
    data = data.toLowerCase();
    const proxyTypesToCheck = proxyType ? [proxyType] : Object.values(ProxyType);
    const directionsToCheck = transactionDirection
        ? [transactionDirection]
        : [ProxyTransactionDirection.FUND, ProxyTransactionDirection.REDEEM];
    return proxyTypesToCheck.some((type) => directionsToCheck.some((dir) => ProxyExtraData[type][dir] === data));
}

export function handleProxyTransaction(tx: Transaction, knownTransactions: Transaction[]): Transaction[] {
    const isFunding = isProxyData(tx.data.raw, undefined, ProxyTransactionDirection.FUND);

    const proxyAddress = isFunding ? tx.recipient : tx.sender;

    // Check if the related tx is already known.
    // This can be the case when I send proxies/cashlinks between two of my own addresses,
    // or when the transaction that is added right now is triggered by the proxy's
    // transaction-history or subscription.

    const { addFundedProxy, addClaimedProxy, removeProxy } = useProxyStore();

    // Find related transaction
    // TODO: Use filter() to find multiple related txs?
    const relatedTx = knownTransactions.find((knownTx) =>
        (isFunding ? knownTx.sender : knownTx.recipient) === proxyAddress);

    // Check if we don't know the related tx yet or either one of the proxy transactions is both
    // - not yet confirmed
    // - does not belong to any of our addresses, which means we would not get network updates about it
    const { state: addresses$ } = useAddressStore();
    const needToSubscribeToProxy = !relatedTx
        || (tx.state !== TransactionState.CONFIRMED
            && !addresses$.addressInfos[isFunding ? tx.sender : tx.recipient])
        || (relatedTx.state !== TransactionState.CONFIRMED
            && !addresses$.addressInfos[isFunding ? relatedTx.recipient : relatedTx.sender]);

    if (needToSubscribeToProxy) {
        if (isFunding) {
            // Store proxy, which triggers checking for related tx, or subscribing for future txs
            addFundedProxy(proxyAddress);
        } else {
            // Store proxy, which triggers checking for related tx
            addClaimedProxy(proxyAddress);
        }
    } else {
        removeProxy(proxyAddress);
    }

    if (!relatedTx) return [tx];
    return [
        { ...tx, relatedTransactionHash: relatedTx.transactionHash },
        { ...relatedTx, relatedTransactionHash: tx.transactionHash },
    ];
}

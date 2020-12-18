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

export function handleProxyTransaction(tx: Transaction, knownTransactions: Transaction[]): Transaction | null {
    const isCashlink = isProxyData(tx.data.raw, ProxyType.CASHLINK);
    const isFunding = isProxyData(tx.data.raw, undefined, ProxyTransactionDirection.FUND);

    const proxyAddress = isFunding ? tx.recipient : tx.sender;
    const proxyTransactions = knownTransactions.filter((knownTx) => knownTx.sender === proxyAddress
        || knownTx.recipient === proxyAddress);

    // Check if the related tx is already known.
    // This can be the case when I send proxies/cashlinks between two of my own addresses,
    // or when the transaction that is added right now is triggered by the proxy's
    // transaction-history or subscription.

    const { addFundedProxy, addClaimedProxy, removeProxy } = useProxyStore();

    let relatedTx: Transaction | undefined;
    if (tx.relatedTransactionHash) {
        relatedTx = proxyTransactions.find((proxyTx) => proxyTx.transactionHash === tx.relatedTransactionHash);
    } else {
        // Find related transaction
        // Note that the proxy might be reused and we have to find the right related tx amongst others. Also note that
        // we don't detect the related transaction by proxy extra data because it is not required to include this data.
        // Also note that our available potentialRelatedTxs depend on which transactions have already been fetched from
        // the network and which not. Thus, there might be a slight non-determinism due to the order in which network
        // responses reach us.
        const potentialRelatedTxs = proxyTransactions.filter((proxyTx) =>
            // only consider the ones not related to another transaction yet
            !proxyTx.relatedTransactionHash
            // ignore invalid or expired transactions
            && proxyTx.state !== TransactionState.INVALIDATED
            && proxyTx.state !== TransactionState.EXPIRED
            // at least one of the transactions must be from or to one of our addresses
            && (!!addresses$.addressInfos[tx.sender] || !!addresses$.addressInfos[tx.recipient]
                || !!addresses$.addressInfos[proxyTx.sender] || !!addresses$.addressInfos[proxyTx.recipient])
            // check whether this is a potential related tx
            && (isFunding
                // proxy tx is redeeming
                ? (proxyTx.sender === proxyAddress
                    // is the redeeming tx later?
                    && (tx.timestamp && proxyTx.timestamp
                        ? tx.timestamp < proxyTx.timestamp
                        : tx.blockHeight && proxyTx.blockHeight
                            ? tx.blockHeight < proxyTx.blockHeight
                            // a tx's validity start height can also be earlier than the height at which it gets
                            // broadcast, thus this check can be off, but typically, this is not the case
                            : tx.validityStartHeight <= proxyTx.validityStartHeight)
                    // check the tx amount
                    && (isCashlink
                        // for cashlinks, partial redeeming is allowed
                        ? tx.value >= proxyTx.value + proxyTx.fee
                        // other proxies must be redeemed entirely
                        : tx.value === proxyTx.value + proxyTx.fee)
                )
                // proxy tx is funding
                : (proxyTx.recipient === proxyAddress
                    // is the redeeming tx earlier?
                    && (tx.timestamp && proxyTx.timestamp
                        ? tx.timestamp > proxyTx.timestamp
                        : tx.blockHeight && proxyTx.blockHeight
                            ? tx.blockHeight > proxyTx.blockHeight
                            // a tx's validity start height can also be earlier than the height at which it gets
                            // broadcast, thus this check can be off, but typically, this is not the case
                            : tx.validityStartHeight >= proxyTx.validityStartHeight)
                    // check the tx amount
                    && (isCashlink
                        // for cashlinks, partial redeeming is allowed
                        ? tx.value + tx.fee <= proxyTx.value
                        // other proxies must be redeemed entirely
                        : tx.value + tx.fee === proxyTx.value)
                )
            ),
        );

        // if there are multiple matching transactions (if any) assign them in a FIFO manner (assign first matching
        // funding tx to a redeeming tx and first matching redeeming tx to a funding tx). Therefore sort by time and
        // pick the first.
        [relatedTx] = potentialRelatedTxs.sort((tx1, tx2) => !!tx1.timestamp && !!tx2.timestamp
            ? tx1.timestamp - tx2.timestamp
            : !!tx1.blockHeight && !!tx2.blockHeight
                ? tx1.blockHeight - tx2.blockHeight
                : tx1.validityStartHeight - tx2.validityStartHeight,
        );
    }

    // Check whether we need to subscribe for network updates for the proxy address. This is the case if we don't know
    // the related transaction for a tx yet or if there is a transaction from or to the proxy which is not confirmed yet
    // and not related to one of our addresses which we are observing anyways.
    const { state: addresses$ } = useAddressStore();
    const needToSubscribeToProxy = !relatedTx || proxyTransactions.some((proxyTx) =>
        // If there is a transaction for which we don't know the related tx yet, we have to subscribe.
        // However, for the currently checked tx and its related tx we allow relatedTransactionHash to not be set yet as
        // it will only later be set in Transactions.ts. Instead, we separately test for !relatedTx before.
        // Note that we don't set the relatedTransactionsHash on the current tx here in ProxyDetection, as manipulation
        // of transaction store data should only be happening in the transaction store.
        (!proxyTx.relatedTransactionHash
            && proxyTx.transactionHash !== tx.transactionHash && proxyTx.transactionHash !== relatedTx!.transactionHash)
        // Is the tx not confirmed yet and not related to one of our subscribed addresses?
        || (proxyTx.state !== TransactionState.CONFIRMED
            && !addresses$.addressInfos[proxyTx.sender] && !addresses$.addressInfos[proxyTx.recipient]),
    );

    if (needToSubscribeToProxy) {
        if (isFunding) {
            // Store proxy, which triggers checking for related tx, or subscribing for future txs
            addFundedProxy(proxyAddress);
        } else {
            // Store proxy, which triggers checking for related tx
            addClaimedProxy(proxyAddress);
        }
    } else {
        // if the proxy doesn't need to be subscribed for any of its transactions anymore, remove it
        removeProxy(proxyAddress);
    }

    return relatedTx || null;
}

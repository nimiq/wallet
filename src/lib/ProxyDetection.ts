import { useTransactionsStore, Transaction, TransactionState } from '@/stores/Transactions';
import { useProxyStore } from '@/stores/Proxy';
import { useAddressStore } from '@/stores/Address';

export enum ProxyType {
    CASHLINK = 'cashlink',
    HTLC_PROXY = 'htlc-proxy',
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
    [ProxyType.HTLC_PROXY]: {
        [ProxyTransactionDirection.FUND]: proxyTransactionIdentifierToExtraData('HPFD'), // HTLC Proxy Funding
        [ProxyTransactionDirection.REDEEM]: proxyTransactionIdentifierToExtraData('HPRD'), // HTLC Proxy Redeeming
    },
};

export function isProxyData(
    data: string,
    proxyType?: ProxyType,
    transactionDirection?: ProxyTransactionDirection,
): boolean {
    data = data.toLowerCase();
    const proxyTypesToCheck = proxyType ? [proxyType] : Object.values(ProxyType);
    const directionsToCheck = transactionDirection
        ? [transactionDirection]
        : [ProxyTransactionDirection.FUND, ProxyTransactionDirection.REDEEM];
    return proxyTypesToCheck.some((type) => directionsToCheck.some((dir) =>
        type === ProxyType.HTLC_PROXY && dir === ProxyTransactionDirection.FUND
            ? data.startsWith(ProxyExtraData[type][dir]) // htlc proxy funding tx data can include additional public key
            : ProxyExtraData[type][dir] === data));
}

// map proxy address -> transaction hashes -> transaction; indexed by hash to avoid duplicates
let knownProxyTransactions: {[proxyAddress: string]: {[transactionHash: string]: Transaction}} | undefined;

function isProxyTransaction(tx: Transaction): boolean {
    return !!tx.relatedTransactionHash
        || isProxyData(tx.data.raw)
        // additional checks as proxy transactions are not guaranteed to hold the special proxy extra data
        || (!!knownProxyTransactions
            && (!!knownProxyTransactions[tx.sender] || !!knownProxyTransactions[tx.recipient]));
}

// Get the proxy address of a proxy transaction. The tx must have been checked before to be an actual proxy transaction.
function getProxyAddress(tx: Transaction): string {
    const { state: addresses$ } = useAddressStore();
    // Note: cashlink transactions always hold the proxy extra data. Also swap proxy transactions from or to our address
    // hold the proxy extra data. Only the htlc creation transactions from a proxy hold the htlc data instead.
    const isFunding = isProxyData(tx.data.raw, undefined, ProxyTransactionDirection.FUND)
        || !!addresses$.addressInfos[tx.sender] // sent from one of our addresses
        || useProxyStore().allProxies.value.some((proxy) => tx.recipient === proxy); // sent to proxy
    return isFunding ? tx.recipient : tx.sender;
}

export function cleanupKnownProxyTransactions(txs: Transaction[]) {
    if (!knownProxyTransactions) return;
    for (const tx of txs) {
        if (!isProxyTransaction(tx)) continue;
        const proxyAddress = getProxyAddress(tx);
        const proxyTransactions = knownProxyTransactions[proxyAddress];
        if (!proxyTransactions) continue;
        delete proxyTransactions[tx.transactionHash];
    }
}

export function detectProxyTransactions(
    txs: Transaction[],
    knownTransactions: {[transactionHash: string]: Transaction},
) {
    const { addFundedProxy, addClaimedProxy, removeProxy, triggerNetwork } = useProxyStore();
    const { state: addresses$ } = useAddressStore();
    const { setRelatedTransaction, state: transactions$ } = useTransactionsStore();

    // Update known proxies. Note that at least either the funding or redeeming proxy tx hold the proxy extra data and
    // that this transaction is known to us before the related tx because it's from or to one of our addresses. Thus, it
    // is added to the known proxy transactions already at the time we check the related tx and the related transaction
    // is not missed in the loop, even if it does not hold the data.
    if (!knownProxyTransactions) {
        // initialize the known proxy transactions
        knownProxyTransactions = {};
        for (const tx of Object.values(knownTransactions)) {
            if (!isProxyTransaction(tx)) continue;
            const proxyAddress = getProxyAddress(tx);
            let proxyTransactions = knownProxyTransactions[proxyAddress];
            if (!proxyTransactions) {
                proxyTransactions = {};
                knownProxyTransactions[proxyAddress] = proxyTransactions;
            }
            proxyTransactions[tx.transactionHash] = tx;
        }
    }

    const proxiesToProcess = new Set<string>();
    const proxiesToReEvaluate = new Set<string>();

    for (const tx of txs) {
        if (!isProxyTransaction(tx)) continue;
        const proxyAddress = getProxyAddress(tx);
        proxiesToProcess.add(proxyAddress);

        if (!knownTransactions[tx.transactionHash]) {
            // if we have entirely new proxy transactions (that have not just updated their state), we have to
            // re-evaluate our related tx mappings for that proxy
            proxiesToReEvaluate.add(proxyAddress);
        }

        // update known proxy transactions
        let proxyTransactions = knownProxyTransactions[proxyAddress];
        if (!proxyTransactions) {
            proxyTransactions = {};
            knownProxyTransactions[proxyAddress] = proxyTransactions;
        }
        proxyTransactions[tx.transactionHash] = tx;
    }

    for (const proxyToReEvaluate of proxiesToReEvaluate) {
        for (const tx of Object.values(knownProxyTransactions[proxyToReEvaluate])) {
            setRelatedTransaction(tx, null);
            knownProxyTransactions![proxyToReEvaluate][tx.transactionHash] = transactions$.transactions[
                tx.transactionHash];
        }
    }

    let needToTriggerNetwork = false;
    for (const proxyToProcess of proxiesToProcess) {
        const proxyTransactions = Object.values(knownProxyTransactions[proxyToProcess]);
        assignRelatedProxyTransactions(proxyToProcess, proxyTransactions);

        // Check whether we need to subscribe for network updates for the proxy address. This is the case if we don't
        // know the related transaction for a tx yet or if there is a transaction from or to the proxy which is not
        // confirmed yet and not related to one of our addresses which we are observing anyways.
        const needToSubscribeToProxy = proxyTransactions.some((proxyTx) =>
            !proxyTx.relatedTransactionHash
            || (proxyTx.state !== TransactionState.CONFIRMED
            && !addresses$.addressInfos[proxyTx.sender] && !addresses$.addressInfos[proxyTx.recipient]),
        );

        if (needToSubscribeToProxy) {
            // Store proxy for check on next networkTrigger
            needToTriggerNetwork = true;
            const hasFundingTx = proxyTransactions.some((proxyTx) => proxyTx.recipient === proxyToProcess);
            const hasClaimingTx = proxyTransactions.some((proxyTx) => proxyTx.sender === proxyToProcess);
            if (hasFundingTx) {
                addFundedProxy(proxyToProcess);
            }
            if (hasClaimingTx) {
                addClaimedProxy(proxyToProcess);
            }
        } else {
            // if the proxy doesn't need to be subscribed for any of its transactions anymore, remove it
            removeProxy(proxyToProcess);
        }
    }

    if (needToTriggerNetwork) triggerNetwork();
}

function isHtlcTransaction(tx: Transaction): boolean {
    return 'hashRoot' in tx.data // htlc creation
        || 'creator' in tx.proof // htlc refunding
        || 'hashRoot' in tx.proof; // htlc settlement
}

function assignRelatedProxyTransactions(proxyAddress: string, proxyTransactions: Transaction[]) {
    const { state: addresses$ } = useAddressStore();
    const { setRelatedTransaction, state: transactions$ } = useTransactionsStore();

    // We expect transactions to be sorted from most recent to oldest which is generally the case for fetched histories.
    // However, new transactions we get via subscriptions, are added later to knownProxyTransactions and therefore at
    // the end of the array. Also for htlc proxies prioritize transactions involved in actual htlc creation / redeeming
    // for them to find their match before remaining transactions are matched as proxy refunds.
    proxyTransactions.sort((tx1, tx2) => {
        // first sort by htlc involvement
        const isTx1HtlcTransaction = isHtlcTransaction(tx1);
        const isTx2HtlcTransaction = isHtlcTransaction(tx2);
        if (isTx1HtlcTransaction && !isTx2HtlcTransaction) return -1;
        if (!isTx1HtlcTransaction && isTx2HtlcTransaction) return 1;
        // then sort by date
        return tx1.timestamp && tx2.timestamp
            ? tx2.timestamp - tx1.timestamp
            : tx1.blockHeight && tx2.blockHeight
                ? tx2.blockHeight - tx1.blockHeight
                : tx2.validityStartHeight - tx1.validityStartHeight;
    });

    for (const tx of proxyTransactions) {
        if (tx.relatedTransactionHash) continue;

        // Find related transaction
        // Note that the proxy might be reused and we have to find the right related tx amongst others. Also note that
        // we don't detect the related transaction by proxy extra data because it is not required to include this data.
        // Also note that our available potentialRelatedTxs depend on which transactions have already been fetched from
        // the network and which not.
        let relatedTx: Transaction | undefined;
        const isCashlink = isProxyData(tx.data.raw, ProxyType.CASHLINK);
        const isFunding = proxyAddress === tx.recipient;
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

        // If there are multiple matching transactions (if any) pick the one which is time wise the closest.
        // For a funding tx that is the earliest redeeming tx and for a redeeming tx the latest funding tx (LIFO).
        // Note that we iterate the transactions from most recent to oldest to ensure correct LIFO assignments for
        // funding transactions. Otherwise for funding transactions A and B and redeeming transaction C, A-C would be
        // matched instead of B-C for given transaction order A B C.
        const isCloser = (checkedValue: number, currentBest: number, allowEquality = false) =>
            (allowEquality && checkedValue === currentBest)
            || (isFunding
                ? checkedValue < currentBest
                : checkedValue > currentBest);
        for (const potentialRelatedTx of potentialRelatedTxs) {
            if (!relatedTx
                || (!!relatedTx.timestamp && !!potentialRelatedTx.timestamp
                    ? isCloser(potentialRelatedTx.timestamp, relatedTx.timestamp)
                    : !!relatedTx.blockHeight && !!potentialRelatedTx.blockHeight
                        ? isCloser(potentialRelatedTx.blockHeight, relatedTx.blockHeight)
                        : isCloser(potentialRelatedTx.validityStartHeight, relatedTx.validityStartHeight, true))) {
                relatedTx = potentialRelatedTx;
            }
        }

        if (!relatedTx) continue;

        setRelatedTransaction(tx, relatedTx);
        knownProxyTransactions![proxyAddress][tx.transactionHash] = transactions$.transactions[tx.transactionHash];
        knownProxyTransactions![proxyAddress][relatedTx.transactionHash] = transactions$.transactions[
            relatedTx.transactionHash];
    }
}

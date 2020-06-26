/* eslint-disable no-console */
import { watch } from '@vue/composition-api';
import { NetworkClient } from '@nimiq/network-client';

import { SignedTransaction } from '@nimiq/hub-api';
import Config from 'config';
import { useAddressStore } from './stores/Address';
import { useTransactionsStore, Transaction, TransactionState } from './stores/Transactions';
import { useNetworkStore } from './stores/Network';
import { useCashlinkStore } from './stores/Cashlink';

let isLaunched = false;
let clientPromise: Promise<NetworkClient>;

export async function getNetworkClient() {
    clientPromise = clientPromise || new Promise((resolve) => {
        const client = NetworkClient.createInstance(Config.networkEndpoint);
        client.init().then(() => resolve(client));
    });

    return clientPromise;
}

export async function launchNetwork() {
    if (isLaunched) return;
    isLaunched = true;

    const client = await getNetworkClient();

    const { state: network$ } = useNetworkStore();
    const transactionsStore = useTransactionsStore();
    const addressStore = useAddressStore();

    function balancesListener(balances: Map<string, number>) {
        console.debug('Got new balances for', [...balances.keys()]);
        for (const [address, balance] of balances) {
            addressStore.patchAddress(address, { balance });
        }
    }
    client.on(NetworkClient.Events.BALANCES, balancesListener);

    client.on(NetworkClient.Events.CONSENSUS, (consensus) => network$.consensus = consensus);

    client.on(NetworkClient.Events.HEAD_HEIGHT, (height) => {
        console.debug('Head is now at', height);
        network$.height = height;
    });

    client.on(NetworkClient.Events.PEER_COUNT, (peerCount) => network$.peerCount = peerCount);

    function transactionListener(plain: Transaction) {
        transactionsStore.addTransactions([plain]);
    }
    client.on(NetworkClient.Events.TRANSACTION, transactionListener);

    // Subscribe to new addresses (for balance updates and transactions)
    const subscribedAddresses = new Set<string>();
    watch(addressStore.addressInfos, () => {
        const newAddresses: string[] = [];
        for (const address of Object.keys(addressStore.state.addressInfos)) {
            if (subscribedAddresses.has(address)) continue;
            subscribedAddresses.add(address);
            newAddresses.push(address);
        }
        if (!newAddresses.length) return;

        console.debug('Subscribing addresses', newAddresses);
        client.subscribe(newAddresses);
    });

    // Fetch transactions for active address
    const fetchedAddresses = new Set<string>();
    watch(addressStore.activeAddress, () => {
        const address = addressStore.activeAddress.value;

        if (!address || fetchedAddresses.has(address)) return;
        fetchedAddresses.add(address);

        const knownTxDetails = Object.values(transactionsStore.state.transactions)
            .filter((tx) => tx.sender === address || tx.recipient === address);

        // const lastConfirmedHeight = knownTxDetails
        //     .filter((tx) => tx.state === TransactionState.CONFIRMED)
        //     .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);

        network$.fetchingTxHistory++;

        console.debug('Fetching transaction history for', address, knownTxDetails);
        // FIXME: Re-enable lastConfirmedHeigth, but ensure it syncs from 0 the first time
        //        (even when cross-account transactions are already present)
        client.getTransactionsByAddress(address, /* lastConfirmedHeight - 10 */ 0, knownTxDetails)
            .then((txDetails) => {
                transactionsStore.addTransactions(txDetails);
            })
            .catch(() => fetchedAddresses.delete(address))
            .finally(() => network$.fetchingTxHistory--);
    });

    // Fetch transactions for cashlinks
    const cashlinkStore = useCashlinkStore();
    const fetchedCashlinks = new Set<string>();
    const subscribedCashlinks = new Set<string>();
    watch(cashlinkStore.networkTrigger, () => {
        const newAddresses: string[] = [];
        for (const address of cashlinkStore.allCashlinks.value) {
            if (fetchedCashlinks.has(address)) {
                // In case a funding cashlink is added, but the cashlink is already known from
                // a prior claiming cashlink tx, we need to subscribe the cashlink anyway.
                if (
                    !subscribedCashlinks.has(address)
                    && cashlinkStore.state.funded.includes(address)
                    && cashlinkStore.state.claimed.includes(address)
                ) {
                    subscribedCashlinks.add(address);
                    client.subscribe(address);
                }
                continue;
            }
            fetchedCashlinks.add(address);
            newAddresses.push(address);
        }
        if (!newAddresses.length) return;

        console.debug(`Fetching history for ${newAddresses.length} cashlink(s)`);

        for (const address of newAddresses) {
            const knownTxDetails = Object.values(transactionsStore.state.transactions)
                .filter((tx) => tx.sender === address || tx.recipient === address);

            network$.fetchingTxHistory++;

            console.debug('Fetching transaction history for', address, knownTxDetails);
            client.getTransactionsByAddress(address, 0, knownTxDetails)
                .then((txDetails) => {
                    if (
                        cashlinkStore.state.funded.includes(address)
                        && !subscribedCashlinks.has(address)
                        && !txDetails.find((tx) => tx.sender === address && tx.state === TransactionState.CONFIRMED)
                    ) {
                        // No claiming transactions found, or the claiming tx is not yet
                        // confirmed, so we need to subscribe for updates.
                        subscribedCashlinks.add(address);
                        client.subscribe(address);
                    }
                    transactionsStore.addTransactions(txDetails);
                })
                .catch(() => fetchedCashlinks.delete(address))
                .finally(() => network$.fetchingTxHistory--);
        }
    });
}

export async function sendTransaction(tx: SignedTransaction) {
    launchNetwork();

    const client = NetworkClient.Instance;

    return client.sendTransaction(tx.serializedTx);
}

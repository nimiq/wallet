/* eslint-disable no-console */
import { watch } from '@vue/composition-api';
import { SignedTransaction } from '@nimiq/hub-api';
import Config from 'config';

import { useAddressStore } from './stores/Address';
import { useTransactionsStore/* , TransactionState */ } from './stores/Transactions';
import { useNetworkStore } from './stores/Network';
// import { useProxyStore } from './stores/Proxy';

import { RawValidator, useStakingStore } from './stores/Staking';
import { STAKING_CONTRACT_ADDRESS } from './lib/Constants';
import { AlbatrossRpcClient, Transaction } from './albatross';

let isLaunched = false;
let clientPromise: Promise<AlbatrossRpcClient>;

export async function getNetworkClient() {
    clientPromise = clientPromise || Promise.resolve(new AlbatrossRpcClient(Config.networkEndpoint));

    return clientPromise;
}

export async function launchNetwork() {
    if (isLaunched) return;
    isLaunched = true;

    const client = await getNetworkClient();

    const { state: network$ } = useNetworkStore();
    const transactionsStore = useTransactionsStore();
    const addressStore = useAddressStore();
    const stakingStore = useStakingStore();

    // function balancesListener(balances: Map<string, number>) {
    //     console.debug('Got new balances for', [...balances.keys()]);
    //     for (const [address, balance] of balances) {
    //         addressStore.patchAddress(address, { balance });
    //     }
    // }
    // client.on(NetworkClient.Events.BALANCES, balancesListener);

    // let consensusConnectingTimeout: number | undefined;
    // function startConnectingTimeout() {
    //     consensusConnectingTimeout = window.setTimeout(() => {
    //         network$.consensus = 'connecting';
    //         consensusConnectingTimeout = undefined;
    //     }, 5e3); // Show disconnected state after 5 seconds
    // }
    // function stopConnectingTimeout() {
    //     window.clearTimeout(consensusConnectingTimeout);
    //     consensusConnectingTimeout = undefined;
    // }

    // client.on(NetworkClient.Events.CONSENSUS, (consensus) => {
    //     network$.consensus = consensus;
    //
    //     if (consensus === 'syncing' && !consensusConnectingTimeout) {
    //         startConnectingTimeout();
    //     } else {
    //         stopConnectingTimeout();
    //     }
    // });
    //
    // window.addEventListener('offline', () => {
    //     console.warn('Browser is OFFLINE');
    //     startConnectingTimeout();
    // });
    // window.addEventListener('online', () => {
    //     console.info('Browser is ONLINE');
    //     stopConnectingTimeout();
    //     client.resetConsensus();
    // });

    client.addHeadChangedListener((block) => {
        const { height } = block;
        console.debug('Head is now at', height);
        network$.height = height;

        if (block.type === 'macro' && block.isElectionBlock) {
            updateValidators();
        }
    });

    // client.on(NetworkClient.Events.PEER_COUNT, (peerCount) => network$.peerCount = peerCount);

    function transactionListener(plain: Transaction) {
        transactionsStore.addTransactions([plain]);

        // Update affected address balances
        const affectedAddresses: string[] = [];
        if (addressStore.state.addressInfos[plain.sender]) affectedAddresses.push(plain.sender);
        if (addressStore.state.addressInfos[plain.recipient]) affectedAddresses.push(plain.recipient);
        for (const address of affectedAddresses) {
            client.getAccount(address).then((account) => {
                addressStore.patchAddress(address, {
                    balance: account.balance,
                });
            });
        }

        // If the transaction touched the staking contract, update address's staking data
        if (plain.sender === STAKING_CONTRACT_ADDRESS || plain.recipient === STAKING_CONTRACT_ADDRESS) {
            const address = plain.sender === STAKING_CONTRACT_ADDRESS ? plain.recipient : plain.sender;
            client.getStaker(address).then((staker) => {
                stakingStore.setStake({
                    address,
                    balance: staker.balance,
                    validator: staker.delegation,
                });
            }).catch(() => {
                // Staker not found
                stakingStore.removeStake(address);
            });
        }
    }

    async function updateValidators() {
        const stakes = await client.listStakes();
        const totalStake = Object.values(stakes)
            .reduce((sum, stake) => sum + stake, 0);

        const validators: RawValidator[] = Object.entries(stakes).map(([address, balance]) => ({
            address,
            dominance: balance / totalStake,
        }));

        stakingStore.setValidators(validators);
    }
    updateValidators();

    const subscribedAddresses = new Set<string>();
    const fetchedAddresses = new Set<string>();

    // Subscribe to new addresses (for balance updates and transactions)
    // Also remove logged out addresses from fetched (so that they get fetched on next login)
    watch(addressStore.addressInfos, () => {
        const newAddresses: string[] = [];
        const removedAddresses = new Set(subscribedAddresses);

        for (const address of Object.keys(addressStore.state.addressInfos)) {
            if (subscribedAddresses.has(address)) {
                removedAddresses.delete(address);
                continue;
            }

            subscribedAddresses.add(address);
            newAddresses.push(address);
        }

        if (removedAddresses.size) {
            for (const removedAddress of removedAddresses) {
                subscribedAddresses.delete(removedAddress);
                fetchedAddresses.delete(removedAddress);
            }
            // Let the network forget the balances of the removed addresses,
            // so that they are reported as new again at re-login.
            // client.forgetBalances([...removedAddresses]);
        }

        if (!newAddresses.length) return;

        console.debug('Subscribing addresses', newAddresses);
        for (const address of newAddresses) {
            client.addTransactionListener(transactionListener, address);
            client.getAccount(address).then((account) => {
                addressStore.patchAddress(address, {
                    balance: account.balance,
                });
            });
            client.getStaker(address).then((staker) => {
                stakingStore.setStake({
                    address,
                    balance: staker.balance,
                    validator: staker.delegation,
                });
            }).catch(() => {
                // Staker not found
                stakingStore.removeStake(address);
            });
        }
    });

    // Fetch transactions for active address
    watch(addressStore.activeAddress, (address) => {
        if (!address || fetchedAddresses.has(address)) return;
        fetchedAddresses.add(address);

        const knownTxDetails = Object.values(transactionsStore.state.transactions)
            .filter((tx) => tx.sender === address || tx.recipient === address);

        // const lastConfirmedHeight = knownTxDetails
        //     .filter((tx) => tx.state === TransactionState.CONFIRMED)
        //     .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);

        network$.fetchingTxHistory++;

        console.debug('Fetching transaction history for', address, knownTxDetails);
        // FIXME: Re-enable lastConfirmedHeight, but ensure it syncs from 0 the first time
        //        (even when cross-account transactions are already present)
        client.getTransactionsByAddress(address, /* lastConfirmedHeight - 10 */ 0, knownTxDetails)
            .then((txDetails) => {
                transactionsStore.addTransactions(txDetails);
            })
            .catch(() => fetchedAddresses.delete(address))
            .then(() => network$.fetchingTxHistory--);
    });

    // // Fetch transactions for proxies
    // const proxyStore = useProxyStore();
    // const seenProxies = new Set<string>();
    // const subscribedProxies = new Set<string>();
    // watch(proxyStore.networkTrigger, () => {
    //     const newProxies: string[] = [];
    //     const addressesToSubscribe: string[] = [];
    //     for (const proxyAddress of proxyStore.allProxies.value) {
    //         if (!seenProxies.has(proxyAddress)) {
    //             // For new addresses the tx history and if required subscribing is handled below
    //             seenProxies.add(proxyAddress);
    //             newProxies.push(proxyAddress);
    //             continue;
    //         }

    //         // If we didn't subscribe in the first pass, subscribe on second pass if needed, see below.
    //         if (
    //             !subscribedProxies.has(proxyAddress)
    //             && proxyStore.state.funded.includes(proxyAddress)
    //             && proxyStore.state.claimed.includes(proxyAddress)
    //         ) {
    //             subscribedProxies.add(proxyAddress);
    //             addressesToSubscribe.push(proxyAddress);
    //         }
    //     }
    //     if (addressesToSubscribe.length) {
    //         for (const address of addressesToSubscribe) {
    //             client.addTransactionListener(transactionListener, address);
    //         }
    //     }
    //     if (!newProxies.length) return;

    //     console.debug(`Fetching history for ${newProxies.length} proxies`);

    //     for (const proxyAddress of newProxies) {
    //         const knownTxDetails = Object.values(transactionsStore.state.transactions)
    //             .filter((tx) => tx.sender === proxyAddress || tx.recipient === proxyAddress);

    //         network$.fetchingTxHistory++;

    //         console.debug('Fetching transaction history for', proxyAddress, knownTxDetails);
    //         client.getTransactionsByAddress(proxyAddress, 0, knownTxDetails)
    //             .then((txDetails) => {
    //                 if (
    //                     proxyStore.state.funded.includes(proxyAddress)
    //                     && !subscribedProxies.has(proxyAddress)
    //                     && !txDetails.find((tx) => tx.sender === proxyAddress
    //                         && tx.state === TransactionState.CONFIRMED)
    //                 ) {
    /* eslint-disable max-len */
    //                     // No claiming transactions found, or the claiming tx is not yet confirmed, so we might need to
    //                     // subscribe for updates.
    //                     // If we were triggered by a funding transaction, we have to subscribe in any case because we
    //                     // don't know when and to where the proxy will be claimed. If we were triggered by a claimed
    //                     // transaction and don't know the funding transaction yet wait with subscribing until the second
    //                     // pass to see whether we actually have to subscribe (which is for example not the case if
    //                     // funding and claiming are both from/to addresses that are subscribed anyways; see
    //                     // needToSubscribe in ProxyDetection).
    //                     // If the funding tx has not been known so far, it will be added to the transaction store below
    //                     // which in turn runs the ProxyDetection again and triggers the network and this watcher again
    //                     // for the second pass if needed.
    /* eslint-enable max-len */
    //                     subscribedProxies.add(proxyAddress);
    //                     client.addTransactionListener(transactionListener, proxyAddress);
    //                 }
    //                 transactionsStore.addTransactions(txDetails);
    //             })
    //             .catch(() => seenProxies.delete(proxyAddress))
    //             .then(() => network$.fetchingTxHistory--);
    //     }
    // });
}

export async function sendTransaction(tx: SignedTransaction | string) {
    const client = await getNetworkClient();
    const plain = await client.sendTransaction(typeof tx === 'string' ? tx : tx.serializedTx);

    // if (plain.state !== TransactionState.PENDING) {
    //     // Overwrite transaction status in the transactionStore,
    //     // because it got added as PENDING before by the transactionListener.
    //     useTransactionsStore().addTransactions([plain]);
    // }

    return plain;
}

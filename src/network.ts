/* eslint-disable no-console */
import { watch } from '@vue/composition-api';
import { SignedTransaction } from '@nimiq/hub-api';
import Config from 'config';

// @ts-expect-error no types
import { createRemote } from './lib/gentle_rpc/remote';
// @ts-expect-error no types
import { wsProxyHandler } from './lib/gentle_rpc/proxy';

import { useAddressStore } from './stores/Address';
import { useTransactionsStore, Transaction/* , TransactionState */ } from './stores/Transactions';
import { useNetworkStore } from './stores/Network';
// import { useProxyStore } from './stores/Proxy';

import { Account, Block, Staker, Stakes } from '../../../github/albatross-remote/src/lib/server-types';
import { RawValidator, useStakingStore } from './stores/Staking';
import { STAKING_CONTRACT_ADDRESS } from './lib/Constants';

let isLaunched = false;
let clientPromise: Promise<AlbatrossRpcClient>;

export enum ConsensusState {
    CONNECTING = 'connecting',
    SYNCING = 'syncing',
    ESTABLISHED = 'established',
}

export type Handle = number;
export type ConsensusChangedListener = (consensusState: ConsensusState) => any;
export type HeadChangedListener = (block: Block) => any;
export type TransactionListener = (transaction: Transaction) => any;

class AlbatrossRpcClient {
    private url: string;
    private remote?: Promise<any>;
    private blockSubscriptions: {
        [handle: number]: HeadChangedListener,
    } = {};

    private transactionSubscriptions: {
        [address: string]: TransactionListener[],
    } = {};

    constructor(url: string) {
        this.url = url;

        this.getRemote().then(async (remote) => {
            const id = await remote.headSubscribe([]);
            const { generator } = remote.subscription.listen();
            for await (const params of generator) {
                if (!params || params.subscription !== id) continue;

                const blockHash = params.result as string;
                // eslint-disable-next-line no-await-in-loop
                const block = await remote.getBlockByHash([blockHash, true]) as Block;
                if (!block) continue;

                // Trigger block listeners
                for (const listener of Object.values(this.blockSubscriptions)) {
                    listener(block);
                }

                // Trigger transaction listeners
                const addresses = Object.keys(this.transactionSubscriptions);
                for (const tx of block.transactions || []) {
                    // Even if the transaction is between two of our own (and thus subscribed) addresses,
                    // we only need to trigger one tx listener, as the tx is then added for both addresses
                    // and the handler also updates the balances of both addresses.
                    const address = addresses.includes(tx.sender)
                        ? tx.sender
                        : addresses.includes(tx.recipient)
                            ? tx.recipient
                            : null;

                    if (address) {
                        for (const listener of this.transactionSubscriptions[address]) {
                            listener(tx);
                        }
                    }
                }
            }
        });
    }

    public addHeadChangedListener(listener: HeadChangedListener): Handle {
        let handle: Handle;
        do {
            handle = Math.round(Math.random() * 1000);
        } while (this.blockSubscriptions[handle]);

        this.blockSubscriptions[handle] = listener;
        return handle;
    }

    public addTransactionListener(listener: TransactionListener, address: string) {
        const listeners = this.transactionSubscriptions[address] || [];
        listeners.push(listener);
        this.transactionSubscriptions[address] = listeners;
    }

    public async getTransactionsByAddress(
        address: string,
        _fromHeight?: number,
        _knownTxs?: Transaction[],
        max?: number,
    ) {
        return this.rpc('getTransactionsByAddress', [address, max || null]) as Promise<Transaction[]>;
    }

    public async sendTransaction(tx: string | Transaction) {
        if (typeof tx === 'string') {
            const hash = await this.rpc<string>('sendRawTransaction', [tx]);
            do {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((res) => setTimeout(res, 500));
                try {
                    // eslint-disable-next-line no-await-in-loop
                    return await this.rpc('getTransactionByHash', [hash]) as Transaction;
                } catch (error) {
                    if (error.data && error.data.includes('Transaction not found')) continue;
                    console.error(error);
                }
            } while (true); // eslint-disable-line no-constant-condition
        } else {
            throw new Error('UNIMPLEMENTED: sending transaction objects');
        }
    }

    public async getAccount(address: string): Promise<Account> {
        return this.rpc<Account>('getAccount', [address]);
    }

    public async getStaker(address: string): Promise<Staker> {
        return this.rpc<Staker>('getStaker', [address]);
    }

    public async listStakes(): Promise<Stakes> {
        return this.rpc<Stakes>('listStakes');
    }

    private async getRemote(): Promise<any> {
        return this.remote || (this.remote = new Promise((resolve) => {
            const ws = new WebSocket(`${this.url.replace('http', 'ws')}/ws`);
            createRemote(ws).then((remote: any) => {
                const proxy = new Proxy(
                    remote,
                    wsProxyHandler,
                );
                resolve(proxy);
            });
        }));
    }

    private async rpc<T>(method: string, params: any[] = []): Promise<T> {
        const remote = await this.getRemote();
        return remote[method](params);
    }
}

export async function getNetworkClient() {
    clientPromise = clientPromise || Promise.resolve(new AlbatrossRpcClient(Config.networkEndpoint));

    return clientPromise;
}

async function reconnectNetwork(peerSuggestions?: Nimiq.Client.PeerInfo[]) {
    const client = await getNetworkClient();

    // @ts-expect-error This method was added in v1.5.8, but not added to type declarations
    await client.resetConsensus();

    // Re-add deep listeners to new consensus
    subscribeToPeerCount();
    for (const [callback] of onPeersUpdatedCallbacks) {
        const [peersChangedId, addressAddedId] = await Promise.all([ // eslint-disable-line no-await-in-loop
            onNetworkPeersChanged(callback),
            onNetworkAddressAdded(callback),
        ]);
        onPeersUpdatedCallbacks.set(callback, {
            peersChangedId,
            addressAddedId,
        });
    }

    if (peerSuggestions && peerSuggestions.length > 0) {
        const interval = window.setInterval(() => {
            peerSuggestions.forEach((peer) => client.network.connect(peer.peerAddress));
        }, 1000);
        await client.waitForConsensusEstablished();
        window.clearInterval(interval);
    }
}

async function disconnectNetwork() {
    const client = await getNetworkClient();

    const peers = await client.network.getPeers();
    await Promise.all(peers.map(
        ({ peerAddress }) => client.network.disconnect(peerAddress),
    ));
    return peers;
}

const onPeersUpdatedCallbacks = new Map<() => any, {
    peersChangedId: number,
    addressAddedId: number,
}>();

export async function onPeersUpdated(callback: () => any) {
    const [peersChangedId, addressAddedId] = await Promise.all([
        onNetworkPeersChanged(callback),
        onNetworkAddressAdded(callback),
    ]);
    onPeersUpdatedCallbacks.set(callback, {
        peersChangedId,
        addressAddedId,
    });
}

export async function offPeersUpdated(callback: () => any) {
    const ids = onPeersUpdatedCallbacks.get(callback);
    if (!ids) return;

    const client = await getNetworkClient();

    // @ts-expect-error Private property access
    const consensus = await client._consensus as Nimiq.BaseMiniConsensus;
    consensus.network.off('peers-changed', ids.peersChangedId);
    consensus.network.addresses.off('added', ids.addressAddedId);
    onPeersUpdatedCallbacks.delete(callback);
}

async function onNetworkPeersChanged(callback: () => any) {
    const client = await getNetworkClient();

    // @ts-expect-error Private property access
    const consensus = await client._consensus as Nimiq.BaseMiniConsensus;
    return consensus.network.on('peers-changed', callback);
}

async function onNetworkAddressAdded(callback: () => any) {
    const client = await getNetworkClient();

    // @ts-expect-error Private property access
    const consensus = await client._consensus as Nimiq.BaseMiniConsensus;
    return consensus.network.addresses.on('added', callback);
}

async function subscribeToPeerCount() {
    return onNetworkPeersChanged(async () => {
        const client = await getNetworkClient();
        const statistics = await client.network.getStatistics();
        const peerCount = statistics.totalPeerCount;
        useNetworkStore().state.peerCount = peerCount;
    });
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

        if (block.type === 'macro' && block.is_election_block) {
            updateValidators();
        }
    });

    // client.on(NetworkClient.Events.PEER_COUNT, (peerCount) => network$.peerCount = peerCount);

    function transactionListener(tx: Nimiq.Client.TransactionDetails) {
        const plain = tx.toPlain();
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
                    activeStake: staker.activeStake,
                    inactiveStake: staker.inactiveStake,
                    validator: staker.delegation,
                    retireTime: staker.retireTime,
                });
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
                    activeStake: staker.activeStake,
                    inactiveStake: staker.inactiveStake,
                    validator: staker.delegation,
                    retireTime: staker.retireTime,
                });
            }).catch(() => {
                // Staker not found
                stakingStore.removeStake(address);
            });
        }
    });

    // Fetch transactions for active address
    watch([addressStore.activeAddress, txFetchTrigger], ([activeAddress]) => {
        const address = activeAddress as string | null;
        if (!address || fetchedAddresses.has(address)) return;
        fetchedAddresses.add(address);

        console.debug('Scheduling transaction fetch for', address);

        const knownTxDetails = Object.values(transactionsStore.state.transactions)
            .filter((tx) => tx.sender === address || tx.recipient === address);

        // const lastConfirmedHeight = knownTxDetails
        //     .filter((tx) => tx.state === TransactionState.CONFIRMED)
        //     .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);

        network$.fetchingTxHistory++;

        updateBalances([address]);

        // FIXME: Re-enable lastConfirmedHeight, but ensure it syncs from 0 the first time
        //        (even when cross-account transactions are already present)
        client.waitForConsensusEstablished()
            .then(() => {
                console.debug('Fetching transaction history for', address, knownTxDetails);
                return client.getTransactionsByAddress(address, /* lastConfirmedHeight - 10 */ 0, knownTxDetails);
            })
            .then((txDetails) => {
                transactionsStore.addTransactions(txDetails.map((tx) => tx.toPlain()));
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
    const plain = await client.sendTransaction(typeof tx === 'string' ? tx : tx.serializedTx)
        .then((details) => details.toPlain());

    if (plain.state !== TransactionState.PENDING) {
        // Overwrite transaction status in the transactionStore,
        // because it got added as PENDING before by the transactionListener.
        useTransactionsStore().addTransactions([plain]);
    }

    return plain;
}

// @ts-expect-error debugging
window.gimmeclient = async function gimmeclient() {
    // @ts-expect-error debugging
    window.client = await getNetworkClient();
};

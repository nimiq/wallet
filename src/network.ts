/* eslint-disable no-console */
import { ref, watch } from 'vue';
import { SignedTransaction } from '@nimiq/hub-api';
import type { Client, PlainStakingContract, PlainTransactionDetails } from '@nimiq/core';

import { useAddressStore } from './stores/Address';
import { useTransactionsStore, TransactionState } from './stores/Transactions';
import { useNetworkStore } from './stores/Network';
import { useProxyStore } from './stores/Proxy';
import { useConfig } from './composables/useConfig';
import { AddStakeEvent, ApiValidator, RawValidator, useStakingStore } from './stores/Staking';
import { ENV_MAIN, STAKING_CONTRACT_ADDRESS } from './lib/Constants';
import { reportToSentry } from './lib/Sentry';
import { useAccountStore } from './stores/Account';

let isLaunched = false;
let clientPromise: Promise<Client>;

type Balances = Map<string, number>;
const balances: Balances = new Map(); // Balances in Luna, excluding pending txs

let clientStartTimestamp: number | undefined;

export async function getNetworkClient() {
    const { config } = useConfig();

    // eslint-disable-next-line no-async-promise-executor
    clientPromise = clientPromise || (async () => {
        // Note: we don't need to reset clientPromise on changes to the config because we only use config.environment
        // which never changes at runtime. Changing config.nimiqSeeds at runtime is not supported.
        const { ClientConfiguration, Client } = await import('@nimiq/core');
        const clientConfig = new ClientConfiguration();
        clientConfig.network(config.environment === ENV_MAIN ? 'mainalbatross' : 'testalbatross');
        clientConfig.seedNodes(config.nimiqSeeds);
        clientConfig.syncMode('pico');
        clientConfig.logLevel('debug');
        clientStartTimestamp = Date.now();
        return Client.create(clientConfig.build());
    })();

    return clientPromise;
}

async function reconnectNetwork() {
    const client = await getNetworkClient();
    await client.connectNetwork();
}

async function disconnectNetwork() {
    const client = await getNetworkClient();
    await client.disconnectNetwork();
}

let updatingValidators = false;
export async function updateValidators(client: Client) {
    if (updatingValidators) return;
    updatingValidators = true;

    await client.waitForConsensusEstablished();
    const contract = await retry(
        () => client.getAccount(STAKING_CONTRACT_ADDRESS) as Promise<PlainStakingContract>,
    ).catch(reportFor('getAccount(staking contract)'));
    if (!contract) {
        updatingValidators = false;
        return;
    }

    const activeValidators = contract.activeValidators.map(([address, balance]) => ({
        address,
        balance,
    }));
    const activeStake = activeValidators.reduce((sum, validator) => sum + validator.balance, 0);

    const validators: RawValidator[] = activeValidators.map(({ address, balance }) => ({
        address,
        active: true,
        balance,
        dominance: balance / activeStake,
    }));

    useStakingStore().setValidators(validators);
    updatingValidators = false;
}

function reportFor(method: string) {
    return (error: Error) => {
        const accountId = useAccountStore().state.activeAccountId ?? undefined;
        reportToSentry(error, { extra: { method }, accountId });
    };
}

export async function launchNetwork() {
    if (isLaunched) return;
    isLaunched = true;

    const {
        state: network$,
        addPeer,
        removePeer,
        patch: patchNetworkStore,
        fetchedAddresses,
        addFetchedAddress,
        removeFetchedAddress,
        clearFetchedAddresses,
    } = useNetworkStore();
    const transactionsStore = useTransactionsStore();
    const addressStore = useAddressStore();
    const stakingStore = useStakingStore();

    const subscribedAddresses = new Set<string>();

    const subscribedProxies = new Set<string>();
    const seenProxies = new Set<string>();

    // Avoid "Failed to fetch transactions" warning showing while initializing the Nimiq SDK,
    // already shows "Fetching" instead.
    network$.fetchingTxHistory++;

    const client = await getNetworkClient();

    // Reset, to not show "Fetching" forever ;-)
    network$.fetchingTxHistory--;

    async function updateBalances(addresses: string[] = [...balances.keys()]) {
        if (!addresses.length) return;
        await client.waitForConsensusEstablished();
        const accounts = await retry(() => client.getAccounts(addresses)).catch(reportFor('getAccounts'));
        if (!accounts) return;
        const newBalances: Balances = new Map(
            accounts.map((account, i) => [addresses[i], account.balance]),
        );

        for (const [address, newBalance] of newBalances) {
            if (balances.get(address) === newBalance) {
                // Balance did not change since last check.
                // Remove from newBalances Map to not update the store.
                newBalances.delete(address);
            } else {
                // Update balances cache
                balances.set(address, newBalance);
            }
        }

        if (!newBalances.size) return;
        console.debug('Got new balances for', [...newBalances.keys()]);
        for (const [address, balance] of newBalances) {
            addressStore.patchAddress(address, { balance });
        }
    }

    async function updateStakes(addresses: string[] = [...balances.keys()]) {
        if (!addresses.length) return;
        await client.waitForConsensusEstablished();
        const stakers = await retry(() => client.getStakers(addresses)).catch(reportFor('getStakers'));
        if (!stakers) return;
        stakers.forEach((staker, i) => {
            const address = addresses[i];
            if (staker) {
                stakingStore.setStake({
                    address,
                    activeBalance: staker.balance,
                    inactiveBalance: staker.inactiveBalance,
                    inactiveRelease: staker.inactiveRelease,
                    validator: staker.delegation,
                    retiredBalance: staker.retiredBalance,
                });
            } else {
                // Staker does not exist (anymore)
                stakingStore.removeStake(address);
            }
        });
    }

    watch([addressStore.activeAddress], ([activeAddress]) => {
        if (!activeAddress) return;
        const { config } = useConfig();
        const endpoint = config.staking.stakeEventsEndpoint;
        const url = endpoint.replace('ADDRESS', activeAddress.replaceAll(' ', '+'));
        retry(
            () => fetch(url)
                .then((res) => res.json())
                .then((events: AddStakeEvent[]) => {
                    useStakingStore().setStakingEvents(activeAddress, events);
                    console.log('Got add-stake events for', activeAddress, events);
                }),
            { maxRetries: 3 },
        ).catch(reportFor('fetch(add-stake events)'));
    });

    function forgetBalances(addresses: string[]) {
        for (const address of addresses) {
            balances.delete(address);
        }
    }

    const txFetchTrigger = ref(0);
    function invalidateTransactionHistory(includeProxies = false) {
        // Invalidate fetched addresses
        clearFetchedAddresses();
        // Trigger watcher
        txFetchTrigger.value += 1;

        // Do the same for proxies if requested
        if (includeProxies) {
            seenProxies.clear();
            proxyStore.triggerNetwork();
        }
    }

    // Start as true, since at app start everything is already invalidated and unconnected
    let txHistoryWasInvalidatedSinceLastConsensus = true;
    let networkWasReconnectedSinceLastConsensus = true;
    client.addConsensusChangedListener(async (consensus) => {
        network$.consensus = consensus;
        if (clientStartTimestamp) {
            // @ts-expect-error Matomo action queue is not typed
            window._paq.push([
                'trackEvent',
                'Network', // Category
                'Consensus', // Action
                consensus, // Name
                Math.round((Date.now() - clientStartTimestamp) / 100) / 10, // Value
            ]);
            if (consensus === 'established') {
                // Prevent reporting of reconnections after the first time consensus was established
                clientStartTimestamp = undefined;
            }
        }

        if (consensus === 'established') {
            const stop = watch(() => network$.fetchingTxHistory, (fetching) => {
                if (fetching === 0) {
                    txHistoryWasInvalidatedSinceLastConsensus = false;
                    stop();
                }
            }, { lazy: true });
            networkWasReconnectedSinceLastConsensus = false;
        } else if (!txHistoryWasInvalidatedSinceLastConsensus) {
            invalidateTransactionHistory(true);
            updateBalances();
            updateStakes();
            txHistoryWasInvalidatedSinceLastConsensus = true;
        }
    });

    let lastVisibilityFetch = Date.now();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;

        if (Date.now() - lastVisibilityFetch > useConfig().config.pageVisibilityTxRefreshInterval) {
            if (!txHistoryWasInvalidatedSinceLastConsensus) {
                invalidateTransactionHistory();
                lastVisibilityFetch = Date.now();
            }
        }

        // If network is disconnected when going back to app, trigger reconnect
        if (useNetworkStore().state.consensus === 'connecting' && !networkWasReconnectedSinceLastConsensus) {
            disconnectNetwork().then(reconnectNetwork);
            networkWasReconnectedSinceLastConsensus = true;
        }
    });

    let reconnectTimeout: number | undefined;
    window.addEventListener('offline', async () => {
        console.warn('Browser is OFFLINE');
        if (reconnectTimeout) window.clearTimeout(reconnectTimeout);
        disconnectNetwork();
    });
    window.addEventListener('online', () => {
        console.info('Browser is ONLINE');
        reconnectTimeout = window.setTimeout(() => {
            reconnectNetwork();
            reconnectTimeout = undefined;
        }, 1000);
    });

    let currentEpoch = 0;

    client.addHeadChangedListener(async (hash) => {
        const block = await retry(() => client.getBlock(hash)).catch(reportFor('getBlock'));
        if (!block) return;
        const { height, timestamp, epoch } = block;
        console.log('Head is now at', height);
        patchNetworkStore({ height, timestamp });

        // The NanoApi did recheck all balances on every block
        // I don't think we need to do this here, as wallet addresses are only expected to
        // change in balance when sending or receiving a transaction, as they should not be mining
        // directly.

        if (epoch > currentEpoch) {
            currentEpoch = epoch;
            updateValidators(client);
        }
    });

    client.addPeerChangedListener((peerId, reason, peerCount, peerInfo) => {
        if (reason === 'joined' && peerInfo) {
            addPeer({
                peerId,
                multiAddress: peerInfo.address,
                nodeType: peerInfo.type,
                connected: true,
            });
        } else if (reason === 'left') {
            removePeer(peerId);
        }
        network$.peerCount = peerCount;
    });

    updateValidators(client);

    // Update validator API data on launch
    (async () => {
        const { config } = useConfig();
        const url = `${config.staking.validatorsApiBase}${config.staking.validatorsPath}?only-known=true`;
        const apiValidators = await retry(() => fetch(url))
            .then((res) => res.json()).catch(() => []) as ApiValidator[];
        stakingStore.setApiValidators(apiValidators);
    })();

    function transactionListener(plain: PlainTransactionDetails) {
        if (plain.recipient === STAKING_CONTRACT_ADDRESS) {
            if (plain.data.type === 'add-stake') {
                if (!balances.has(plain.sender) && 'staker' in plain.data) {
                    // This is a staking transaction from a validator to one of our stakers
                    updateStakes([plain.data.staker]);
                    // Then ignore this transaction
                    // TODO: Store for tracking of staking rewards?
                    return;
                }
            }

            // Otherwise the sender is the staker
            updateStakes([plain.sender]);
        } else if (plain.sender === STAKING_CONTRACT_ADDRESS) {
            // This is an unstaking transaction
            updateStakes([plain.recipient]);
        }

        transactionsStore.addTransactions([plain]);

        if (
            plain.state === TransactionState.INCLUDED
            // @ts-expect-error MINED is not included in the types for PoS transactions
            || plain.state === TransactionState.MINED
        ) {
            const addresses: string[] = [];
            if (balances.has(plain.sender)) {
                addresses.push(plain.sender);
            }
            if (balances.has(plain.recipient)) {
                addresses.push(plain.recipient);
            }
            updateBalances(addresses);
        }
    }

    function subscribe(addresses: string[]) {
        client.addTransactionListener(transactionListener, addresses);
        updateBalances(addresses);
        updateStakes(addresses);
        return true;
    }

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
                removeFetchedAddress(removedAddress);
            }
            // Let the network forget the balances of the removed addresses,
            // so that they are reported as new again at re-login.
            forgetBalances([...removedAddresses]);
        }

        if (!newAddresses.length) return;

        console.debug('Subscribing addresses', newAddresses);
        subscribe(newAddresses);
    });

    watch([addressStore.activeAddress, txFetchTrigger], async ([activeAddress, trigger]) => {
        const address = activeAddress as string | null;
        if (!address || fetchedAddresses.value.includes(address)) return;
        addFetchedAddress(address);

        console.debug('Scheduling transaction fetch for', address);

        const knownTxDetails = addressStore.transactionsForActiveAddress.value;
        // FIXME: Re-enable lastConfirmedHeight, but ensure it syncs from 0 the first time
        //        (even when cross-account transactions are already present)
        // const lastConfirmedHeight = knownTxDetails
        //     .filter((tx) => tx.state === TransactionState.CONFIRMED)
        //     .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);

        network$.fetchingTxHistory++;

        if ((trigger as number) > 0) updateBalances([address]);

        await client.waitForConsensusEstablished();
        const { config } = useConfig();

        let limit = 5; // This will be doubled to 10 in the first loop iteration
        let lastFetchedTxLength = limit;
        let startAt: string | undefined;

        while (lastFetchedTxLength === limit) {
            // Double the limit until 100
            limit = Math.min(100, limit * 2);

            try {
                // Determine list of known transactions to pass in
                const knownTxStartIndex = startAt
                    // eslint-disable-next-line no-loop-func
                    ? knownTxDetails.findIndex((tx) => tx.transactionHash === startAt) || 0
                    : 0;
                const knownTxs = knownTxDetails.slice(knownTxStartIndex, knownTxStartIndex + limit);
                console.info('Fetching transaction history for', address, knownTxs);

                // eslint-disable-next-line no-await-in-loop
                const txDetails = await retry(
                    // eslint-disable-next-line no-loop-func
                    () => client.getTransactionsByAddress(
                        address,
                        /* lastConfirmedHeight - 10 */ undefined,
                        knownTxs,
                        startAt,
                        limit,
                        // Reduce number of required history peers in the testnet
                        /* minPeers */ config.environment === ENV_MAIN ? undefined : 1,
                    ),
                );

                // getTransactionsByAddress returns unfound (i.e. they were outside the limit) known txs as well,
                // so we need to filter them out to determine the number of new transactions
                const knownTxsHashes = new Set(knownTxs.map((tx) => tx.transactionHash));
                const newTxDetails = txDetails.filter((tx) => !knownTxsHashes.has(tx.transactionHash));

                console.info('Got transaction history for', address, txDetails);

                lastFetchedTxLength = newTxDetails.length;
                if (newTxDetails.length > 0 && newTxDetails[lastFetchedTxLength - 1].blockHeight) {
                    startAt = newTxDetails[lastFetchedTxLength - 1].transactionHash;
                }

                // Here we still add all returned transactions to the store, because
                // 1. It doesn't hurt
                // 2. Some known transactions might have an updated state
                transactionsStore.addTransactions(txDetails);
            } catch (error) {
                reportFor('getTransactionsByAddress')(error as Error);
                removeFetchedAddress(address);
            }
        }
        network$.fetchingTxHistory--;
    });

    // Fetch transactions for proxies
    const proxyStore = useProxyStore();
    watch(proxyStore.networkTrigger, () => {
        const newProxies: string[] = [];
        const addressesToSubscribe: string[] = [];
        for (const proxyAddress of proxyStore.allProxies.value) {
            if (!seenProxies.has(proxyAddress)) {
                // For new addresses the tx history and if required subscribing is handled below
                seenProxies.add(proxyAddress);
                newProxies.push(proxyAddress);
                continue;
            }

            // If we didn't subscribe in the first pass, subscribe on second pass if needed, see below.
            if (
                !subscribedProxies.has(proxyAddress)
                && proxyStore.state.funded.includes(proxyAddress)
                && proxyStore.state.claimed.includes(proxyAddress)
            ) {
                subscribedProxies.add(proxyAddress);
                addressesToSubscribe.push(proxyAddress);
            }
        }
        if (addressesToSubscribe.length) subscribe(addressesToSubscribe);
        if (!newProxies.length) return;

        console.debug(`Fetching history for ${newProxies.length} proxies`);

        for (const proxyAddress of newProxies) {
            const knownTxDetails = Object.values(transactionsStore.state.transactions)
                .filter((tx) => tx.sender === proxyAddress || tx.recipient === proxyAddress);

            network$.fetchingTxHistory++;

            client.waitForConsensusEstablished()
                .then(() => {
                    console.debug('Fetching transaction history for proxy', proxyAddress, knownTxDetails);
                    const { config } = useConfig();
                    return retry(() => client.getTransactionsByAddress(
                        proxyAddress,
                        /* sinceBlockHeight */ 0,
                        knownTxDetails,
                        /* startAt */ undefined,
                        /* limit */ undefined,
                        // Reduce number of required history peers in the testnet
                        /* minPeers */ config.environment === ENV_MAIN ? undefined : 1,
                    ));
                })
                .then((txDetails) => {
                    if (
                        proxyStore.state.funded.includes(proxyAddress)
                        && !subscribedProxies.has(proxyAddress)
                        && !txDetails.find((tx) => tx.sender === proxyAddress
                            && tx.state === TransactionState.CONFIRMED)
                    ) {
                        // No claiming transactions found, or the claiming tx is not yet confirmed, so we might need to
                        // subscribe for updates.
                        // If we were triggered by a funding transaction, we have to subscribe in any case because we
                        // don't know when and to where the proxy will be claimed. If we were triggered by a claimed
                        // transaction and don't know the funding transaction yet wait with subscribing until the second
                        // pass to see whether we actually have to subscribe (which is for example not the case if
                        // funding and claiming are both from/to addresses that are subscribed anyways; see
                        // needToSubscribe in ProxyDetection).
                        // If the funding tx has not been known so far, it will be added to the transaction store below
                        // which in turn runs the ProxyDetection again and triggers the network and this watcher again
                        // for the second pass if needed.
                        subscribedProxies.add(proxyAddress);
                        subscribe([proxyAddress]);
                    }
                    transactionsStore.addTransactions(txDetails);
                })
                .catch((error) => {
                    reportFor('getTransactionsByAddress')(error);
                    seenProxies.delete(proxyAddress);
                })
                .then(() => network$.fetchingTxHistory--);
        }
    });
}

export async function sendTransaction(tx: SignedTransaction | string) {
    const client = await getNetworkClient();
    const plain = await client.sendTransaction(typeof tx === 'string' ? tx : tx.serializedTx);
    useTransactionsStore().addTransactions([plain]);
    return plain;
}

async function retry<T>(func: (...args: any[]) => T | Promise<T>, options?: Partial<{
    baseDelay: number,
    maxRetries: number,
}>): Promise<T> {
    const defaults = {
        baseDelay: 500,
        maxRetries: 10,
    };

    const { baseDelay, maxRetries } = { ...defaults, ...options };

    let i = 0;
    while (true) { // eslint-disable-line no-constant-condition
        try {
            // Run the function (async or not) and return the result if sucessful
            return await func(); // eslint-disable-line no-await-in-loop
        } catch (e) {
            // Stop retrying and instead throw the error if we reached the max number of retries
            if (i >= maxRetries) throw e;

            // If the function fails, increase the tries counter
            i += 1;

            // Wait an increasing amount of time before trying again
            const delay = baseDelay * i;
            await new Promise((resolve) => { setTimeout(resolve, delay); }); // eslint-disable-line no-await-in-loop
        }
    }
}

// @ts-expect-error debugging
window.gimmeNimiqClient = async () => getNetworkClient();

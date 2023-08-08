/* eslint-disable no-console */
import { ref, watch } from '@vue/composition-api';
import { SignedTransaction } from '@nimiq/hub-api';
import type { Client, PlainStakingContract, PlainTransactionDetails } from '@nimiq/core-web';

import { useAddressStore } from './stores/Address';
import { useTransactionsStore, TransactionState } from './stores/Transactions';
import { useNetworkStore } from './stores/Network';
import { useProxyStore } from './stores/Proxy';
import { useConfig } from './composables/useConfig';
import { useStakingStore, Validator } from './stores/Staking';
import { ENV_MAIN, STAKING_CONTRACT_ADDRESS, StakingTransactionType } from './lib/Constants';
import { validatorData } from './lib/Validators';
import { calculateStakingReward } from './lib/AlbatrossMath';

let isLaunched = false;
let clientPromise: Promise<Client>;

type Balances = Map<string, number>;
const balances: Balances = new Map(); // Balances in Luna, excluding pending txs

export async function getNetworkClient() {
    const { config } = useConfig();

    // eslint-disable-next-line no-async-promise-executor
    clientPromise = clientPromise || (async () => {
        // Note: we don't need to reset clientPromise on changes to the config because we only use config.environment
        // which never changes at runtime. Changing config.nimiqSeeds at runtime is not supported.
        const { ClientConfiguration, Client } = await import('@nimiq/core-web');
        const clientConfig = new ClientConfiguration();
        clientConfig.network(config.environment === ENV_MAIN ? 'albatross' : 'testalbatross');
        clientConfig.seedNodes(config.nimiqSeeds);
        clientConfig.logLevel('debug');
        return Client.create(clientConfig.build());
    })();

    return clientPromise;
}

export async function launchNetwork() {
    if (isLaunched) return;
    isLaunched = true;

    const client = await getNetworkClient();

    const { state: network$, addPeer, removePeer, patch: patchNetworkStore } = useNetworkStore();
    const transactionsStore = useTransactionsStore();
    const addressStore = useAddressStore();
    const stakingStore = useStakingStore();

    const subscribedAddresses = new Set<string>();
    const fetchedAddresses = new Set<string>();

    const subscribedProxies = new Set<string>();
    const seenProxies = new Set<string>();

    async function updateBalances(addresses: string[] = [...balances.keys()]) {
        if (!addresses.length) return;
        await client.waitForConsensusEstablished();
        const accounts = await client.getAccounts(addresses);
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
        const stakers = await client.getStakers(addresses);
        stakers.forEach((staker, i) => {
            const address = addresses[i];
            if (staker) {
                stakingStore.setStake({
                    address,
                    balance: staker.balance,
                    inactiveBalance: staker.inactiveBalance,
                    inactiveRelease: staker.inactiveRelease,
                    validator: staker.delegation,
                });
            } else {
                // Staker does not exist (anymore)
                stakingStore.removeStake(address);
            }
        });
    }

    function forgetBalances(addresses: string[]) {
        for (const address of addresses) {
            balances.delete(address);
        }
    }

    const txFetchTrigger = ref(0);
    function invalidateTransactionHistory(includeProxies = false) {
        // Invalidate fetched addresses
        fetchedAddresses.clear();
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
    client.addConsensusChangedListener(async (consensus) => {
        network$.consensus = consensus;

        if (consensus === 'established') {
            const stop = watch(() => network$.fetchingTxHistory, (fetching) => {
                if (fetching === 0) {
                    txHistoryWasInvalidatedSinceLastConsensus = false;
                    stop();
                }
            }, { lazy: true });
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
    });

    let currentEpoch = 0;

    client.addHeadChangedListener(async (hash) => {
        const { height, epoch, timestamp } = await client.getBlock(hash);
        if (height % 10 === 0) console.log('Head is now at', height);
        patchNetworkStore({ height, timestamp });

        // The NanoApi did recheck all balances on every block
        // I don't think we need to do this here, as wallet addresses are only expected to
        // change in balance when sending or receiving a transaction, as they should not be mining
        // directly.

        if (epoch > currentEpoch) {
            currentEpoch = epoch;
            updateValidators();
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

    async function updateValidators() {
        await client.waitForConsensusEstablished();
        const contract = (await retry(
            () => client.getAccount(STAKING_CONTRACT_ADDRESS) as Promise<PlainStakingContract>,
        ));
        const activeValidators = contract.activeValidators.map(([address, balance]) => ({
            address,
            balance,
        }));
        const totalStake = activeValidators.reduce((sum, validator) => sum + validator.balance, 0);

        const validators: Validator[] = await Promise.all(activeValidators.map(async ({ address, balance }) => {
            const dominance = balance / totalStake;
            if (dominance > 0.3) {
                console.warn('High-stake validator:', { dominance: Math.round(dominance * 1e3) / 10, address });
            }

            let validator: Validator = {
                address,
                dominance,
                active: true,
            };

            type ValueOf<T> = T[keyof T];
            const data = validatorData[address] as ValueOf<typeof validatorData> | undefined;

            if (data) {
                // This is just an approximation of a trust score
                // TODO: Formalize trust score calculation
                const trustPenalty = Math.min((dominance * 10) ** 2 / 10, 1);
                const trust = (1 - trustPenalty) * 5;

                const reward = await calculateStakingReward(data.fee, totalStake);

                validator = {
                    ...validator,
                    ...data,
                    trust,
                    reward,
                };
            }

            return validator;
        }));

        stakingStore.setValidators(validators);
    }
    updateValidators();

    function transactionListener(plain: PlainTransactionDetails) {
        if (plain.recipient === STAKING_CONTRACT_ADDRESS) {
            if (plain.data.raw.startsWith(StakingTransactionType.ADD_STAKE.toString(16).padStart(2, '0'))) {
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

        if (plain.state === TransactionState.INCLUDED) {
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
                fetchedAddresses.delete(removedAddress);
            }
            // Let the network forget the balances of the removed addresses,
            // so that they are reported as new again at re-login.
            forgetBalances([...removedAddresses]);
        }

        if (!newAddresses.length) return;

        console.debug('Subscribing addresses', newAddresses);
        subscribe(newAddresses);
    });

    // Fetch transactions for active address
    watch([addressStore.activeAddress, txFetchTrigger], ([activeAddress, trigger]) => {
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

        if ((trigger as number) > 0) updateBalances([address]);

        // FIXME: Re-enable lastConfirmedHeight, but ensure it syncs from 0 the first time
        //        (even when cross-account transactions are already present)
        client.waitForConsensusEstablished()
            .then(() => {
                console.debug('Fetching transaction history for', address, knownTxDetails);
                return client.getTransactionsByAddress(address, /* lastConfirmedHeight - 10 */ 0, knownTxDetails);
            })
            .then((txDetails) => {
                transactionsStore.addTransactions(txDetails);
            })
            .catch(() => fetchedAddresses.delete(address))
            .then(() => network$.fetchingTxHistory--);
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
                    return client.getTransactionsByAddress(proxyAddress, 0, knownTxDetails);
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
                .catch(() => seenProxies.delete(proxyAddress))
                .then(() => network$.fetchingTxHistory--);
        }
    });
}

export async function sendTransaction(tx: SignedTransaction | string) {
    const client = await getNetworkClient();
    const plain = await client.sendTransaction(typeof tx === 'string' ? tx : tx.serializedTx);

    if (plain.state !== TransactionState.PENDING) {
        // Overwrite transaction status in the transactionStore,
        // because it got added as PENDING before by the transactionListener.
        useTransactionsStore().addTransactions([plain]);
    }

    return plain;
}

async function retry<T>(func: (...args: any[]) => T | Promise<T>, baseDelay = 500, maxRetries = Infinity): Promise<T> {
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

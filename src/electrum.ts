/* eslint-disable no-console */
import { watch, computed, ref } from 'vue';
import { ElectrumClient, ElectrumClientOptions, TransactionDetails } from '@nimiq/electrum-client';
import { SignedBtcTransaction } from '@nimiq/hub-api';
import { useConfig } from './composables/useConfig';

import { useAccountStore } from './stores/Account';
import { useBtcAddressStore, BtcAddressInfo } from './stores/BtcAddress';
import { useBtcNetworkStore } from './stores/BtcNetwork';
import { useBtcTransactionsStore, Transaction } from './stores/BtcTransactions';
import { BTC_ADDRESS_GAP, ENV_MAIN } from './lib/Constants';
import { loadBitcoinJS } from './lib/BitcoinJSLoader';
import { addBtcAddresses } from './hub';
import { HTLC_ADDRESS_LENGTH } from './lib/BtcHtlcDetection';

let isLaunched = false;
let clientPromise: Promise<ElectrumClient>;

export async function getElectrumClient(): Promise<ElectrumClient> {
    if (clientPromise) return clientPromise;

    // We don't have to monitor the config for changes to reset the clientPromise because we only use config.environment
    // which does never change at runtime.
    const { config } = useConfig();

    let resolver: (client: ElectrumClient) => void;
    clientPromise = new Promise<ElectrumClient>((resolve) => {
        resolver = resolve;
    });

    // @nimiq/electrum-client already depends on a globally available BitcoinJS,
    // so we need to load it first.
    await loadBitcoinJS();

    const { GenesisConfig, ElectrumClient: Client } = await import(
        /* webpackChunkName: "electrum-client" */ '@nimiq/electrum-client');

    GenesisConfig[config.environment === ENV_MAIN ? 'main' : 'test']();

    const options: Partial<ElectrumClientOptions> = config.environment === ENV_MAIN ? {
        extraSeedPeers: [{
            host: 'electrumx.nimiq.com',
            wssPath: 'electrumx',
            ports: { wss: 443, ssl: 50002, tcp: 50001 },
            ip: '',
            version: '',
            highPriority: true,
        }, {
            host: 'btccore-main.bdnodes.net',
            ports: { wss: null, ssl: 50002, tcp: null },
            ip: '',
            version: '',
        }],
        websocketProxy: {
            tcp: 'wss://electrum.nimiq.com:50001',
            ssl: 'wss://electrum.nimiq.com:50002',
        },
    } : {};

    const client = new Client(options);

    resolver!(client);

    return clientPromise;
}

export async function transactionListener(tx: TransactionDetails) {
    useBtcTransactionsStore().addTransactions([tx]);
}

const subscribedAddresses = new Set<string>();
export async function subscribeToAddresses(addresses: string[]) {
    const newAddresses: string[] = [];
    for (const address of addresses) {
        if (subscribedAddresses.has(address)) continue;
        subscribedAddresses.add(address);
        newAddresses.push(address);
    }
    if (!newAddresses.length) return;

    const client = await getElectrumClient();
    client.addTransactionListener(transactionListener, newAddresses);
}

export async function sendTransaction(tx: SignedBtcTransaction | string) {
    const client = await getElectrumClient();
    await client.waitForConsensusEstablished();
    const plainTx = await client.sendTransaction(typeof tx === 'string' ? tx : tx.serializedTx);

    // Subscribe to one of our addresses, so we get updates about this transaction
    let address = plainTx.inputs.find((input) => input.address)?.address;
    if (address && address.length === HTLC_ADDRESS_LENGTH) {
        address = plainTx.outputs.find((output) => output.address)?.address;
    }
    if (address) {
        subscribeToAddresses([address]);
    }

    return plainTx;
}

export async function checkHistory(
    addressInfos: BtcAddressInfo[],
    pendingTransactions: Transaction[],
    gap: number,
    allowedGap: number,
    onError: (error: Error) => any,
    forceCheck = false,
    checkForReuse = false,
): Promise<number> {
    const client = await getElectrumClient();
    const { state: btcNetwork$ } = useBtcNetworkStore();
    const btcTransactionsStore = useBtcTransactionsStore();

    let counter = 0;

    for (const addressInfo of addressInfos) {
        const { address } = addressInfo;

        if (!forceCheck && !checkForReuse && addressInfo.txoCount && !addressInfo.utxos.length) {
            const hasPendingTransactions = pendingTransactions.some((tx) => tx.addresses.includes(address));
            if (!hasPendingTransactions) {
                gap = 0;
                continue;
            }
        }

        // When checking for address reuse, only check those addresses that are used,
        // check only the latest addresses no matter how often they were used,
        // check old addresses only if used more than once.
        if (checkForReuse && !addressInfo.txoCount) continue;
        if (checkForReuse && counter > allowedGap * 2 && addressInfo.txoCount === 1) continue;

        counter += 1;

        const knownTxDetails = addressInfo.txoCount
            ? Object.values(btcTransactionsStore.state.transactions)
                .filter((tx) => tx.addresses.includes(address))
            : [];

        // const lastConfirmedHeight = knownTxDetails
        //     .filter((tx) => tx.state === TransactionState.CONFIRMED)
        //     .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);

        btcNetwork$.fetchingTxHistory++;

        console.debug('Fetching transaction history for', address, knownTxDetails);
        // FIXME: Re-enable lastConfirmedHeight, but ensure it syncs from 0 the first time
        //        (even when cross-account transactions are already present)
        // eslint-disable-next-line no-await-in-loop
        await client.waitForConsensusEstablished();
        // eslint-disable-next-line no-await-in-loop
        await client.getTransactionsByAddress(address, /* lastConfirmedHeight - 10 */ 0, knownTxDetails)
            .then((txDetails) => { // eslint-disable-line no-loop-func
                btcTransactionsStore.addTransactions(txDetails);

                if (addressInfo.txoCount || txDetails.length) {
                    gap = 0;
                } else {
                    gap += 1;
                }
            })
            .catch(onError)
            // Delay resetting fetchingTxHistory to prevent flickering of status,
            // because we are only checking one address after the other currently.
            .finally(() => setTimeout(() => btcNetwork$.fetchingTxHistory--, 100));

        if (gap >= allowedGap) break;
    }

    return gap;
}

export async function launchElectrum() {
    if (isLaunched) return;
    isLaunched = true;

    const client = await getElectrumClient();

    const { state: btcNetwork$ } = useBtcNetworkStore();
    const { activeAccountInfo } = useAccountStore();
    const btcTransactionsStore = useBtcTransactionsStore();
    const btcAddressStore = useBtcAddressStore();
    const { config } = useConfig();

    const fetchedAccounts = new Set<string>();

    const txFetchTrigger = ref(0);
    function invalidateTransactionHistory() {
        // Invalidate fetched addresses
        fetchedAccounts.clear();
        // Trigger watcher
        txFetchTrigger.value += 1;
    }

    client.addHeadChangedListener((header) => {
        console.debug('BTC Head is now at', header.blockHeight);
        useBtcNetworkStore().patch({
            height: header.blockHeight,
            timestamp: header.timestamp,
        });
    });

    let txHistoryWasInvalidatedSinceLastConsensus = true;
    client.addConsensusChangedListener((state) => {
        console.log('BTC Consensus', state);
        btcNetwork$.consensus = state;

        if (state === 'established') {
            const stop = watch(() => btcNetwork$.fetchingTxHistory, (fetching) => {
                if (fetching === 0) {
                    txHistoryWasInvalidatedSinceLastConsensus = false;
                    stop();
                }
            });
        } else if (!txHistoryWasInvalidatedSinceLastConsensus) {
            invalidateTransactionHistory();
            txHistoryWasInvalidatedSinceLastConsensus = true;
        }
    });

    let lastVisibilityFetch = Date.now();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;

        if (Date.now() - lastVisibilityFetch > config.pageVisibilityTxRefreshInterval) {
            if (!txHistoryWasInvalidatedSinceLastConsensus) {
                invalidateTransactionHistory();
                lastVisibilityFetch = Date.now();
            }
        }
    });

    // Fetch transactions for active account
    watch([activeAccountInfo, txFetchTrigger], async ([accountInfo]) => {
        const account = accountInfo.value;
        if (!account) return;

        const { addressSet, activeAddresses } = btcAddressStore;

        // If this account doesn't have any Bitcoin addresses, there's nothing to check.
        if (!addressSet.value.external.length && !addressSet.value.internal.length) return;

        const accountId = account.id;
        if (fetchedAccounts.has(accountId)) return;
        fetchedAccounts.add(accountId);

        // Check pending transactions
        // Get all transactions for the active addresses
        const pendingTransactions = Object.values(btcTransactionsStore.state.transactions)
            .filter((tx) => !tx.timestamp
                && tx.addresses.some((txAddress) => activeAddresses.value.includes(txAddress)));

        // Check tx history
        for (const chain of ['internal', 'external'] as Array<'internal' | 'external'>) {
            const allowedGap = chain === 'external' ? BTC_ADDRESS_GAP : 5;

            let gap = 0;
            let addressInfos = addressSet.value[chain];
            do {
                gap = await checkHistory( // eslint-disable-line no-await-in-loop
                    addressInfos,
                    pendingTransactions,
                    gap,
                    allowedGap,
                    () => fetchedAccounts.delete(accountId),
                );

                if (gap < allowedGap) {
                    // Get new addresses from Hub iframe and continue detection
                    btcNetwork$.fetchingTxHistory++;
                    // eslint-disable-next-line no-await-in-loop
                    addressInfos = await addBtcAddresses(accountId, chain, allowedGap - gap);
                    setTimeout(() => btcNetwork$.fetchingTxHistory--, 100);
                }
            } while (gap < allowedGap);

            if (chain === 'internal') continue;

            // Now check for external address reuse
            gap = await checkHistory( // eslint-disable-line no-await-in-loop
                addressSet.value[chain].slice().reverse(),
                [],
                0,
                allowedGap,
                console.error, // eslint-disable-line no-console
                false,
                true,
            );
            console.log('Checked for BTC address reuse', gap);
        }

        // Subscribe to addresses that now have UTXOs
        const addressesToWatch: string[] = [];
        for (const chain of ['internal', 'external'] as Array<'internal' | 'external'>) {
            for (const addressInfo of addressSet.value[chain]) {
                if (addressInfo.utxos.length > 0) {
                    addressesToWatch.push(addressInfo.address);
                }
            }
        }
        subscribeToAddresses(addressesToWatch);
    });

    const { addressSet } = btcAddressStore;
    const { isFetchingTxHistory } = useBtcNetworkStore();

    // Subscribe to all unused external addresses until the gap limit
    const unusedExternalAddresses = computed(() => {
        if (isFetchingTxHistory.value) return null;
        if (!addressSet.value.external.length) return null;

        let gap = 0;
        const addresses = addressSet.value.external.filter((addressInfo) => {
            if (gap >= BTC_ADDRESS_GAP) return false;
            if (addressInfo.txoCount) {
                gap = 0;
                return false;
            }
            gap += 1;
            return true;
        }).map(({ address }) => address);

        if (gap < BTC_ADDRESS_GAP) {
            addBtcAddresses(useAccountStore().activeAccountId.value!, 'external', BTC_ADDRESS_GAP - gap);
        }

        return addresses;
    });
    watch([unusedExternalAddresses, isFetchingTxHistory], (newValues) => {
        if (!Array.isArray(newValues)) return;
        const [addresses, isFetching] = newValues as unknown as [string[] | null, boolean];
        if (isFetching) return; // Wait for fetching to finish before subscribing
        if (!addresses) return;
        subscribeToAddresses(addresses);
    });

    // Subscribe to all used external addresses that might get reused
    const maybeReusedExternalAddresses = computed(() => {
        if (isFetchingTxHistory.value) return null;
        if (!addressSet.value.external.length) return null;

        const addresses: string[] = [];
        for (const addressInfo of addressSet.value.external.slice().reverse()) {
            if (!addressInfo.txoCount) continue; // Skip unused addresses

            // Subscribe to all recently used addresses
            // Subscribe to older addresses that have been used more than once
            if (addresses.length < BTC_ADDRESS_GAP * 2 || addressInfo.txoCount > 1) {
                addresses.push(addressInfo.address);
            }
        }

        return addresses;
    });
    watch([maybeReusedExternalAddresses, isFetchingTxHistory], (newValues) => {
        if (!Array.isArray(newValues)) return;
        const [addresses, isFetching] = newValues as unknown as [string[] | null, boolean];
        if (isFetching) return; // Wait for fetching to finish before subscribing
        if (!addresses) return;
        subscribeToAddresses(addresses);
    });

    // Subscribe to the next unused internal address per account
    // (This is not really necessary, since an internal address can only receive txs from an external
    // address, all of which we are monitoring anyway. So this is more of a backup-subscription.)
    const nextUnusedChangeAddress = computed(() => {
        if (isFetchingTxHistory.value) return undefined;
        if (!addressSet.value.internal.length) return undefined;

        const unusedAddresses = addressSet.value.internal
            .filter((addressInfo) => !addressInfo.txoCount)
            .map((addressInfo) => addressInfo.address);

        // When only 2 unused change addresses are left, get new ones from Hub
        if (unusedAddresses.length <= 2) {
            addBtcAddresses(useAccountStore().activeAccountId.value!, 'internal');
        }

        return unusedAddresses[0];
    });
    watch([nextUnusedChangeAddress, isFetchingTxHistory], (newValues) => {
        if (!Array.isArray(newValues)) return;
        const [address, isFetching] = newValues as unknown as [string | undefined, boolean];
        if (isFetching) return; // Wait for fetching to finish before subscribing
        if (!address) return;
        subscribeToAddresses([address]);
    });
}

// @ts-expect-error debugging
window.gimmeBitcoinClient = async () => getElectrumClient();

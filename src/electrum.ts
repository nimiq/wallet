/* eslint-disable no-console */
import { watch, computed } from '@vue/composition-api';
import { ElectrumApi, Receipt } from '@nimiq/electrum-client';
import { SignedBtcTransaction } from '@nimiq/hub-api';
import Config from 'config';

import { useAccountStore } from './stores/Account';
import { useBtcAddressStore } from './stores/BtcAddress';
import { useBtcNetworkStore } from './stores/BtcNetwork';
import { useBtcTransactionsStore } from './stores/BtcTransactions';
import { BTC_ADDRESS_GAP, ENV_MAIN } from './lib/Constants';
import { loadBitcoinJS } from './lib/BitcoinJSLoader';

let isLaunched = false;
let clientPromise: Promise<ElectrumApi>;

export async function getElectrumClient() {
    if (clientPromise) return clientPromise;

    let resolver: (client: ElectrumApi) => void;
    clientPromise = new Promise<ElectrumApi>((resolve) => {
        resolver = resolve;
    });

    // @nimiq/electrum-client already depends on a globally available BitcoinJS,
    // so we need to load it first.
    await loadBitcoinJS();

    const NimiqElectrumClient = await import(/* webpackChunkName: "electrum-client" */ '@nimiq/electrum-client');
    const client = new NimiqElectrumClient.ElectrumApi({
        token: Config.environment === ENV_MAIN ? 'mainnet' : 'testnet',
        network: Config.environment === ENV_MAIN ? 'bitcoin' : 'testnet',
    });
    resolver!(client);

    return clientPromise;
}

export async function fetchTransaction(hash: string, height?: number) {
    const client = await getElectrumClient();
    const tx = await client.getTransaction(hash, (height || 0) > 0 ? height : undefined);
    useBtcTransactionsStore().addTransactions([tx]);
}

export async function receiptsHandler(receipts: Receipt[] | null) {
    if (!receipts) return; // No transactions for this address

    const btcTransactionsStore = useBtcTransactionsStore();

    // For each receipt, check our store if we have the same information.
    // If not, request this transaction from the network.
    for (const receipt of receipts) {
        const tx = btcTransactionsStore.state.transactions[receipt.transactionHash];
        if (!tx || tx.blockHeight !== receipt.blockHeight) {
            fetchTransaction(receipt.transactionHash, receipt.blockHeight);
        }
    }
}

const subscribedAddresses = new Set<string>();
export async function subscribeToAddress(address: string) {
    if (subscribedAddresses.has(address)) return;
    subscribedAddresses.add(address);

    const client = await getElectrumClient();
    client.subscribeReceipts(address, receiptsHandler);
}

export async function sendTransaction(tx: SignedBtcTransaction) {
    const client = await getElectrumClient();
    const plainTx = await client.broadcastTransaction(tx.serializedTx);

    // Subscribe to one of our sender addresses, so we get updates about this transaction
    const address = plainTx.inputs.find((input) => input.address)?.address;
    if (address) {
        subscribeToAddress(address);
    }

    return plainTx;
}

export async function launchElectrum() {
    if (isLaunched) return;
    isLaunched = true;

    const client = await getElectrumClient();

    const { state: btcNetwork$ } = useBtcNetworkStore();
    const { activeAccountInfo } = useAccountStore();
    const btcTransactionsStore = useBtcTransactionsStore();
    const btcAddressStore = useBtcAddressStore();

    btcNetwork$.consensus = 'syncing';

    client.subscribeHeaders((header) => {
        console.debug('BTC Head is now at', header.blockHeight);
        btcNetwork$.height = header.blockHeight;
        btcNetwork$.consensus = 'established';
    });

    // TODO: Subscribe to new addresses?

    // Fetch transactions for active account
    const fetchedAccounts = new Set<string>();
    // const fetchedAddresses = new Set<string>();
    watch(activeAccountInfo, async () => {
        if (!activeAccountInfo.value) return;

        const accountId = activeAccountInfo.value.id;
        if (fetchedAccounts.has(accountId)) return;
        fetchedAccounts.add(accountId);

        const { addressSet, activeAddresses } = btcAddressStore;

        // Check pending transactions
        // Get all transactions for the active addresses
        const pendingTransactions = Object.values(btcTransactionsStore.state.transactions)
            .filter((tx) => !tx.timestamp
                && tx.addresses.some((txAddress) => activeAddresses.value.includes(txAddress)));

        // Check tx history
        for (const chain of ['internal' as 'internal', 'external' as 'external']) {
            let gap = 0;
            const allowedGap = chain === 'external' ? BTC_ADDRESS_GAP : 1;

            for (const addressInfo of addressSet.value[chain]) {
                const { address } = addressInfo;

                if (addressInfo.used && !addressInfo.utxos.length) {
                    const hasPendingTransactions = pendingTransactions.some((tx) => tx.addresses.includes(address));
                    if (!hasPendingTransactions) {
                        gap = 0;
                        // TODO: Still re-check/subscribe addresses that had more than one incoming tx (recently)
                        continue;
                    }
                }

                const knownTxDetails = addressInfo.used
                    ? Object.values(btcTransactionsStore.state.transactions)
                        .filter((tx) => tx.addresses.includes(address))
                        .map((tx) => ({
                            blockHeight: tx.blockHeight || 0,
                            transactionHash: tx.transactionHash,
                        }))
                    : [];

                // const lastConfirmedHeight = knownTxDetails
                //     .filter((tx) => tx.state === TransactionState.CONFIRMED)
                //     .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);

                btcNetwork$.fetchingTxHistory++;

                console.debug('Fetching transaction history for', address, knownTxDetails);
                // FIXME: Re-enable lastConfirmedHeigth, but ensure it syncs from 0 the first time
                //        (even when cross-account transactions are already present)
                // eslint-disable-next-line no-await-in-loop
                await client.getHistory(address, /* lastConfirmedHeight - 10 */ 0, knownTxDetails)
                    .then((txDetails) => { // eslint-disable-line no-loop-func
                        btcTransactionsStore.addTransactions(txDetails);

                        const used = addressInfo.used || txDetails.length > 0;

                        if (used) {
                            gap = 0;
                        } else {
                            gap += 1;
                        }
                    })
                    .catch(() => fetchedAccounts.delete(accountId))
                    // Delay resetting fetchingTxHistory to prevent flickering of status,
                    // because we are only checking one address after the other currently.
                    .then(() => setTimeout(() => btcNetwork$.fetchingTxHistory--, 100));

                if (gap >= allowedGap) break;
            }
        }

        // Subscribe to addresses that now have UTXOs
        for (const chain of ['internal' as 'internal', 'external' as 'external']) {
            for (const addressInfo of addressSet.value[chain]) {
                if (addressInfo.utxos.length > 0) {
                    subscribeToAddress(addressInfo.address);
                }
            }
        }
    });

    const { addressSet } = btcAddressStore;
    const { isFetchingTxHistory } = useBtcNetworkStore();

    // Subscribe to all unused external addresses until the gap limit
    const unusedExternalAddresses = computed(() => {
        let gap = 0;
        return addressSet.value.external.filter((addressInfo) => {
            if (gap > BTC_ADDRESS_GAP) return false;
            if (addressInfo.used) {
                gap = 0;
                return false;
            }
            gap += 1;
            return true;
        }).map((addressInfo) => addressInfo.address);
    });
    watch([unusedExternalAddresses, isFetchingTxHistory], async ([addresses, isFetching]) => {
        if (isFetching) return; // Wait for fetching to finish before subscribing
        if (!addresses) return;
        for (const address of addresses as string[]) {
            subscribeToAddress(address);
        }
    });

    // Subscribe to the next unused internal address per account
    const nextUnusedChangeAddress = computed(() => addressSet.value.internal
        .find((addressInfo) => !addressInfo.used)?.address);
    watch([nextUnusedChangeAddress, isFetchingTxHistory], async ([address, isFetching]) => {
        if (isFetching) return; // Wait for fetching to finish before subscribing
        if (!address) return;
        subscribeToAddress(address);
    });
}

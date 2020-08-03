/* eslint-disable no-console */
import { watch } from '@vue/composition-api';
import { ElectrumApi } from '@nimiq/electrum-client';
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
                    .then(() => btcNetwork$.fetchingTxHistory--);

                if (gap >= allowedGap) break;
            }

            // TODO: Subscribe to the addresses that have UTXOs
            // TODO: Subscribe to the next X & last Y external addresses
        }
    });
}

export async function sendTransaction(tx: SignedBtcTransaction) {
    await launchElectrum();
    const client = await getElectrumClient();
    return client.broadcastTransaction(tx.serializedTx);
}

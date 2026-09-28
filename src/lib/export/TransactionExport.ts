import { isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { getNetworkClient } from '../../network';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import { useFiatStore } from '../../stores/Fiat';
import { toSecs, Transaction, useTransactionsStore } from '../../stores/Transactions';
import { useConfig } from '../../composables/useConfig';
import { FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, ENV_MAIN } from '../Constants';
import { BlockpitAppFormat } from './BlockpitAppFormat';
import { GenericFormat } from './GenericFormat';
import { useUsdtTransactionsStore } from '../../stores/UsdtTransactions';

export enum ExportFormat {
    GENERIC = 'generic',
    BLOCKPIT = 'blockpit',
}

const RECEIPTS_TIMEOUT = 15000;
const NETWORK_TIMEOUT = 30000;
const TRANSACTION_CONCURRENCY = 5;
type Receipt = { block_height: number, hash: string }; // eslint-disable-line camelcase

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, onTimeout?: () => void): Promise<T> {
    let timer: number | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = window.setTimeout(() => {
                    reject(new Error('Transaction history request timed out'));
                    onTimeout?.();
                }, milliseconds);
            }),
        ]);
    } finally {
        window.clearTimeout(timer);
    }
}

async function getReceipts(address: string, year: number): Promise<Receipt[]> {
    // nimiq.watch is on adblocker lists, so use nimiqwatch.com to avoid getting blocked.
    const apiUrl = `https://v2.${useConfig().config.environment === ENV_MAIN ? '' : 'test.'}nimiqwatch.com`;
    for (let attempt = 0; attempt <= 4; attempt++) {
        // Keep the existing retry delays: 0, 1, 2, 3 and 4 seconds.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => { window.setTimeout(resolve, 1000 * attempt); });
        const controller = new AbortController();
        try {
            // Include reading the body in the timeout: response headers alone do not complete a request.
            // eslint-disable-next-line no-await-in-loop
            const receipts: unknown = await withTimeout((async () => {
                const response = await fetch(`${apiUrl}/api/v1/account-receipts/${address}/${year}`, {
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('Could not retrieve transaction receipts');
                return response.json();
            })(), RECEIPTS_TIMEOUT, () => controller.abort());
            if (!Array.isArray(receipts) || !receipts.every((receipt) => receipt
                && typeof receipt.hash === 'string' && /^[a-f\d]{64}$/i.test(receipt.hash)
                && Number.isInteger(receipt.block_height) && receipt.block_height >= 0)) {
                throw new Error('Invalid transaction receipts');
            }
            return receipts;
        } catch (error) {
            if (attempt === 4) throw error;
        }
    }
    throw new Error('Could not retrieve transaction receipts');
}

export async function exportTransactions(
    nimAddresses: string[],
    btcAddresses: { internal: string[], external: string[] },
    usdcAddresses: string[],
    usdtAddresses: string[],
    year: number,
    format: ExportFormat,
    filename?: string,
) {
    const startDate = new Date();
    startDate.setFullYear(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setFullYear(year + 1);

    const startTimestamp = startDate.getTime() / 1e3;
    const endTimestamp = endDate.getTime() / 1e3;
    const btcAddressesList = [
        ...btcAddresses.internal,
        ...btcAddresses.external,
    ];

    const { state: nimTransactions$, addTransactions } = useTransactionsStore();
    const nimTransactions = nimAddresses.length === 0 ? [] : Object.values(nimTransactions$.transactions)
        .filter( // Only account transactions
            (tx) => nimAddresses.includes(tx.sender) || nimAddresses.includes(tx.recipient),
        )
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .filter((tx) => toSecs(tx.timestamp!) >= startTimestamp
            && toSecs(tx.timestamp!) < endTimestamp); // Only requested timeframe

    /* eslint-disable no-await-in-loop */
    // Get receipts from block explorer and compare if we have all transactions
    const presentTxHashes = new Set(nimTransactions.map((tx) => tx.transactionHash));
    const missingTxHashes = new Set<string>();
    for (const address of nimAddresses) {
        const receipts = await getReceipts(address, year);
        for (const receipt of receipts) {
            if (presentTxHashes.has(receipt.hash)) continue;
            missingTxHashes.add(receipt.hash);
        }
    }
    if (missingTxHashes.size) {
        const client = await withTimeout(getNetworkClient(), NETWORK_TIMEOUT);
        await withTimeout(client.waitForConsensusEstablished(), NETWORK_TIMEOUT);
        const newTxs: Transaction[] = [];
        const hashes = [...missingTxHashes];
        for (let offset = 0; offset < hashes.length; offset += TRANSACTION_CONCURRENCY) {
            const batch = hashes.slice(offset, offset + TRANSACTION_CONCURRENCY);
            newTxs.push(...await Promise.all(batch.map(async (hash) => {
                const transaction = await withTimeout(client.getTransaction(hash), NETWORK_TIMEOUT);
                if (transaction.transactionHash !== hash) throw new Error('Invalid transaction returned');
                return transaction;
            })));
        }
        // Only update the store and produce a CSV once every required transaction has been retrieved.
        addTransactions(newTxs);

        if (format === ExportFormat.GENERIC) {
            // Wait for transactions to receive their fiatValue
            const fiatCurrency = useFiatStore().state.currency;
            const historyFiatCurrency = isHistorySupportedFiatCurrency(fiatCurrency, FIAT_API_PROVIDER_TX_HISTORY)
                ? fiatCurrency
                : FiatCurrency.USD;
            for (let i = 0; i < 100; i++) {
                const allFiatValuesReady = newTxs.every(({ transactionHash }) => {
                    const transaction = nimTransactions$.transactions[transactionHash];
                    return transaction?.fiatValue?.[fiatCurrency] !== undefined
                        || transaction?.fiatValue?.[historyFiatCurrency] !== undefined;
                });
                if (allFiatValuesReady) break;
                // Wait 100 milliseconds between each retry, 10 seconds maximum
                await new Promise((res) => { window.setTimeout(res, 100); });
            }
        }

        nimTransactions.push(...newTxs.map((tx) => nimTransactions$.transactions[tx.transactionHash] || tx));
    }
    /* eslint-enable no-await-in-loop */

    const { state: btcTransactions$ } = useBtcTransactionsStore();
    const btcTransactions = btcAddressesList.length === 0 ? [] : Object.values(btcTransactions$.transactions)
        .filter((tx) => tx.addresses.some((address) => btcAddressesList.includes(address))) // Only account transactions
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    const { state: usdcTransactions$ } = useUsdcTransactionsStore();
    const usdcTransactions = usdcAddresses.length === 0 ? [] : Object.values(usdcTransactions$.transactions)
        .filter((tx) => usdcAddresses.includes(tx.sender) || usdcAddresses.includes(tx.recipient))
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    const { state: usdtTransactions$ } = useUsdtTransactionsStore();
    const usdtTransactions = usdtAddresses.length === 0 ? [] : Object.values(usdtTransactions$.transactions)
        .filter((tx) => usdtAddresses.includes(tx.sender) || usdtAddresses.includes(tx.recipient))
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    const transactions = [
        ...nimTransactions,
        ...btcTransactions,
        ...usdcTransactions,
        ...usdtTransactions,
    ].sort((a, b) => a.timestamp! - b.timestamp!); // Sort ascending;

    // if (!transactions.length) {
    //     console.log('No txs'); // eslint-disable-line no-console
    //     return;
    // }

    switch (format) {
        case ExportFormat.GENERIC:
            new GenericFormat(
                nimAddresses,
                btcAddresses,
                usdcAddresses,
                usdtAddresses,
                transactions,
                year,
            ).export(filename);
            break;
        case ExportFormat.BLOCKPIT:
            new BlockpitAppFormat(
                nimAddresses,
                btcAddresses,
                usdcAddresses,
                usdtAddresses,
                transactions,
                year,
            ).export(filename);
            break;
        default:
            throw new Error('Unknown export format');
    }
}

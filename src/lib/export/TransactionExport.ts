import { shim as shimAllSettled } from 'promise.allsettled';
import { isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { getNetworkClient } from '../../network';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import { useFiatStore } from '../../stores/Fiat';
import { Transaction, useTransactionsStore } from '../../stores/Transactions';
import { useConfig } from '../../composables/useConfig';
import { FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, ENV_MAIN } from '../Constants';
import { BlockpitAppFormat } from './BlockpitAppFormat';
import { GenericFormat } from './GenericFormat';

export enum ExportFormat {
    GENERIC = 'generic',
    BLOCKPIT = 'blockpit',
}
export async function exportTransactions(
    nimAddresses: string[],
    btcAddresses: { internal: string[], external: string[] },
    usdcAddresses: string[],
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
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    /* eslint-disable no-await-in-loop */
    // Get receipts from block explorer and compare if we have all transactions
    type Receipt = { block_height: number, hash: string }; // eslint-disable-line camelcase
    const receiptsByAddress: Record<string, Receipt[]> = {};
    // for (const address of nimAddresses) { // TODO
    //     for (let i = 0; i <= 4; i++) {
    //         // Wait 1 second more for each retry, starting at 0 seconds, up to 4 seconds
    //         await new Promise((res) => { window.setTimeout(res, 1000 * i); });
    //         // nimiq.watch is on adblocker lists, so use nimiqwatch.com to avoid getting blocked
    //         const apiUrl = `https://${useConfig().config.environment === ENV_MAIN ? '' : 'test-'}api.nimiqwatch.com`;
    //         const receipts = await fetch(`${apiUrl}/account-receipts/${address}/${year}`)
    //             .then((res) => res.json() as Promise<Receipt[]>)
    //             .catch(() => undefined);
    //         if (!receipts) continue;

    //         receiptsByAddress[address] = receipts;
    //         break;
    //     }
    // }
    const presentTxHashes = new Set(nimTransactions.map((tx) => tx.transactionHash));
    const missingTxHashes = new Set<string>();
    for (const receipts of Object.values(receiptsByAddress)) {
        for (const receipt of receipts) {
            if (presentTxHashes.has(receipt.hash)) continue;
            missingTxHashes.add(receipt.hash);
        }
    }
    if (missingTxHashes.size) {
        const client = await getNetworkClient();
        shimAllSettled();
        const newTxs: Transaction[] = [];
        await Promise.allSettled([...missingTxHashes.values()].map(async (hash) => {
            newTxs.push(await client.getTransaction(hash));
        }));
        addTransactions(newTxs);

        if (format === ExportFormat.GENERIC) {
            // Wait for transactions to receive their fiatValue
            const fiatCurrency = useFiatStore().state.currency;
            const historyFiatCurrency = isHistorySupportedFiatCurrency(fiatCurrency, FIAT_API_PROVIDER_TX_HISTORY)
                ? fiatCurrency
                : FiatCurrency.USD;
            for (let i = 0; i < 100; i++) {
                // Wait 100 milliseconds between each retry, 10 seconds maximum
                await new Promise((res) => { window.setTimeout(res, 100); });
                const hashToCheck = newTxs[Math.floor(Math.random() * newTxs.length)].transactionHash;
                const transaction = nimTransactions$.transactions[hashToCheck];
                if (transaction.fiatValue?.[fiatCurrency] || transaction.fiatValue?.[historyFiatCurrency]) break;
            }
        }

        nimTransactions.push(...newTxs);
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

    const transactions = [
        ...nimTransactions,
        ...btcTransactions,
        ...usdcTransactions,
    ].sort((a, b) => a.timestamp! - b.timestamp!); // Sort ascending;

    // if (!transactions.length) {
    //     console.log('No txs'); // eslint-disable-line no-console
    //     return;
    // }

    switch (format) {
        case ExportFormat.GENERIC:
            new GenericFormat(nimAddresses, btcAddresses, usdcAddresses, transactions, year).export(filename);
            break;
        case ExportFormat.BLOCKPIT:
            new BlockpitAppFormat(nimAddresses, btcAddresses, usdcAddresses, transactions, year).export(filename);
            break;
        default:
            throw new Error('Unknown export format');
    }
}

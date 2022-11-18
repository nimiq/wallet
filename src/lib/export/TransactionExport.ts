import { shim as shimAllSettled } from 'promise.allsettled';
import Config from 'config';
import { getNetworkClient } from '../../network';
import { useAccountStore } from '../../stores/Account';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useFiatStore } from '../../stores/Fiat';
import { Transaction, useTransactionsStore } from '../../stores/Transactions';
import { ENV_MAIN } from '../Constants';
import { BlockpitAppFormat } from './BlockpitAppFormat';
// import { GenericFormat } from './GenericFormat';

export enum ExportFormat {
    GENERIC = 'generic',
    BLOCKPIT = 'blockpit',
}

export async function exportTransactions(accountId: string, year: number, format = ExportFormat.GENERIC) {
    const { state: accounts$ } = useAccountStore();
    const account = accounts$.accountInfos[accountId];
    if (!account) throw new Error('Account ID not found');

    const startDate = new Date();
    startDate.setFullYear(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setFullYear(year + 1);

    const startTimestamp = startDate.getTime() / 1e3;
    const endTimestamp = endDate.getTime() / 1e3;

    const nimAddresses = account.addresses;
    const btcAddresses = [
        ...account.btcAddresses.internal,
        ...account.btcAddresses.external,
    ];

    const { state: nimTransactions$, addTransactions } = useTransactionsStore();
    const nimTransactions = Object.values(nimTransactions$.transactions)
        .filter( // Only account transactions
            (tx) => account.addresses.includes(tx.sender) || account.addresses.includes(tx.recipient),
        )
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    /* eslint-disable no-await-in-loop */
    // Get receipts from block explorer and compare if we have all transactions
    type Receipt = { block_height: number, hash: string }; // eslint-disable-line camelcase
    const receiptsByAddress: Record<string, Receipt[]> = {};
    for (const address of nimAddresses) {
        for (let i = 0; i <= 5; i++) {
            // Wait 1 second more for each retry, starting at 0 seconds, up to 5 seconds
            await new Promise((res) => { window.setTimeout(res, 1000 * i); });
            // nimiq.watch is on adblocker lists, so use nimiqwatch.com to avoid getting blocked
            const apiUrl = `https://api${Config.environment === ENV_MAIN ? '' : '-test'}.nimiqwatch.com`;
            const receipts = await fetch(`${apiUrl}/account-receipts/${address}/${year}`)
                .then((res) => res.json() as Promise<Receipt[]>)
                .catch(() => undefined);
            if (!receipts) continue;

            receiptsByAddress[address] = receipts;
            break;
        }
    }
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
            newTxs.push((await client.getTransaction(hash)).toPlain());
        }));
        addTransactions(newTxs);

        if (format === ExportFormat.GENERIC) {
            // Wait for transactions to receive their fiatValue
            const fiatCode = useFiatStore().state.currency;
            for (let i = 0; i < 100; i++) {
                // Wait 100 milliseconds more for each retry, 10 seconds maximum
                await new Promise((res) => { window.setTimeout(res, 100); });
                const hashToCheck = newTxs[Math.floor(Math.random() * newTxs.length)].transactionHash;
                if (nimTransactions$.transactions[hashToCheck].fiatValue?.[fiatCode]) break;
            }
        }
    }
    /* eslint-enable no-await-in-loop */

    const { state: btcTransactions$ } = useBtcTransactionsStore();
    const btcTransactions = Object.values(btcTransactions$.transactions)
        .filter((tx) => tx.addresses.some((address) => btcAddresses.includes(address))) // Only account transactions
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    const transactions = [
        ...nimTransactions,
        ...btcTransactions,
    ].sort((a, b) => a.timestamp! - b.timestamp!); // Sort ascending;

    if (!transactions.length) {
        console.log('No txs'); // eslint-disable-line no-console
        return;
    }

    switch (format) {
        // case ExportFormat.GENERIC:
        //     new GenericFormat(account, nimAddresses, account.btcAddresses, transactions, year).export(); break;
        case ExportFormat.BLOCKPIT:
            new BlockpitAppFormat(account, nimAddresses, account.btcAddresses, transactions, year).export(); break;
        default:
            throw new Error('Unknown export format');
    }
}

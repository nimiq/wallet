import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useTransactionsStore } from '../../stores/Transactions';
import { BlockPitFormat } from './BlockPitFormat';

export function exportTransactions(accountId: string, year: number) {
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

    const { state: addresses$ } = useAddressStore();
    const addresses = new Map(account.addresses.map((address) => ([
        address,
        addresses$.addressInfos[address],
    ])));

    const { state: transactions$ } = useTransactionsStore();
    const transactions = Object.values(transactions$.transactions)
        .filter( // Only account transactions
            (tx) => account.addresses.includes(tx.sender) || account.addresses.includes(tx.recipient),
        )
        .filter((tx) => tx.timestamp) // Only confirmed transactions
        .sort((a, b) => a.timestamp! - b.timestamp!) // Sort ascending
        .filter((tx) => tx.timestamp! >= startTimestamp && tx.timestamp! < endTimestamp); // Only requested timeframe

    if (!transactions.length) {
        console.log('No txs'); // eslint-disable-line no-console
        return;
    }

    new BlockPitFormat(account, addresses, transactions, year).export();
}

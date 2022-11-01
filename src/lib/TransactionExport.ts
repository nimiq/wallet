import { CurrencyInfo } from '@nimiq/utils';
import { useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import { useFiatStore } from '../stores/Fiat';
import { useProxyStore } from '../stores/Proxy';
import { Transaction, useTransactionsStore } from '../stores/Transactions';
import { parseData } from './DataFormatting';
import { isProxyData, ProxyType } from './ProxyDetection';

const HEADER = [
    'id',
    'exchange_name',
    'depot_name',
    'transaction_date',
    'buy_asset',
    'buy_amount',
    'sell_asset',
    'sell_amount',
    'fee_asset',
    'fee_amount',
    'transaction_type',
    'note',
    'linked_transaction',
    'reference_asset',
    'reference_amount',
];

type Row = [
    /* id */ number,
    /* exchange_name */ string,
    /* depot_name */ string,
    /* transaction_date */ string,
    /* buy_asset */ string,
    /* buy_amount */ string,
    /* sell_asset */ string,
    /* sell_amount */ string,
    /* fee_asset */ string,
    /* fee_amount */ string,
    /* transaction_type */ string,
    /* note */ string,
    /* linked_transaction */ string,
    /* reference_asset */ string,
    /* reference_amount */ string,
]

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

    const rows: Row[] = [];
    let id = 0;
    const exchangeName = 'Nimiq Wallet';
    const buyAsset = 'NIM';
    const sellAsset = 'NIM';
    const feeAsset = 'NIM';
    const referenceAsset = useFiatStore().state.currency.toUpperCase();
    const referenceDecimals = new CurrencyInfo(referenceAsset).decimals;

    for (const tx of transactions) {
        const mySenderAddress = addresses.get(tx.sender);
        const myRecipientAddress = addresses.get(tx.recipient);

        const txDate = new Date(tx.timestamp! * 1e3);
        const date = [txDate.getDate(), txDate.getMonth() + 1, txDate.getFullYear()].join('/');
        const time = [txDate.getHours(), txDate.getMinutes(), txDate.getSeconds()].join(':');
        const transactionDate = `${date} ${time}`;

        if (mySenderAddress) {
            const depotName = mySenderAddress.label;
            const sellAmount = (tx.value / 1e5).toString();
            const feeAmount = (tx.fee / 1e5).toString();
            const transactionType = 'withdrawal';
            const referenceAmount = tx.fiatValue && (tx.fiatValue[referenceAsset.toLowerCase()] || undefined);

            rows.push([
                ++id,
                exchangeName,
                depotName,
                transactionDate,
                /* buy_asset */ '',
                /* buy_amount */ '',
                sellAsset,
                sellAmount,
                feeAsset,
                feeAmount,
                transactionType,
                dataToNote(tx, false),
                /* linked_transaction */ '',
                referenceAmount !== undefined ? referenceAsset : '',
                referenceAmount !== undefined ? referenceAmount.toFixed(referenceDecimals) : '',
            ]);
        }

        if (myRecipientAddress) {
            const depotName = myRecipientAddress.label;
            const buyAmount = (tx.value / 1e5).toString();
            const feeAmount = (tx.fee / 1e5).toString();
            const transactionType = 'deposit';
            const referenceAmount = tx.fiatValue && (tx.fiatValue[referenceAsset.toLowerCase()] || undefined);
            const linkedTransaction = mySenderAddress ? id.toString() : '';

            rows.push([
                ++id,
                exchangeName,
                depotName,
                transactionDate,
                buyAsset,
                buyAmount,
                /* sell_asset */ '',
                /* sell_amount */ '',
                feeAsset,
                feeAmount,
                transactionType,
                dataToNote(tx, true),
                linkedTransaction,
                referenceAmount !== undefined ? referenceAsset : '',
                referenceAmount !== undefined ? referenceAmount.toFixed(referenceDecimals) : '',
            ]);
        }
    }

    const file = [
        HEADER,
        ...rows,
    ];

    const csvContent = file.map((cells) => cells.join(',')).join('\r\n');

    // Create a blob
    const blob = new Blob([csvContent], { type: 'data:text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create a link to download it
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Transactions.${account.label}.${year}.csv`);
    link.click();
}

function dataToNote(transaction: Transaction, isIncoming: boolean) {
    if (isProxyData(transaction.data.raw, ProxyType.CASHLINK)) {
        const { state: proxies$ } = useProxyStore();
        const cashlinkAddress = isIncoming ? transaction.sender : transaction.recipient;
        const hubCashlink = proxies$.hubCashlinks[cashlinkAddress];
        if (hubCashlink && hubCashlink.message) return hubCashlink.message;
    }

    // TODO: Handle swaps with proper message
    if ('hashRoot' in transaction.data) return 'HTLC Creation';
    if ('hashRoot' in transaction.proof) return 'HTLC Settlement';
    if ('creator' in transaction.proof) return 'HTLC Refund';

    return parseData(transaction.data.raw);
}

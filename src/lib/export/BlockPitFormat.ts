import { AccountInfo } from '../../stores/Account';
import { AddressInfo } from '../../stores/Address';
import { Transaction } from '../../stores/Transactions';
import { Format } from './Format';

export class BlockPitFormat extends Format {
    private static HEADERS = [
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
    ];

    private static formatDate(timestamp: number) {
        const txDate = Format.getTxDate(timestamp);
        const date = [
            (txDate.date).toString().padStart(2, '0'),
            (txDate.month).toString().padStart(2, '0'),
            txDate.year,
        ].join('/');
        const time = [
            (txDate.hour).toString().padStart(2, '0'),
            (txDate.minute).toString().padStart(2, '0'),
            (txDate.second).toString().padStart(2, '0'),
        ].join(':');
        return `${date} ${time}`;
    }

    private readonly EXCHANGE_NAME = 'Nimiq Wallet';

    private id = 0;

    constructor(
        public account: AccountInfo,
        public addresses: Map<string, AddressInfo>,
        public transactions: Transaction[],
        public year: number,
    ) {
        super(BlockPitFormat.HEADERS, account, addresses, transactions, year, 'NIM');
    }

    public export() {
        for (const tx of this.transactions) {
            const sender = this.getAddressInfo(tx.sender);
            const recipient = this.getAddressInfo(tx.recipient);
            let id: number | undefined;

            if (sender) {
                id = this.addRow(sender.label, tx, 'withdrawal');
            }

            if (recipient) {
                this.addRow(recipient.label, tx, 'deposit', id);
            }
        }

        this.download();
    }

    private addRow(
        depotName: string,
        tx: Transaction,
        type: 'withdrawal' | 'deposit',
        linkedTransaction?: number,
    ) {
        this.rows.push([
            (++this.id).toString(),
            this.EXCHANGE_NAME,
            depotName,
            BlockPitFormat.formatDate(tx.timestamp!),
            type === 'deposit' ? this.asset : '',
            type === 'deposit' ? Format.formatAmount(tx.value) : '',
            type === 'withdrawal' ? this.asset : '',
            type === 'withdrawal' ? Format.formatAmount(tx.value) : '',
            this.asset,
            Format.formatAmount(tx.fee),
            type,
            Format.formatData(tx, false),
            linkedTransaction ? linkedTransaction.toString() : '',
        ]);

        return this.id;
    }
}

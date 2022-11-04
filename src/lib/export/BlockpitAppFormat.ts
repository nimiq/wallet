import { AccountInfo } from '../../stores/Account';
import { AddressInfo } from '../../stores/Address';
import { Transaction } from '../../stores/Transactions';
import { Format } from './Format';

export class BlockpitAppFormat extends Format {
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
        const txDate = Format.getTxDate(timestamp, true);
        return txDate.dateObj.toISOString();
    }

    private readonly EXCHANGE_NAME = 'Nimiq Wallet';

    private id = 0;

    constructor(
        public account: AccountInfo,
        public addresses: Map<string, AddressInfo>,
        public transactions: Transaction[],
        public year: number,
    ) {
        super(BlockpitAppFormat.HEADERS, account, addresses, transactions, year, 'NIM');
    }

    public export() {
        for (const tx of this.transactions) {
            const sender = this.getAddressInfo(tx.sender);
            const recipient = this.getAddressInfo(tx.recipient);

            if (sender && recipient) continue; // Skip transfers

            if (sender) {
                this.addRow(tx, 'withdrawal');
            }

            if (recipient) {
                this.addRow(tx, 'deposit');
            }
        }

        this.download();
    }

    private addRow(
        tx: Transaction,
        type: 'withdrawal' | 'deposit',
        linkedTransaction?: number,
    ) {
        this.rows.push([
            (++this.id).toString(),
            this.EXCHANGE_NAME,
            this.account.label,
            BlockpitAppFormat.formatDate(tx.timestamp!),
            type === 'deposit' ? this.asset : '',
            type === 'deposit' ? Format.formatAmount(tx.value) : '',
            type === 'withdrawal' ? this.asset : '',
            type === 'withdrawal' ? Format.formatAmount(tx.value) : '',
            tx.fee > 0 ? this.asset : '',
            tx.fee > 0 ? Format.formatAmount(tx.fee) : '',
            type,
            Format.formatData(tx, false),
            linkedTransaction ? linkedTransaction.toString() : '',
        ]);

        return this.id;
    }
}

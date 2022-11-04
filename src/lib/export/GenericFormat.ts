import { CurrencyInfo } from '@nimiq/utils';
import { AccountInfo } from '../../stores/Account';
import { AddressInfo } from '../../stores/Address';
import { useFiatStore } from '../../stores/Fiat';
import { Transaction } from '../../stores/Transactions';
import { Format } from './Format';

export class GenericFormat extends Format {
    private static HEADERS = [
        'transaction_hash',
        'transaction_date',
        'transaction_time',
        'account_address',
        'asset_in',
        'amount_in',
        'asset_out',
        'amount_out',
        'asset_fee',
        'amount_fee',
        'message',
        'asset_reference',
        'amount_reference',
    ];

    private static formatDate(timestamp: number) {
        const txDate = Format.getTxDate(timestamp);
        const date = [
            txDate.year,
            (txDate.month).toString().padStart(2, '0'),
            (txDate.date).toString().padStart(2, '0'),
        ].join('/');
        const time = [
            (txDate.hour).toString().padStart(2, '0'),
            (txDate.minute).toString().padStart(2, '0'),
            (txDate.second).toString().padStart(2, '0'),
        ].join(':');
        return {
            date,
            time,
        };
    }

    private referenceAsset: string;
    private referenceDecimals: number;

    constructor(
        public account: AccountInfo,
        public addresses: Map<string, AddressInfo>,
        public transactions: Transaction[],
        public year: number,
    ) {
        super(GenericFormat.HEADERS, account, addresses, transactions, year, 'NIM');

        this.referenceAsset = useFiatStore().state.currency.toUpperCase();
        this.referenceDecimals = new CurrencyInfo(this.referenceAsset).decimals;
    }

    public export() {
        for (const tx of this.transactions) {
            const sender = this.getAddressInfo(tx.sender);
            const recipient = this.getAddressInfo(tx.recipient);

            if (sender && recipient) continue; // Skip transfers

            if (sender) {
                this.addRow(sender.address, tx, 'out');
            }

            if (recipient) {
                this.addRow(recipient.address, tx, 'in');
            }
        }

        this.download();
    }

    private addRow(
        address: string,
        tx: Transaction,
        direction: 'in' | 'out',
    ) {
        const { date, time } = GenericFormat.formatDate(tx.timestamp!);
        const referenceAmount = tx.fiatValue && (tx.fiatValue[this.referenceAsset.toLowerCase()] || undefined);

        this.rows.push([
            tx.transactionHash,
            date,
            time,
            address,
            direction === 'in' ? this.asset : '',
            direction === 'in' ? Format.formatAmount(tx.value) : '',
            direction === 'out' ? this.asset : '',
            direction === 'out' ? Format.formatAmount(tx.value) : '',
            this.asset,
            Format.formatAmount(tx.fee),
            Format.formatData(tx, false),
            referenceAmount !== undefined ? this.referenceAsset : '',
            referenceAmount !== undefined ? referenceAmount.toFixed(this.referenceDecimals) : '',
        ]);
    }
}

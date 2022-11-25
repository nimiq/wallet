import { useAccountStore } from '../../stores/Account';
import { Transaction as NimTx } from '../../stores/Transactions';
import { Transaction as BtcTx } from '../../stores/BtcTransactions';
import { Format } from './Format';
import { useAddressStore } from '../../stores/Address';

/* eslint-disable class-methods-use-this */

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

    private readonly EXCHANGE_NAME = 'Nimiq Wallet';

    private id = 0;
    private depotLabel = '';

    constructor(
        public override nimAddresses: string[],
        public override btcAddresses: { internal: string[], external: string[] },
        public override transactions: (NimTx | BtcTx)[],
        public override year: number,
    ) {
        super(BlockpitAppFormat.HEADERS, nimAddresses, btcAddresses, transactions, year);

        if (
            this.nimAddresses.length === 1
            && this.btcAddresses.internal.length === 0
            && this.btcAddresses.external.length === 0
        ) {
            // We are exporting one NIM address only
            this.depotLabel = useAddressStore().state.addressInfos[this.nimAddresses[0]].label;
        } else {
            // We are exporting all addresses, or the BTC account
            this.depotLabel = Object.values(useAccountStore().state.accountInfos).find((accountInfo) => {
                if (this.nimAddresses[0]) return accountInfo.addresses.includes(this.nimAddresses[0]);
                return accountInfo.btcAddresses.external[0] === this.btcAddresses.external[0];
            })!.label;
        }
    }

    protected override addRow(
        txIn?: BtcTx | NimTx,
        txOut?: BtcTx | NimTx,
        messageOverride?: string,
        // linkedTransaction?: number,
    ) {
        if (!txIn && !txOut) return;

        const timestamp = Math.min(txIn?.timestamp || Infinity, txOut?.timestamp || Infinity);

        let valueIn: number | undefined;
        let valueOut: number | undefined;
        let feeOut = 0;

        if (txIn) ({ value: valueIn } = this.getValue(txIn, true));
        if (txOut) ({ value: valueOut, outgoingFee: feeOut } = this.getValue(txOut, false));

        this.rows.push([
            (++this.id).toString(),
            this.EXCHANGE_NAME,
            this.depotLabel,
            this.formatDate(timestamp),
            txIn && valueIn ? this.getTxAsset(txIn) : '',
            txIn && valueIn ? this.formatAmount(this.getTxAsset(txIn), valueIn) : '',
            txOut && valueOut ? this.getTxAsset(txOut) : '',
            txOut && valueOut ? this.formatAmount(this.getTxAsset(txOut), valueOut) : '',
            txOut && feeOut ? this.getTxAsset(txOut) : '',
            txOut && feeOut ? this.formatAmount(this.getTxAsset(txOut), feeOut) : '',
            txIn && txOut ? 'trade' : txIn ? 'deposit' : 'withdrawal',
            messageOverride || (
                (txIn && 'sender' in txIn && !txOut) || (txOut && 'sender' in txOut && !txIn)
                    ? this.formatNimiqData(txIn || txOut!, !!txIn)
                    : ''
            ),
            '', // linkedTransaction ? linkedTransaction.toString() : '',
        ]);
    }

    private formatDate(timestamp: number) {
        const txDate = this.getTxDate(timestamp, true);
        return txDate.dateObj.toISOString();
    }
}

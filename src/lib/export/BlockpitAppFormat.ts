import { useAccountStore } from '../../stores/Account';
import { Transaction as NimTx } from '../../stores/Transactions';
import { Transaction as BtcTx } from '../../stores/BtcTransactions';
import { Transaction as UsdcTx } from '../../stores/UsdcTransactions';
import { Format } from './Format';
import { useAddressStore } from '../../stores/Address';
import { ExportFormat } from './TransactionExport';

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
        public override usdcAddresses: string[],
        public override transactions: (NimTx | BtcTx | UsdcTx)[],
        public override year: number,
    ) {
        super(
            ExportFormat.BLOCKPIT,
            BlockpitAppFormat.HEADERS,
            nimAddresses,
            btcAddresses,
            usdcAddresses,
            transactions,
            year,
        );

        if (
            this.nimAddresses.length === 1
            && this.btcAddresses.internal.length === 0
            && this.btcAddresses.external.length === 0
            && this.usdcAddresses.length === 0
        ) {
            // We are exporting one NIM address only
            this.depotLabel = useAddressStore().state.addressInfos[this.nimAddresses[0]].label;
        } else {
            // We are exporting all addresses, or the BTC or USDC account. Find the label of the account that contains
            // the addresses.
            this.depotLabel = Object.values(useAccountStore().state.accountInfos).find((accountInfo) => {
                if (this.nimAddresses[0]) return accountInfo.addresses.includes(this.nimAddresses[0]);
                if (this.btcAddresses.external.length) {
                    return accountInfo.btcAddresses.external[0] === this.btcAddresses.external[0];
                }
                return !!accountInfo.polygonAddresses?.includes(this.usdcAddresses[0]);
            })!.label;
        }
    }

    protected override addRow(
        txIn?: BtcTx | NimTx | UsdcTx,
        txOut?: BtcTx | NimTx | UsdcTx,
        messageOverride?: string,
        // linkedTransaction?: number,
    ) {
        if (!txIn && !txOut) return;

        const timestamp = Math.min(txIn?.timestamp || Infinity, txOut?.timestamp || Infinity);

        let valueIn: number | undefined;
        let valueOut: number | undefined;
        let feeOut = 0;

        if (txIn) {
            this.assertCryptoAsset(txIn);
            ({ value: valueIn } = this.getValue(txIn, true));
        }
        if (txOut) {
            this.assertCryptoAsset(txOut);
            ({ value: valueOut, outgoingFee: feeOut } = this.getValue(txOut, false));
        }

        this.rows.push([
            (++this.id).toString(),
            this.EXCHANGE_NAME,
            this.depotLabel,
            this.formatDate(timestamp),
            txIn && valueIn ? txIn.asset : '',
            txIn && valueIn ? this.formatAmount(txIn.asset, valueIn) : '',
            txOut && valueOut ? txOut.asset : '',
            txOut && valueOut ? this.formatAmount(txOut.asset, valueOut) : '',
            txOut && feeOut ? txOut.asset : '',
            txOut && feeOut ? this.formatAmount(txOut.asset, feeOut) : '',
            txIn && txOut ? 'trade' : txIn ? 'deposit' : 'withdrawal',
            messageOverride || ((txIn && this.getTxAsset(txIn) === 'NIM' && !txOut)
                || (txOut && txOut.asset === 'NIM' && !txIn))
                ? this.formatNimiqData((txIn || txOut!) as NimTx, !!txIn)
                : '',
            '', // linkedTransaction ? linkedTransaction.toString() : '',
        ]);
    }

    private formatDate(timestamp: number) {
        const txDate = this.getTxDate(timestamp, true);
        return txDate.dateObj.toISOString();
    }
}

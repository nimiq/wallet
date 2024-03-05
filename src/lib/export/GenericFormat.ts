import { CurrencyInfo } from '@nimiq/utils';
import { type FiatCurrency } from '../Constants';
import { useFiatStore } from '../../stores/Fiat';
import { Transaction as NimTx } from '../../stores/Transactions';
import { Transaction as BtcTx } from '../../stores/BtcTransactions';
import { Transaction as UsdcTx } from '../../stores/UsdcTransactions';
import { Format } from './Format';
import { ExportFormat } from './TransactionExport';

/* eslint-disable class-methods-use-this */

export class GenericFormat extends Format {
    private static HEADERS = [
        // 'transaction_hash',
        'transaction_date',
        'transaction_time',
        // 'account_address',
        'asset_in',
        'amount_in',
        'asset_out',
        'amount_out',
        'asset_fee',
        'amount_fee',
        'message',
        'fiat_asset_in',
        'fiat_amount_in',
        'fiat_asset_out',
        'fiat_amount_out',
    ];

    private referenceAsset: FiatCurrency;
    private referenceDecimals: number;

    constructor(
        public override nimAddresses: string[],
        public override btcAddresses: { internal: string[], external: string[] },
        public override usdcAddresses: string[],
        public override transactions: (NimTx | BtcTx | UsdcTx)[],
        public override year: number,
    ) {
        super(
            ExportFormat.GENERIC, GenericFormat.HEADERS, nimAddresses, btcAddresses, usdcAddresses, transactions, year);

        this.referenceAsset = useFiatStore().state.currency;
        this.referenceDecimals = new CurrencyInfo(this.referenceAsset.toUpperCase()).decimals;
    }

    protected override addRow(
        txIn?: BtcTx | NimTx | UsdcTx,
        txOut?: BtcTx | NimTx | UsdcTx,
        messageOverride?: string,
    ) {
        if (!txIn && !txOut) return;

        const timestamp = Math.min(txIn?.timestamp || Infinity, txOut?.timestamp || Infinity);

        let valueIn: number | undefined;
        let valueOut: number | undefined;
        let feeOut = 0;
        let fiatIn: number | undefined;
        let fiatOut: number | undefined;

        if (txIn) {
            ({
                value: valueIn,
                fiatValue: fiatIn,
            } = this.getValue(txIn, true, this.referenceAsset));
        }
        if (txOut) {
            ({
                value: valueOut,
                outgoingFee: feeOut,
                fiatValue: fiatOut,
            } = this.getValue(txOut, false, this.referenceAsset));
        }

        if (txIn) this.assertCryptoAsset(txIn);
        if (txOut) this.assertCryptoAsset(txOut);

        this.rows.push([
            // (txIn || txOut)!.transactionHash,
            ...Object.values(this.formatDate(timestamp)),
            // address?
            txIn && valueIn ? txIn.asset : '',
            txIn && valueIn ? this.formatAmount(txIn.asset, valueIn) : '',
            txOut && valueOut ? txOut.asset : '',
            txOut && valueOut ? this.formatAmount(txOut.asset, valueOut) : '',
            txOut && feeOut ? txOut.asset : '',
            txOut && feeOut ? this.formatAmount(txOut.asset, feeOut) : '',
            messageOverride || ((txIn && this.getTxAsset(txIn) === 'NIM' && !txOut)
                || (txOut && txOut.asset === 'NIM' && !txIn))
                ? this.formatNimiqData((txIn || txOut!) as NimTx, !!txIn)
                : '',
            txIn && fiatIn ? this.referenceAsset.toUpperCase() : '',
            txIn && fiatIn ? fiatIn.toFixed(this.referenceDecimals) : '',
            txOut && fiatOut ? this.referenceAsset.toUpperCase() : '',
            txOut && fiatOut ? fiatOut.toFixed(this.referenceDecimals) : '',
        ]);
    }

    private formatDate(timestamp: number) {
        const txDate = this.getTxDate(timestamp);
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
}

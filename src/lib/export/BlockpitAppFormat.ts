import { SwapAsset } from '@nimiq/fastspot-api';
import { AccountInfo } from '../../stores/Account';
import { Transaction as NimTx } from '../../stores/Transactions';
import { Transaction as BtcTx, useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useSwapsStore } from '../../stores/Swaps';
import { Format } from './Format';

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

    constructor(
        public account: AccountInfo,
        public nimAddresses: string[],
        public btcAddresses: { internal: string[], external: string[] },
        public transactions: (NimTx | BtcTx)[],
        public year: number,
    ) {
        super(BlockpitAppFormat.HEADERS, account, nimAddresses, btcAddresses, transactions, year);
    }

    public export() {
        const alreadyProcessedTransactionHashes: string[] = [];

        for (const tx of this.transactions) {
            if (alreadyProcessedTransactionHashes.includes(tx.transactionHash)) continue;

            let messageOverride: string | undefined;

            // Detect swaps and add them in the same row
            const swapInfo = useSwapsStore().getSwapByTransactionHash.value(tx.transactionHash);
            if (swapInfo) {
                const isIncoming = 'sender' in tx
                    ? this.nimAddresses.includes(tx.recipient)
                    : Boolean(tx.outputs.some(
                        (output) => output.address
                            && this.btcAddresses.external.includes(output.address)));

                const otherSideSwapData = isIncoming ? swapInfo.in : swapInfo.out;

                if (swapInfo.in && swapInfo.out) {
                    messageOverride = `Swap ${swapInfo.in.asset} to ${swapInfo.out.asset}`;
                }

                if (otherSideSwapData?.asset !== SwapAsset.EUR) {
                    const otherTransaction = this.transactions.find(
                        (t) => t.transactionHash === otherSideSwapData?.transactionHash,
                    );

                    if (otherTransaction) {
                        // Skip this transaction when it's its turn
                        alreadyProcessedTransactionHashes.push(otherTransaction.transactionHash);

                        // Ignore cancelled/refunded swaps
                        if (swapInfo.in?.asset === swapInfo.out?.asset) continue;

                        this.addRow(
                            isIncoming ? tx : otherTransaction,
                            isIncoming ? otherTransaction : tx,
                            messageOverride,
                        );
                        continue;
                    }
                }
            }

            if ('sender' in tx) { // Nimiq
                const isSender = this.nimAddresses.includes(tx.sender);
                const isRecipient = this.nimAddresses.includes(tx.recipient);

                if (isSender && isRecipient) continue; // Skip self-transfers
                if (isSender) this.addRow(undefined, tx, messageOverride);
                if (isRecipient) this.addRow(tx, undefined, messageOverride);
            } else { // Bitcoin
                const isSender = tx.inputs.some(
                    (input) => input.address && (this.btcAddresses.internal.includes(input.address)
                        || this.btcAddresses.external.includes(input.address)));

                const isRecipient = tx.outputs.some(
                    (output) => output.address
                        && this.btcAddresses.external.includes(output.address));

                if (isSender && isRecipient) continue; // Skip self-transfers
                if (isSender) this.addRow(undefined, tx, messageOverride);
                if (isRecipient) this.addRow(tx, undefined, messageOverride);
            }
        }

        this.download();
    }

    private addRow(
        txIn?: BtcTx | NimTx,
        txOut?: BtcTx | NimTx,
        messageOverride?: string,
        linkedTransaction?: number,
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
            this.account.label,
            this.formatDate(timestamp),
            txIn ? this.getTxAsset(txIn) : '',
            txIn && valueIn ? this.formatAmount(this.getTxAsset(txIn), valueIn) : '',
            txOut ? this.getTxAsset(txOut) : '',
            txOut && valueOut ? this.formatAmount(this.getTxAsset(txOut), valueOut) : '',
            txOut && feeOut
                ? this.getTxAsset(txOut)
                : '',
            txOut && feeOut
                ? this.formatAmount(this.getTxAsset(txOut), feeOut)
                : '',
            txIn && txOut ? 'trade' : txIn ? 'deposit' : 'withdrawal',
            messageOverride || (
                (txIn && 'sender' in txIn && !txOut) || (txOut && 'sender' in txOut && !txIn)
                    ? this.formatNimiqData(txIn || txOut!, !!txIn)
                    : ''
            ),
            linkedTransaction ? linkedTransaction.toString() : '',
        ]);
    }

    private formatDate(timestamp: number) {
        const txDate = this.getTxDate(timestamp, true);
        return txDate.dateObj.toISOString();
    }

    private getTxAsset(tx: BtcTx | NimTx) {
        return 'sender' in tx ? 'NIM' : 'BTC';
    }

    private formatAmount(asset: 'NIM' | 'BTC', value: number) {
        return asset === 'NIM' ? this.formatLunas(value) : this.formatSatoshis(value);
    }

    private getValue(tx: BtcTx | NimTx, isIncoming: boolean): { value: number, outgoingFee: number } {
        // Nimiq
        if ('sender' in tx) {
            return {
                value: tx.value,
                outgoingFee: isIncoming ? 0 : tx.fee,
            };
        } else { // eslint-disable-line no-else-return
            // Bitcoin
            if (isIncoming) { // eslint-disable-line no-lonely-if
                // Sum outputs that are ours
                const value = tx.outputs.reduce((sum, output) => {
                    if (output.address && this.btcAddresses.external.includes(output.address)) {
                        return sum + output.value;
                    }
                    return sum;
                }, 0);

                return {
                    value,
                    outgoingFee: 0,
                };
            } else { // eslint-disable-line no-else-return
                // Sum up all inputs, if we have all parent transactions
                let sumInputs = 0;
                const { state: btcTransactions$ } = useBtcTransactionsStore();
                for (const input of tx.inputs) {
                    const value = btcTransactions$
                        .transactions[input.transactionHash]?.outputs[input.outputIndex]?.value;
                    if (!value) {
                        sumInputs = 0;
                        break;
                    }
                    sumInputs += value;
                }

                // Sum up all outputs, and non-change outputs
                const [sumOutputs, value] = tx.outputs.reduce(([total, mySum], output) => {
                    total += output.value;
                    // Sum outputs that are not change
                    if (!output.address || !this.btcAddresses.internal.includes(output.address)) {
                        mySum += output.value;
                    }
                    return [total, mySum];
                }, [0, 0]);

                // If we have the input sum, we can determine the fee
                const fee = sumInputs > 0 ? sumInputs - sumOutputs : 0;

                return {
                    value,
                    outgoingFee: fee,
                };
            }
        }
    }
}

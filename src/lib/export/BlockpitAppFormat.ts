import { AccountInfo } from '../../stores/Account';
import { AddressInfo } from '../../stores/Address';
import { Transaction as NimTx } from '../../stores/Transactions';
import { Transaction as BtcTx, useBtcTransactionsStore } from '../../stores/BtcTransactions';
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

    private static getTxAsset(tx: BtcTx | NimTx) {
        return 'sender' in tx ? 'NIM' : 'BTC';
    }

    private static formatAmount(asset: 'NIM' | 'BTC', value: number) {
        return asset === 'NIM' ? Format.formatLunas(value) : Format.formatSatoshis(value);
    }

    private readonly EXCHANGE_NAME = 'Nimiq Wallet';

    private id = 0;

    constructor(
        public account: AccountInfo,
        public nimAddresses: Map<string, AddressInfo>,
        public btcAddresses: { internal: string[], external: string[] },
        public transactions: (NimTx | BtcTx)[],
        public year: number,
    ) {
        super(BlockpitAppFormat.HEADERS, account, nimAddresses, btcAddresses, transactions, year);
    }

    public export() {
        for (const tx of this.transactions) {
            // TODO: Detect swaps with findSwapByTransactionHash() add them in the same row

            if ('sender' in tx) { // Nimiq
                const sender = this.getNimiqAddressInfo(tx.sender);
                const recipient = this.getNimiqAddressInfo(tx.recipient);

                if (sender && recipient) continue; // Skip self-transfers
                if (sender) this.addRow(tx.value, undefined, tx, tx.fee);
                if (recipient) this.addRow(tx.value, tx);
            } else { // Bitcoin
                const isSender = tx.inputs.some(
                    (input) => input.address && (this.btcAddresses.internal.includes(input.address)
                        || this.btcAddresses.external.includes(input.address)));

                const isRecipient = tx.outputs.some(
                    (output) => output.address
                        && this.btcAddresses.external.includes(output.address));

                if (isSender && isRecipient) continue; // Skip self-transfers
                if (isSender) {
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

                    const [sumOutputs, value] = tx.outputs.reduce(([total, mySum], output) => {
                        total += output.value;
                        // Sum outputs that are not change
                        if (!output.address || !this.btcAddresses.internal.includes(output.address)) {
                            mySum += output.value;
                        }
                        return [total, mySum];
                    }, [0, 0]);

                    const fee = sumInputs > 0 ? sumInputs - sumOutputs : 0;

                    this.addRow(value, undefined, tx, fee);
                }
                if (isRecipient) {
                    // Sum outputs that are ours
                    const value = tx.outputs.reduce((sum, output) => {
                        if (output.address && this.btcAddresses.external.includes(output.address)) {
                            return sum + output.value;
                        }
                        return sum;
                    }, 0);
                    this.addRow(value, tx);
                }
            }
        }

        this.download();
    }

    private addRow(
        value: number,
        incomingTx?: BtcTx | NimTx,
        outgoingTx?: BtcTx | NimTx,
        outgoingFee?: number,
        linkedTransaction?: number,
    ) {
        if (!incomingTx && !outgoingTx) return;

        const timestamp = Math.min(incomingTx?.timestamp || Infinity, outgoingTx?.timestamp || Infinity);

        this.rows.push([
            (++this.id).toString(),
            this.EXCHANGE_NAME,
            this.account.label,
            BlockpitAppFormat.formatDate(timestamp),
            incomingTx ? BlockpitAppFormat.getTxAsset(incomingTx) : '',
            incomingTx ? BlockpitAppFormat.formatAmount(BlockpitAppFormat.getTxAsset(incomingTx), value) : '',
            outgoingTx ? BlockpitAppFormat.getTxAsset(outgoingTx) : '',
            outgoingTx ? BlockpitAppFormat.formatAmount(BlockpitAppFormat.getTxAsset(outgoingTx), value) : '',
            outgoingTx && outgoingFee
                ? BlockpitAppFormat.getTxAsset(outgoingTx)
                : '',
            outgoingTx && outgoingFee
                ? BlockpitAppFormat.formatAmount(BlockpitAppFormat.getTxAsset(outgoingTx), outgoingFee)
                : '',
            incomingTx && outgoingTx ? 'swap' : incomingTx ? 'deposit' : 'withdrawal',
            (incomingTx && 'sender' in incomingTx && !outgoingTx)
            || (outgoingTx && 'sender' in outgoingTx && !incomingTx)
                ? Format.formatNimiqData(incomingTx || outgoingTx!, !!incomingTx)
                : '',
            linkedTransaction ? linkedTransaction.toString() : '',
        ]);
    }
}

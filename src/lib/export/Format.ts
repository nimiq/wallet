import { SwapAsset } from '@nimiq/fastspot-api';
import { useAddressStore } from '../../stores/Address';
import { useProxyStore } from '../../stores/Proxy';
import { Transaction as NimTx } from '../../stores/Transactions';
import { Transaction as BtcTx, useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { parseData } from '../DataFormatting';
import { isProxyData, ProxyType } from '../ProxyDetection';
import { useSwapsStore } from '../../stores/Swaps';
import { ExportFormat } from './TransactionExport';

/* eslint-disable class-methods-use-this */

export abstract class Format {
    protected rows: string[][] = [];

    constructor(
        private format: ExportFormat,
        private headers: string[],
        public nimAddresses: string[],
        public btcAddresses: { internal: string[], external: string[] },
        public transactions: (NimTx | BtcTx)[],
        public year: number,
    ) {}

    protected getNimiqAddressInfo(address: string) {
        return useAddressStore().state.addressInfos[address];
    }

    protected getTxDate(timestamp: number, utc = false) {
        const dateObj = new Date(timestamp * 1e3);

        return {
            dateObj,
            year: utc ? dateObj.getUTCFullYear() : dateObj.getFullYear(),
            month: utc ? dateObj.getUTCMonth() + 1 : dateObj.getMonth() + 1,
            date: utc ? dateObj.getUTCDate() : dateObj.getDate(),
            hour: utc ? dateObj.getUTCHours() : dateObj.getHours(),
            minute: utc ? dateObj.getUTCMinutes() : dateObj.getMinutes(),
            second: utc ? dateObj.getUTCSeconds() : dateObj.getSeconds(),
        };
    }

    protected formatLunas(lunas: number) {
        return (lunas / 1e5).toString();
    }

    protected formatSatoshis(satoshis: number) {
        return (satoshis / 1e8).toString();
    }

    protected formatNimiqData(transaction: NimTx, isIncoming: boolean) {
        let message = '';
        if (isProxyData(transaction.data.raw, ProxyType.CASHLINK)) {
            const { state: proxies$ } = useProxyStore();
            const cashlinkAddress = isIncoming ? transaction.sender : transaction.recipient;
            const hubCashlink = proxies$.hubCashlinks[cashlinkAddress];
            if (hubCashlink && hubCashlink.message) {
                message = hubCashlink.message;
            }
        } else if ('hashRoot' in transaction.data) {
            message = 'HTLC Creation';
        } else if ('hashRoot' in transaction.proof) {
            message = 'HTLC Settlement';
        } else if ('creator' in transaction.proof) {
            message = 'HTLC Refund';
        } else {
            message = parseData(transaction.data.raw);
        }

        // Escape message for use in CSV
        if (message.includes(',')) {
            // Escape any double quotes inside the message
            message = message.replace(/"/g, '""');
            // Then enclose the message in double quotes
            message = `"${message}"`;
        }

        return message;
    }

    public export(filename?: string) {
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

        this.download(filename);
    }

    protected abstract addRow(
        txIn?: BtcTx | NimTx,
        txOut?: BtcTx | NimTx,
        messageOverride?: string,
    ): void

    protected download(filename?: string) {
        const file = [
            this.headers,
            ...this.rows,
        ];

        const csvContent = file.map((cells) => cells.join(',')).join('\r\n');

        // Create a blob
        const blob = new Blob([csvContent], { type: 'data:text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Create a link to download it
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename || 'Nimiq-Wallet-History-Export'}.${this.format}.${this.year}.csv`);
        link.click();
    }

    protected getTxAsset(tx: BtcTx | NimTx) {
        return 'sender' in tx ? 'NIM' : 'BTC';
    }

    protected formatAmount(asset: 'NIM' | 'BTC', value: number) {
        return asset === 'NIM' ? this.formatLunas(value) : this.formatSatoshis(value);
    }

    protected getValue(tx: BtcTx | NimTx, isIncoming: boolean): {
        value: number,
        outgoingFee: number,
    }

    protected getValue(tx: BtcTx | NimTx, isIncoming: boolean, fiatAsset: string): {
        value: number,
        outgoingFee: number,
        fiatValue?: number,
    }

    protected getValue(tx: BtcTx | NimTx, isIncoming: boolean, fiatAsset?: string): {
        value: number,
        outgoingFee: number,
        fiatValue?: number,
     } {
        // Nimiq
        if ('sender' in tx) {
            return {
                value: tx.value,
                outgoingFee: isIncoming ? 0 : tx.fee,
                ...(fiatAsset ? { fiatValue: tx.fiatValue?.[fiatAsset] || undefined } : {}),
            };
        } else { // eslint-disable-line no-else-return
            // Bitcoin
            if (isIncoming) { // eslint-disable-line no-lonely-if
                // Sum outputs that are ours
                const [value, fiatValue] = tx.outputs.reduce(([satsSum, fiatSum], output) => {
                    if (output.address && this.btcAddresses.external.includes(output.address)) {
                        satsSum += output.value;
                        const outputFiat = fiatAsset ? output.fiatValue?.[fiatAsset] || undefined : 0;
                        if (fiatSum !== undefined && outputFiat !== undefined) fiatSum += outputFiat;
                        else fiatSum = undefined;
                    }
                    return [satsSum, fiatSum];
                }, [0, 0 as number | undefined]);

                return {
                    value,
                    outgoingFee: 0,
                    ...(fiatAsset ? { fiatValue } : {}),
                };
            } else { // eslint-disable-line no-else-return
                // Sum up all inputs, if we have all parent transactions
                let totalInput = 0;
                const { state: btcTransactions$ } = useBtcTransactionsStore();
                for (const input of tx.inputs) {
                    const value = btcTransactions$
                        .transactions[input.transactionHash]?.outputs[input.outputIndex]?.value;
                    if (!value) {
                        totalInput = 0;
                        break;
                    }
                    totalInput += value;
                }

                // Sum up all outputs, and non-change outputs
                const [totalOutput, value, fiatValue] = tx.outputs.reduce(([total, satsSum, fiatSum], output) => {
                    total += output.value;
                    // Sum outputs that are not change
                    if (!output.address || !this.btcAddresses.internal.includes(output.address)) {
                        satsSum += output.value;
                        const outputFiat = fiatAsset ? output.fiatValue?.[fiatAsset] || undefined : 0;
                        if (fiatSum !== undefined && outputFiat !== undefined) fiatSum += outputFiat;
                        else fiatSum = undefined;
                    }
                    return [total, satsSum, fiatSum];
                }, [0, 0, 0 as number | undefined]);

                // If we have the input sum, we can determine the fee
                const fee = totalInput > 0 ? totalInput - totalOutput : 0;

                return {
                    value,
                    outgoingFee: fee,
                    ...(fiatAsset ? { fiatValue } : {}),
                };
            }
        }
    }
}

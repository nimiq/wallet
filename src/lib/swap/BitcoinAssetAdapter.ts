import { TransactionDetails, TransactionState } from '@nimiq/electrum-client';
import { AssetAdapter, SwapAsset } from './IAssetAdapter';

export { TransactionDetails };

export interface BitcoinClient {
    addTransactionListener(listener: (tx: TransactionDetails) => any, addresses: string[]): number | Promise<number>;
    getTransactionsByAddress(address: string): Promise<TransactionDetails[]>;
    removeListener(handle: number): void | Promise<void>;
    sendTransaction(tx: TransactionDetails | string): Promise<TransactionDetails>;
}

export class BitcoinAssetAdapter implements AssetAdapter<SwapAsset.BTC> {
    private cancelCallback: ((reason: Error) => void) | null = null;
    private stopped = false;

    constructor(private client: BitcoinClient) {}

    public async findTransaction(
        address: string,
        test: (tx: TransactionDetails) => boolean,
    ): Promise<TransactionDetails> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const listener = (tx: TransactionDetails) => {
                if (!test(tx)) return false;

                this.client.removeListener(handle);
                this.cancelCallback = null;
                resolve(tx);
                return true;
            };

            // First subscribe to new transactions
            const handle = await this.client.addTransactionListener(listener, [address]);

            this.cancelCallback = (reason: Error) => {
                this.client.removeListener(handle);
                reject(reason);
            };

            // Then check history
            const history = await this.client.getTransactionsByAddress(address);
            for (const tx of history) {
                if (listener(tx)) break;
            }
        });
    }

    public async awaitHtlcFunding(
        address: string,
        value: number,
        data?: string,
        onPending?: (tx: TransactionDetails) => any,
    ): Promise<TransactionDetails> {
        return this.findTransaction(
            address,
            (tx) => {
                const htlcOutput = tx.outputs.find((out) => out.address === address);
                if (!htlcOutput) return false;
                if (htlcOutput.value !== value) return false;

                if (tx.replaceByFee) {
                    // Must wait until mined
                    if (tx.state === TransactionState.MINED || tx.state === TransactionState.CONFIRMED) return true;

                    if (typeof onPending === 'function') onPending(tx);

                    return false;
                }

                return true;
            },
        );
    }

    public async fundHtlc(address: string, serializedTx: string): Promise<TransactionDetails> {
        return this.sendTransaction(serializedTx);
    }

    public async awaitHtlcSettlement(address: string, data: string): Promise<TransactionDetails> {
        return this.findTransaction(
            address,
            (tx) => tx.inputs.some((input) => input.address === address
                && typeof input.witness[4] === 'string' && input.witness[4] === data),
        );
    }

    public async awaitSwapSecret(address: string, data: string): Promise<string> {
        const tx = await this.awaitHtlcSettlement(address, data);
        return tx.inputs[0].witness[2] as string;
    }

    public async settleHtlc(serializedTx: string, secret: string): Promise<TransactionDetails> {
        // const rawTx = BitcoinJS.Transaction.fromHex(serializedTx);
        // rawTx.ins[0].witness[2] = BitcoinJS.Buffer.from(secret, 'hex');
        // serializedTx = rawTx.toHex();
        serializedTx = serializedTx.replace(
            '000000000000000000000000000000000000000000000000000000000000000001', // Dummy secret + marker
            `${secret}01`,
        );
        return this.sendTransaction(serializedTx);
    }

    public stop(reason: Error): void {
        if (this.cancelCallback) this.cancelCallback(reason);
        this.stopped = true;
    }

    private async sendTransaction(serializedTx: string): Promise<TransactionDetails> {
        if (this.stopped) throw new Error('BitcoinAssetAdapter called while stopped');
        return this.client.sendTransaction(serializedTx);
    }
}

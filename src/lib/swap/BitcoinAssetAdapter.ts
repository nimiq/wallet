import type { TransactionDetails, ConsensusState } from '@nimiq/electrum-client';
import { AssetAdapter, SwapAsset } from './IAssetAdapter';

export { TransactionDetails, ConsensusState };

export interface BitcoinClient {
    addTransactionListener(listener: (tx: TransactionDetails) => any, addresses: string[]): number | Promise<number>;
    getTransactionsByAddress(
        address: string,
        sinceBlockHeight?: number,
        knownTransactions?: TransactionDetails[],
    ): Promise<TransactionDetails[]>;
    removeListener(handle: number): void | Promise<void>;
    sendTransaction(tx: TransactionDetails | string): Promise<TransactionDetails>;
    addConsensusChangedListener(listener: (consensusState: ConsensusState) => any): number | Promise<number>;
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

                cleanup();
                resolve(tx);
                return true;
            };

            // First subscribe to new transactions
            const transactionListener = await this.client.addTransactionListener(listener, [address]);

            // Setup a transaction history check function
            let history: TransactionDetails[] = [];
            const checkHistory = async () => {
                history = await this.client.getTransactionsByAddress(address, 0, history);
                for (const tx of history) {
                    if (listener(tx)) break;
                }
            };

            // Then check transaction history
            checkHistory();

            // Re-check transaction history when consensus is re-established
            const consensusListener = await this.client.addConsensusChangedListener(
                (consensusState: ConsensusState) => consensusState === 'established' && checkHistory(),
            );

            // Also re-check transaction history every minute to catch cases where subscription fails
            // or a short connection outage happened that didn't register as a consensus event.
            const historyCheckInterval = window.setInterval(checkHistory, 60 * 1000); // Every minute

            const cleanup = () => {
                this.client.removeListener(transactionListener);
                this.client.removeListener(consensusListener);
                window.clearInterval(historyCheckInterval);
                this.cancelCallback = null;
            };

            // Assign global cancel callback
            this.cancelCallback = (reason: Error) => {
                cleanup();
                reject(reason);
            };
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
                    if (tx.state === 'mined' || tx.state === 'confirmed') return true;

                    if (typeof onPending === 'function') onPending(tx);

                    return false;
                }

                return true;
            },
        );
    }

    public async fundHtlc(address: string, serializedTx: string): Promise<TransactionDetails> {
        if (this.stopped) throw new Error('BitcoinAssetAdapter called while stopped');
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

    public async awaitSettlementConfirmation(address: string): Promise<TransactionDetails> {
        return this.findTransaction(address, (tx) => {
            if (!tx.inputs.some((input) => input.address === address && input.witness.length === 5)) return false;
            if (tx.state === 'invalidated') {
                throw new Error(`Transaction is ${tx.state}`);
            }
            return tx.state === 'mined' || tx.state === 'confirmed';
        });
    }

    public stop(reason: Error): void {
        if (this.cancelCallback) this.cancelCallback(reason);
        this.stopped = true;
    }

    private async sendTransaction(serializedTx: string): Promise<TransactionDetails> {
        return this.client.sendTransaction(serializedTx);
    }
}

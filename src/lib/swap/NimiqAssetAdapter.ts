import { AssetAdapter, SwapAsset } from './IAssetAdapter';

export type TransactionDetails = ReturnType<import('@nimiq/core-web').Client.TransactionDetails['toPlain']>;
export type ConsensusState = import('@nimiq/core-web').Client.ConsensusState;

export interface NimiqClient {
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

export class NimiqAssetAdapter implements AssetAdapter<SwapAsset.NIM> {
    private cancelCallback: ((reason: Error) => void) | null = null;
    private stopped = false;

    constructor(private client: NimiqClient) {}

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
        data: string,
        onPending?: (tx: TransactionDetails) => any,
    ): Promise<TransactionDetails> {
        return this.findTransaction(
            address,
            (tx) => {
                if (tx.recipient !== address) return false;
                if (tx.value !== value) return false;
                if (typeof tx.data.raw !== 'string' || tx.data.raw !== data) return false;

                if (typeof onPending === 'function') onPending(tx);

                // Must wait until mined
                return tx.state === 'mined' || tx.state === 'confirmed';
            },
        );
    }

    public async fundHtlc(
        address: string,
        serializedTx: string,
        onPending?: (tx: TransactionDetails) => any,
    ): Promise<TransactionDetails> {
        const tx = await this.sendTransaction(serializedTx);

        if (tx.state === 'pending') {
            if (typeof onPending === 'function') onPending(tx);
            return this.awaitHtlcFunding(tx.recipient, tx.value, tx.data.raw);
        }

        return tx;
    }

    public async awaitHtlcSettlement(address: string): Promise<TransactionDetails> {
        return this.findTransaction(
            address,
            (tx) => tx.sender === address
                && typeof (tx.proof as any as { preImage: string }).preImage === 'string',
        );
    }

    public async awaitSwapSecret(address: string): Promise<string> {
        const tx = await this.awaitHtlcSettlement(address);
        return (tx.proof as any as { preImage: string }).preImage;
    }

    public async settleHtlc(serializedTx: string, secret: string, hash: string): Promise<TransactionDetails> {
        serializedTx = serializedTx.replace(
            '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925' // SHA256 hash of dummy secret
            + '0000000000000000000000000000000000000000000000000000000000000000', // Dummy secret
            `${hash}${secret}`,
        );
        return this.sendTransaction(serializedTx);
    }

    public stop(reason: Error): void {
        if (this.cancelCallback) this.cancelCallback(reason);
        this.stopped = true;
    }

    private async sendTransaction(serializedTx: string): Promise<TransactionDetails> {
        if (this.stopped) throw new Error('NimiqAssetAdapter called while stopped');
        const tx = await this.client.sendTransaction(serializedTx);
        if (tx.state === 'new') throw new Error('Failed to send transaction');
        return tx;
    }
}

import { NetworkClient } from '@nimiq/network-client';
import { IAssetHandler } from './IAssetHandler';
import { TransactionState } from '../../stores/Transactions';

export type Transaction = ReturnType<import('@nimiq/core-web').Client.TransactionDetails['toPlain']>;

export class NimiqAssetHandler implements IAssetHandler<Transaction> {
    private client: NetworkClient;

    constructor(client: NetworkClient) {
        this.client = client;
    }

    public async findTransaction(address: string, test: (tx: Transaction) => boolean): Promise<Transaction> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const listener = (tx: Transaction) => {
                if (!test(tx)) return false;

                this.client.removeListener(handle);
                resolve(tx);
                return true;
            };

            // First subscribe to new transactions
            const handle = await this.client.addTransactionListener(listener, [address]);

            // Then check history
            const history = await this.client.getTransactionsByAddress(address);
            for (const tx of history) {
                if (listener(tx)) break;
            }
        });
    }

    public async awaitHtlcCreation(
        address: string,
        value: number,
        data: string,
        onPending?: (tx: Transaction) => any,
    ): Promise<Transaction> {
        return this.findTransaction(
            address,
            (tx) => {
                if (tx.recipient !== address) return false;
                if (tx.value !== value) return false;
                if (typeof tx.data.raw !== 'string' || tx.data.raw !== data) return false;

                if (typeof onPending === 'function') onPending(tx);

                // Must wait until mined
                return tx.state === TransactionState.MINED || tx.state === TransactionState.CONFIRMED;
            },
        );
    }

    public async createHtlc(serializedTx: string, onPending?: (tx: Transaction) => any): Promise<Transaction> {
        const tx = await this.sendTransaction(serializedTx);

        if (tx.state === TransactionState.PENDING) {
            if (typeof onPending === 'function') onPending(tx);
            return this.awaitHtlcCreation(tx.recipient, tx.value, tx.data.raw);
        }

        return tx;
    }

    public async awaitHtlcSettlement(address: string): Promise<Transaction> {
        return this.findTransaction(
            address,
            (tx) => tx.sender === address
                // @ts-expect-error
                && typeof tx.proof.preImage === 'string',
        );
    }

    public async awaitSwapSecret(address: string): Promise<string> {
        const tx = await this.awaitHtlcSettlement(address);
        // @ts-expect-error
        return tx.proof.preImage;
    }

    public async settleHtlc(serializedTx: string, secret: string, hash: string): Promise<Transaction> {
        serializedTx = serializedTx.replace(
            '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925' // SHA256 hash of dummy secret
            + '0000000000000000000000000000000000000000000000000000000000000000', // Dummy secret
            `${hash}${secret}`,
        );
        return this.sendTransaction(serializedTx);
    }

    private async sendTransaction(serializedTx: string): Promise<Transaction> {
        const tx = await this.client.sendTransaction(serializedTx);
        if (tx.state === TransactionState.NEW) throw new Error('Failed to send transaction');
        return tx;
    }
}

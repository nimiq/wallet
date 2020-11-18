import { NetworkClient } from '@nimiq/network-client';
import { IAssetHandler } from './IAssetHandler';

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
}

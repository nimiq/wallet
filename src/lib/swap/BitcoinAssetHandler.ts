import { ElectrumClient, TransactionDetails } from '@nimiq/electrum-client';
import { IAssetHandler } from './IAssetHandler';

export class BitcoinAssetHandler implements IAssetHandler<TransactionDetails> {
    private client: ElectrumClient;

    constructor(client: ElectrumClient) {
        this.client = client;
    }

    public async findTransaction(
        address: string,
        test: (tx: TransactionDetails) => boolean,
    ): Promise<TransactionDetails> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const listener = (tx: TransactionDetails) => {
                if (!test(tx)) return false;

                this.client.removeListener(handle);
                resolve(tx);
                return true;
            };

            // First subscribe to new transactions
            const handle = this.client.addTransactionListener(listener, [address]);

            // Then check history
            const history = await this.client.getTransactionsByAddress(address);
            for (const tx of history) {
                if (listener(tx)) break;
            }
        });
    }
}

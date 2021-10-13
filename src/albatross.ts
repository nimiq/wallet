// @ts-expect-error no types
import { createRemote } from './lib/gentle_rpc/remote';
// @ts-expect-error no types
import { wsProxyHandler } from './lib/gentle_rpc/proxy';

import {
    Account,
    Block as AlbatrossBlock,
    Staker,
    Stakes,
    Transaction as AlbatrossTransaction,
} from '../../../github/albatross-remote/src/lib/server-types';

export type Block = AlbatrossBlock & {
    height: number,
    transactions?: Transaction[],
}

function convertBlock(block: AlbatrossBlock): Block {
    return {
        ...block,
        height: block.number,
        transactions: block.transactions?.map(convertTransaction),
    };
}

export type Transaction = AlbatrossTransaction & {
    transactionHash: string,
    blockHeight: number,
    sender: string,
    recipient: string,
}

function convertTransaction(transaction: AlbatrossTransaction): Transaction {
    return {
        ...transaction,
        transactionHash: transaction.hash,
        blockHeight: transaction.blockNumber,
        sender: transaction.from,
        recipient: transaction.to,
    };
}

export enum ConsensusState {
    CONNECTING = 'connecting',
    SYNCING = 'syncing',
    ESTABLISHED = 'established',
}

export type Handle = number;
export type ConsensusChangedListener = (consensusState: ConsensusState) => any;
export type HeadChangedListener = (block: Block) => any;
export type TransactionListener = (transaction: Transaction) => any;

export class AlbatrossRpcClient {
    private url: string;
    private remote?: Promise<any>;
    private blockSubscriptions: {
        [handle: number]: HeadChangedListener,
    } = {};

    private transactionSubscriptions: {
        [address: string]: TransactionListener[],
    } = {};

    constructor(url: string) {
        this.url = url;

        this.getRemote().then(async (remote) => {
            const id = await remote.headSubscribe([]);
            const { generator } = remote.subscription.listen();
            for await (const params of generator) {
                if (!params || params.subscription !== id) continue;

                const blockHash = params.result as string;
                // eslint-disable-next-line no-await-in-loop
                const block = await remote.getBlockByHash([blockHash, true]).then(convertBlock) as Block;
                if (!block) continue;

                // Trigger block listeners
                for (const listener of Object.values(this.blockSubscriptions)) {
                    listener(block);
                }

                // Trigger transaction listeners
                const addresses = Object.keys(this.transactionSubscriptions);
                for (const tx of block.transactions || []) {
                    // Even if the transaction is between two of our own (and thus subscribed) addresses,
                    // we only need to trigger one tx listener, as the tx is then added for both addresses
                    // and the handler also updates the balances of both addresses.
                    const address = addresses.includes(tx.sender)
                        ? tx.sender
                        : addresses.includes(tx.recipient)
                            ? tx.recipient
                            : null;

                    if (address) {
                        for (const listener of this.transactionSubscriptions[address]) {
                            listener(tx);
                        }
                    }
                }
            }
        });
    }

    public addHeadChangedListener(listener: HeadChangedListener): Handle {
        let handle: Handle;
        do {
            handle = Math.round(Math.random() * 1000);
        } while (this.blockSubscriptions[handle]);

        this.blockSubscriptions[handle] = listener;
        return handle;
    }

    public addTransactionListener(listener: TransactionListener, address: string) {
        const listeners = this.transactionSubscriptions[address] || [];
        listeners.push(listener);
        this.transactionSubscriptions[address] = listeners;
    }

    public async getTransactionsByAddress(
        address: string,
        _fromHeight?: number,
        _knownTxs?: Transaction[],
        max?: number,
    ) {
        return this.rpc<AlbatrossTransaction[]>('getTransactionsByAddress', [address, max || null])
            .then((txs) => txs.map(convertTransaction));
    }

    public async sendTransaction(tx: string | Transaction) {
        if (typeof tx === 'string') {
            const hash = await this.rpc<string>('sendRawTransaction', [tx]);
            do {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((res) => setTimeout(res, 500));
                try {
                    // eslint-disable-next-line no-await-in-loop
                    return await this.rpc<AlbatrossTransaction>('getTransactionByHash', [hash, false])
                        .then(convertTransaction);
                } catch (error) {
                    if (error.data && error.data.includes('Transaction not found')) continue;
                    console.error(error); // eslint-disable-line no-console
                }
            } while (true); // eslint-disable-line no-constant-condition
        } else {
            throw new Error('UNIMPLEMENTED: sending transaction objects');
        }
    }

    public async getAccount(address: string): Promise<Account> {
        return this.rpc<Account>('getAccount', [address]);
    }

    public async getStaker(address: string): Promise<Staker> {
        return this.rpc<Staker>('getStakerByAddress', [address]);
    }

    public async listStakes(): Promise<Stakes> {
        return this.rpc<Stakes>('getActiveValidators');
    }

    private async getRemote(): Promise<any> {
        return this.remote || (this.remote = new Promise((resolve) => {
            const ws = new WebSocket(`${this.url.replace('http', 'ws')}/ws`);
            createRemote(ws).then((remote: any) => {
                const proxy = new Proxy(
                    remote,
                    wsProxyHandler,
                );
                resolve(proxy);
            });
        }));
    }

    private async rpc<T>(method: string, params: any[] = []): Promise<T> {
        const remote = await this.getRemote();
        return remote[method](params);
    }
}

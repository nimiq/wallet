import type {
    Account,
    Block as AlbatrossBlock,
    Staker,
    Stakes,
    Transaction as AlbatrossTransaction,
} from '@sisou/albatross-remote/lib/lib/server-types';
// @ts-expect-error no types
import { createRemote } from './lib/gentle_rpc/remote';
// @ts-expect-error no types
import { wsProxyHandler } from './lib/gentle_rpc/proxy';
import { TransactionState } from './stores/Transactions';
import { useNetworkStore } from './stores/Network';
import { StakingTransactionType, STAKING_CONTRACT_ADDRESS } from './lib/Constants';
import { unserializeAddress } from './lib/Address';

export type Block = Omit<AlbatrossBlock, 'transactions'> & {
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

export type Transaction = Omit<AlbatrossTransaction, 'hash' | 'blockNumber' | 'from' | 'to' | 'data' | 'proof'> & {
    transactionHash: string,
    state: TransactionState,
    blockHeight: number,
    sender: {
        toUserFriendlyAddress(): string,
    },
    recipient: {
        toUserFriendlyAddress(): string,
    },
    data: { raw: string },
    proof: { raw: string },
    toPlain(): Omit<Transaction, 'sender' | 'recipient' | 'toPlain'> & {
        sender: string,
        recipient: string,
    },
}

function convertTransaction(transaction: AlbatrossTransaction): Transaction {
    const plain = {
        ...transaction,
        transactionHash: transaction.hash,
        state: !transaction.confirmations
            ? TransactionState.PENDING
            : transaction.confirmations < 10
                ? TransactionState.MINED
                : TransactionState.CONFIRMED,
        blockHeight: transaction.blockNumber,
        sender: transaction.from,
        recipient: transaction.to,
        timestamp: Math.floor(transaction.timestamp / 1e3),
        data: { raw: transaction.data },
        proof: {
            raw: transaction.proof,
        },
    };

    return {
        ...transaction,
        transactionHash: transaction.hash,
        state: !transaction.confirmations
            ? TransactionState.PENDING
            : transaction.confirmations < 10
                ? TransactionState.MINED
                : TransactionState.CONFIRMED,
        blockHeight: transaction.blockNumber,
        sender: {
            toUserFriendlyAddress() { return transaction.from; },
        },
        recipient: {
            toUserFriendlyAddress() { return transaction.to; },
        },
        timestamp: Math.floor(transaction.timestamp / 1000),
        data: { raw: transaction.data },
        proof: {
            raw: transaction.proof,
        },
        toPlain() {
            return plain;
        },
    };
}

function transactionFromPlain(plain: ReturnType<Transaction['toPlain']>) {
    return {
        ...plain,
        sender: {
            toUserFriendlyAddress() { return plain.sender; },
        },
        recipient: {
            toUserFriendlyAddress() { return plain.recipient; },
        },
        toPlain() {
            return plain;
        },
    };
}

export enum ConsensusState {
    CONNECTING = 'connecting',
    SYNCING = 'syncing',
    ESTABLISHED = 'established',
}

export type Handle = number;
export type ConsensusChangedListener = (consensusState: ConsensusState) => any;
export type HeadChangedListener = (hash: Block) => any;
export type TransactionListener = (transaction: Transaction) => any;
export type StakingListener = (address: string, transaction: Transaction) => any;

export class AlbatrossRpcClient {
    private url: string;
    private remote?: Promise<any>;
    private blockSubscriptions: {
        [handle: number]: HeadChangedListener,
    } = {};

    private transactionSubscriptions: {
        [address: string]: TransactionListener[],
    } = {};

    private stakingSubscriptions: {
        [address: string]: StakingListener[],
    } = {};

    private consensusSubscriptions: {
        [handle: number]: ConsensusChangedListener,
    } = {};

    constructor(url: string) {
        this.url = url;

        this.getRemote().then(async (remote) => {
            const id = await remote.headSubscribe([]);
            const { generator } = remote.headSubscribe.listen();
            for await (const params of generator) {
                if (!params || params.subscription !== id) continue;
                this.onHeadChange(params.result as string);
            }
        });
    }

    public async waitForConsensusEstablished() {
        await this.getRemote();
    }

    public addConsensusChangedListener(listener: ConsensusChangedListener) {
        let handle: Handle;
        do {
            handle = Math.round(Math.random() * 1000);
        } while (this.consensusSubscriptions[handle]);

        this.consensusSubscriptions[handle] = listener;

        this.getRemote().then(() => {
            listener(ConsensusState.ESTABLISHED);
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

    // public getTransactionsByBatchNumber(batchNumber: number) {
    //     return this.rpc<AlbatrossTransaction[]>('getTransactionsByBatchNumber', [batchNumber])
    //         .then((txs) => txs.map(convertTransaction));
    // }

    public addTransactionListener(listener: TransactionListener, addresses: string[]) {
        for (const address of addresses) {
            const listeners = this.transactionSubscriptions[address] || [];
            listeners.push(listener);
            this.transactionSubscriptions[address] = listeners;
        }
    }

    public addStakingListener(listener: StakingListener, addresses: string[]) {
        for (const address of addresses) {
            const listeners = this.stakingSubscriptions[address] || [];
            listeners.push(listener);
            this.stakingSubscriptions[address] = listeners;
        }
    }

    public async getTransactionsByAddress(
        address: string,
        _fromHeight?: number,
        knownTxs?: ReturnType<Transaction['toPlain']>[],
        max?: number,
    ) {
        const rawTxs = await this.rpc<AlbatrossTransaction[]>('getTransactionsByAddress', [address, max || null]);
        const transactions = rawTxs.map(convertTransaction);

        const onlineHashes = transactions.map((tx) => tx.transactionHash);

        if (knownTxs) {
            // Mark outdated transactions as INVALIDATED
            for (const knownTx of knownTxs) {
                if (onlineHashes.includes(knownTx.transactionHash)) continue;

                transactions.push(transactionFromPlain({
                    ...knownTx,
                    state: TransactionState.INVALIDATED,
                }));
            }
        }

        return transactions;
    }

    public async sendTransaction(tx: string | Transaction) {
        if (typeof tx === 'string') {
            const hash = await this.rpc<string>('sendRawTransaction', [tx]);
            do {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((res) => { setTimeout(res, 500); });
                try {
                    // eslint-disable-next-line no-await-in-loop
                    return await this.rpc<AlbatrossTransaction>('getTransactionByHash', [hash])
                        .then(convertTransaction);
                } catch (error: any) {
                    if (error.data && error.data.includes('Transaction not found')) continue;
                    console.error(error); // eslint-disable-line no-console
                }
            } while (true); // eslint-disable-line no-constant-condition
        } else {
            throw new Error('UNIMPLEMENTED: sending transaction objects');
        }
    }

    // public async getBlock(hash: string, includeTransactions = false) {
    //     return this.rpc<Block>('getBlockByHash', [hash, includeTransactions]);
    // }

    public async getAccounts(addresses: string[]): Promise<Account[]> {
        return Promise.all(
            addresses.map((address) => this.rpc<Account>('getAccountByAddress', [address])),
        );
    }

    public async getStaker(address: string): Promise<Staker> {
        return this.rpc<Staker>('getStakerByAddress', [address]);
    }

    public async listStakes(): Promise<Stakes> {
        return this.rpc<Stakes>('getActiveValidators');
    }

    private async onHeadChange(blockHash: string) {
        const remote = await this.getRemote();
        const block = await remote.getBlockByHash([blockHash, true]).then(convertBlock) as Block;
        if (!block) return;

        // Trigger block listeners
        for (const listener of Object.values(this.blockSubscriptions)) {
            listener(block);
        }

        // Trigger transaction listeners
        const txSubscribedAddresses = Object.keys(this.transactionSubscriptions);
        for (const tx of block.transactions || []) {
            const plain = tx.toPlain();

            // Even if the transaction is between two of our own (and thus subscribed) addresses,
            // we only need to trigger one tx listener, as the tx is then added for both addresses
            // and the handler also updates the balances of both addresses.
            const txAddress = txSubscribedAddresses.includes(plain.sender)
                ? plain.sender
                : txSubscribedAddresses.includes(plain.recipient)
                    ? plain.recipient
                    : null;

            if (txAddress) {
                for (const listener of this.transactionSubscriptions[txAddress]) {
                    listener(tx);
                }
            }

            // Detect staking-contract touching txs
            if (plain.sender === STAKING_CONTRACT_ADDRESS || plain.recipient === STAKING_CONTRACT_ADDRESS) {
                const address = plain.sender === STAKING_CONTRACT_ADDRESS ? plain.recipient : plain.sender;
                const listeners = this.stakingSubscriptions[address];
                if (listeners) {
                    for (const listener of listeners) {
                        listener(address, tx);
                    }
                }
            }

            // Detect restaking payouts from pools
            if (
                plain.recipient === STAKING_CONTRACT_ADDRESS
                && plain.data.raw.startsWith(StakingTransactionType.STAKE.toString(16).padStart(2, '0'))
            ) {
                const stakerAddress = unserializeAddress(plain.data.raw.substring(2));
                const listeners = this.stakingSubscriptions[stakerAddress];
                if (listeners) {
                    for (const listener of listeners) {
                        listener(stakerAddress, tx);
                    }
                }
            }
        }
    }

    private async getRemote(): Promise<any> {
        // eslint-disable-next-line no-async-promise-executor
        return this.remote || (this.remote = new Promise(async (resolve) => {
            await new Promise((res) => { window.setTimeout(res, 2000); });

            const ws = new WebSocket(this.url.replace('http', 'ws'));
            ws.addEventListener('close', () => {
                for (const listener of Object.values(this.consensusSubscriptions)) {
                    listener(ConsensusState.CONNECTING);
                }
            });
            createRemote(ws).then((remote: any) => {
                const proxy = new Proxy(
                    remote,
                    wsProxyHandler,
                );
                this.rpc<number>('getPeerCount')
                    .then((peerCount) => useNetworkStore().state.peerCount = peerCount);
                resolve(proxy);
            });
        }));
    }

    private async rpc<T>(method: string, params: any[] = []): Promise<T> {
        const remote = await this.getRemote();
        return remote[method](params);
    }
}

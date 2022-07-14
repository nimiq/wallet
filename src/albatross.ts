import type {
    Account,
    AppliedBlockLog,
    Block as AlbatrossBlock,
    RevertedBlockLog,
    Staker,
    Stakes,
    Transaction as AlbatrossTransaction,
} from '@sisou/albatross-remote/lib/lib/server-types';
// @ts-expect-error no types
import { createRemote } from './lib/gentle_rpc/remote';
// @ts-expect-error no types
import { wsProxyHandler } from './lib/gentle_rpc/proxy';
import { TransactionState, useTransactionsStore } from './stores/Transactions';
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

function transactionFromPlain(plain: ReturnType<Transaction['toPlain']>): Transaction {
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
export type StakingListener = (address: string) => any;
type LogListener = (block: AppliedBlockLog | RevertedBlockLog) => any;

// Version 1 is before Iicruz/rpc got merged (#906)
// Version 2 is after Iicruz/rpc got merged (#906)
const VERSION = parseInt(process.env.VUE_APP_RPC_VERSION || '2', 10);

export class AlbatrossRpcClient {
    private url: string;
    private remote?: Promise<any>;
    private blockSubscriptions: {
        [handle: number]: HeadChangedListener,
    } = {};

    private logSubscriptions: Record<Handle, LogListener> = {};

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

        // Start block listener
        this.getRemote().then(async (remote) => {
            if (VERSION >= 2) {
                const id = await remote.subscribeForHeadBlock([false]);
                const { generator } = remote.subscribeForHeadBlock.listen() as {
                    generator: Generator<{ subscription: number, result: AlbatrossBlock }>,
                };
                for await (const { subscription, result: block } of generator) {
                    if (subscription !== id) continue;
                    this.onHeadChange(block);
                }
            } else {
                const id = await remote.headSubscribe([]);
                const { generator } = remote.headSubscribe.listen() as {
                    generator: Generator<{ subscription: number, result: string }>,
                };
                for await (const { subscription, result: hash } of generator) {
                    if (subscription !== id) continue;
                    this.onHeadChange(hash);
                }
            }
        });

        // Start log listener
        if (VERSION >= 2) {
            this.getRemote().then(async (remote) => {
                const { generator } = remote.subscribeForLogsByAddressesAndTypes.listen() as {
                    generator: Generator<{ subscription: number, result: AppliedBlockLog | RevertedBlockLog }>,
                };
                for await (const { subscription, result: block } of generator) {
                    const listener = this.logSubscriptions[subscription];
                    if (!listener) continue;
                    listener(block);
                }
            });
        }

        this.waitForConsensusEstablished().then(() => {
            for (const listener of Object.values(this.consensusSubscriptions)) {
                listener(ConsensusState.ESTABLISHED);
            }
        });

        this.rpc<AlbatrossBlock>('getLatestBlock', [false]).then((block) => this.onHeadChange(block));
    }

    public async waitForConsensusEstablished() {
        await this.getRemote();
    }

    public addConsensusChangedListener(listener: ConsensusChangedListener): Handle {
        let handle: Handle;
        do {
            handle = Math.round(Math.random() * 1000);
        } while (this.consensusSubscriptions[handle]);

        this.consensusSubscriptions[handle] = listener;
        return handle;
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

    public async addTransactionListener(listener: TransactionListener, addresses: string[]) {
        if (VERSION >= 2) {
            const id = await this.rpc<number>('subscribeForLogsByAddressesAndTypes', [
                addresses,
                ['transfer'],
            ]);
            this.logSubscriptions[id] = this.transactionLogListener.bind(this);
        }

        for (const address of addresses) {
            const listeners = this.transactionSubscriptions[address] || [];
            listeners.push(listener);
            this.transactionSubscriptions[address] = listeners;
        }
    }

    public async addStakingListener(listener: StakingListener, addresses: string[]) {
        if (VERSION >= 2) {
            const id = await this.rpc<number>('subscribeForLogsByAddressesAndTypes', [
                addresses,
                ['create-staker', 'stake', 'update-staker', 'unstake'],
            ]);
            this.logSubscriptions[id] = this.stakingLogListener.bind(this);
        }

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

    private async onHeadChange(blockOrHash: string | AlbatrossBlock) {
        let block: Block | undefined;

        if (typeof blockOrHash === 'string') {
            // RPC version 1
            block = await this.rpc<AlbatrossBlock>('getBlockByHash', [blockOrHash, true]).then(convertBlock);
            if (!block) return;
        } else {
            block = convertBlock(blockOrHash);
        }

        // Trigger block listeners
        for (const listener of Object.values(this.blockSubscriptions)) {
            listener(block);
        }

        if (VERSION >= 2) return;

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
                        listener(address);
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
                        listener(stakerAddress);
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

    private async transactionLogListener(block: AppliedBlockLog | RevertedBlockLog) {
        if (block.type === 'reverted-block') {
            console.debug(`Reverting ${block.transactions.length} transactions`); // eslint-disable-line no-console

            for (const { hash } of block.transactions) {
                const tx = useTransactionsStore().state.transactions[hash];
                if (!tx) continue;
                useTransactionsStore().addTransactions([{
                    ...tx,
                    state: TransactionState.NEW,
                }]);
            }
            return;
        }

        const transactions = await Promise.all(block.transactions.map(
            ({ hash }) => this.rpc<AlbatrossTransaction>('getTransactionByHash', [hash])
                .then(convertTransaction),
        ));

        // Trigger transaction listeners
        for (const tx of transactions) {
            const plain = tx.toPlain();

            const listeners = new Set([
                ...(this.transactionSubscriptions[plain.sender] || []),
                ...(this.transactionSubscriptions[plain.recipient] || []),
            ]);

            for (const listener of listeners) {
                listener(tx);
            }
        }
    }

    private stakingLogListener(block: AppliedBlockLog | RevertedBlockLog) {
        for (const transaction of block.transactions) {
            for (const log of transaction.logs) {
                switch (log.type) {
                    case 'create-staker':
                    case 'stake':
                    case 'update-staker':
                    case 'unstake': {
                        const address = log.stakerAddress;
                        const listeners = this.stakingSubscriptions[address];
                        if (listeners) {
                            for (const listener of listeners) {
                                listener(address);
                            }
                        }
                        break;
                    }
                    default:
                        console.warn('Unhandled log:', log); // eslint-disable-line no-console
                }
            }
        }
    }

    private async rpc<T>(method: string, params: any[] = []): Promise<T> {
        const remote = await this.getRemote();
        return remote[method](params);
    }
}

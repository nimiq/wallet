import Vue from 'vue';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { init as initFastspotApi, getContract, SwapAsset } from '@nimiq/fastspot-api';
import Config from 'config';
import { createStore } from 'pinia';
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { isProxyData, getProxyAddress, handleProxyTransaction } from '../lib/ProxyDetection';
import { useProxyStore } from './Proxy';
import { useSwapsStore } from './Swaps';
import { getNetworkClient } from '../network';

export type Transaction = ReturnType<import('@nimiq/core-web').Client.TransactionDetails['toPlain']> & {
    fiatValue?: { [fiatCurrency: string]: number | typeof FIAT_PRICE_UNAVAILABLE | undefined },
    relatedTransactionHash?: string,
};

// Copied from Nimiq.Client.TransactionState so we don't have to import the Core library to use the enum as values.
export enum TransactionState {
    NEW = 'new',
    PENDING = 'pending',
    MINED = 'mined',
    INVALIDATED = 'invalidated',
    EXPIRED = 'expired',
    CONFIRMED = 'confirmed',
}

export const useTransactionsStore = createStore({
    id: 'transactions',
    state: () => ({
        transactions: {} as {[hash: string]: Transaction},
    }),
    getters: {
        // activeAccount: state => state.accounts[state.activeAccountId],
    },
    actions: {
        async addTransactions(txs: Transaction[]) {
            if (!txs.length) return;

            const knownTxs: Transaction[] = [...Object.values(this.state.transactions), ...txs]; // includes new txs
            const proxyTxs: Map<string, Transaction[]> = new Map(); // map proxy address -> transactions
            const newTxs: { [hash: string]: Transaction } = {};

            const isProxyTransaction = (tx: Transaction) => !!tx.relatedTransactionHash
                || isProxyData(tx.data.raw)
                // additional checks as proxy transactions are not guaranteed to hold the special proxy extra data
                || proxyTxs.has(tx.sender)
                || proxyTxs.has(tx.recipient);

            // Collect known proxies. Note that at least either the funding or redeeming proxy tx hold the proxy extra
            // data and that this transaction is known to us before the related tx because it's from or to one of our
            // addresses. Thus, it comes before the related transaction in the knownTxs array, such that the related
            // transaction is not missed in the loop, even if it does not hold the data.
            for (const knownTx of knownTxs) {
                if (!isProxyTransaction(knownTx)) continue;
                const proxyAddress = getProxyAddress(knownTx);
                let proxyTransactions = proxyTxs.get(proxyAddress);
                if (!proxyTransactions) {
                    proxyTransactions = [];
                    proxyTxs.set(proxyAddress, proxyTransactions);
                }
                proxyTransactions.push(knownTx);
            }

            // check for entirely new proxy transactions (that have not just updated their state)
            const newProxyTransactions = txs.filter((tx) => !this.state.transactions[tx.transactionHash]
                && isProxyTransaction(tx));
            // if we have new proxy transactions, we have to re-evaluate our related tx mappings for that proxy
            if (newProxyTransactions.length) {
                const transactionsToProcess: {[hash: string]: Transaction} = txs.reduce((res, tx) => {
                    res[tx.transactionHash] = tx;
                    return res;
                }, {} as {[hash: string]: Transaction});

                const updatedProxies = new Set(newProxyTransactions.map(getProxyAddress));
                for (const updatedProxyAddress of updatedProxies) {
                    const proxyTransactionsToUpdate = proxyTxs.get(updatedProxyAddress);
                    if (!proxyTransactionsToUpdate) continue;
                    for (const tx of proxyTransactionsToUpdate) {
                        delete tx.relatedTransactionHash;
                        // Add transactions to update for re-evaluation. Assign by transaction hash to avoid
                        // duplications. Note that the transaction order of txs is preserved and we generally try to
                        // preserve an ordering of recent transactions to older transactions.
                        if (transactionsToProcess[tx.transactionHash]) continue;
                        transactionsToProcess[tx.transactionHash] = tx;
                    }
                }

                txs = Object.values(transactionsToProcess);
            }

            for (const plain of txs) {
                // Detect proxies and observe them for tx-history and new incoming tx. Note that we iterate the
                // transactions from more recent to older, for correct LIFO assignment of funding proxy transactions.
                if (isProxyTransaction(plain)) {
                    const relatedTx = handleProxyTransaction(plain, proxyTxs);
                    if (relatedTx) {
                        // Need to re-assign the whole object in Vue 2 for change detection.
                        // TODO: Simply assign transactions in Vue 3.
                        newTxs[plain.transactionHash] = {
                            ...plain,
                            relatedTransactionHash: relatedTx.transactionHash,
                        };
                        newTxs[relatedTx.transactionHash] = {
                            ...relatedTx,
                            relatedTransactionHash: plain.transactionHash,
                        };
                        // Set relatedTransactionHash also on old tx objects for following iterations.
                        plain.relatedTransactionHash = relatedTx.transactionHash;
                        relatedTx.relatedTransactionHash = plain.transactionHash;
                    }
                }

                if (!useSwapsStore().state.swapByTransaction[plain.transactionHash]) {
                    // Detect swaps
                    // HTLC Creation
                    if ('hashRoot' in plain.data) {
                        const fundingData = plain.data as {
                            sender: string,
                            recipient: string,
                            hashAlgorithm: string,
                            hashRoot: string,
                            hashCount: number,
                            timeout: number,
                        };
                        useSwapsStore().addFundingData(fundingData.hashRoot, {
                            asset: SwapAsset.NIM,
                            transactionHash: plain.transactionHash,
                            htlc: {
                                address: plain.recipient,
                                refundAddress: fundingData.sender,
                                redeemAddress: fundingData.recipient,
                                timeoutBlockHeight: fundingData.timeout,
                            },
                        });
                    }
                    // HTLC Refunding
                    if ('creator' in plain.proof) {
                        // Find funding transaction
                        const selector = (tx: Transaction) => tx.recipient === plain.sender && 'hashRoot' in tx.data;

                        // First search known transactions
                        let fundingTx = knownTxs.find(selector);

                        // Then get funding tx from the blockchain
                        if (!fundingTx) {
                            const client = await getNetworkClient(); // eslint-disable-line no-await-in-loop
                            // eslint-disable-next-line no-await-in-loop
                            const chainTxs = await client.getTransactionsByAddress(plain.sender);
                            fundingTx = chainTxs.find(selector);
                        }

                        if (fundingTx) {
                            const fundingData = fundingTx.data as any as {
                                sender: string,
                                recipient: string,
                                hashAlgorithm: string,
                                hashRoot: string,
                                hashCount: number,
                                timeout: number,
                            };
                            useSwapsStore().addSettlementData(fundingData.hashRoot, {
                                asset: SwapAsset.NIM,
                                transactionHash: plain.transactionHash,
                            });
                        }
                    }
                    // HTLC Settlement
                    if ('hashRoot' in plain.proof) {
                        const settlementData = plain.proof as {
                            type: 'regular-transfer',
                            hashAlgorithm: string,
                            hashDepth: number,
                            hashRoot: string,
                            preImage: string,
                            signer: string,
                            signature: string,
                            publicKey: string,
                            pathLength: number,
                        };
                        useSwapsStore().addSettlementData(settlementData.hashRoot, {
                            asset: SwapAsset.NIM,
                            transactionHash: plain.transactionHash,
                        });

                        if (!useSwapsStore().state.swaps[settlementData.hashRoot].in) {
                            // Check this swap with the Fastspot API to detect if this was a EUR swap
                            initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);
                            getContract(SwapAsset.NIM, plain.sender).then((contractWithEstimate) => {
                                if (contractWithEstimate.from.asset === SwapAsset.EUR) {
                                    useSwapsStore().addFundingData(settlementData.hashRoot, {
                                        asset: SwapAsset.EUR,
                                        amount: contractWithEstimate.from.amount,
                                        // We cannot get bank info or EUR HTLC details from this.
                                    });
                                }
                            }).catch(() => undefined);
                        }
                    }
                }

                if (!newTxs[plain.transactionHash]) {
                    newTxs[plain.transactionHash] = plain;
                }
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            this.calculateFiatAmounts();

            if (newProxyTransactions.length) {
                useProxyStore().triggerNetwork();
            }
        },

        async calculateFiatAmounts() {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatCurrency = useFiatStore().currency.value;
            const transactionsToUpdate = Object.values(this.state.transactions).filter((tx) =>
                !!tx.timestamp && (!tx.fiatValue || !(fiatCurrency in tx.fiatValue)),
            ) as Array<Transaction & { timestamp: number }>;

            if (!transactionsToUpdate.length) return;

            const timestamps = transactionsToUpdate.map((tx) => tx.timestamp * 1000);
            const historicExchangeRates = await getHistoricExchangeRates(CryptoCurrency.NIM, fiatCurrency, timestamps);

            for (const tx of transactionsToUpdate) {
                const exchangeRate = historicExchangeRates.get(tx.timestamp * 1000);
                // Set via Vue.set to let vue setup the reactivity. TODO this might be not necessary anymore with Vue3
                if (!tx.fiatValue) Vue.set(tx, 'fiatValue', {});
                Vue.set(tx.fiatValue!, fiatCurrency, exchangeRate !== undefined
                    ? (exchangeRate * tx.value) / 1e5
                    : FIAT_PRICE_UNAVAILABLE,
                );
            }
        },

        removeTransactions(txs: Transaction[]) {
            const transactions = { ...this.state.transactions };
            for (const tx of txs) {
                delete transactions[tx.transactionHash];
            }
            this.state.transactions = transactions;
        },
    },
});

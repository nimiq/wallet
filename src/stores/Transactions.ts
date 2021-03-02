import Vue from 'vue';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { getContract, SwapAsset } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FiatCurrency, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { detectProxyTransactions, cleanupKnownProxyTransactions } from '../lib/ProxyDetection';
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

            const newTxs: { [hash: string]: Transaction } = {};

            // re-apply known fiatValue and relatedTransactionHash
            for (const tx of txs) {
                const knownTx = this.state.transactions[tx.transactionHash];
                if (!knownTx) continue;
                if (!tx.relatedTransactionHash && knownTx.relatedTransactionHash) {
                    tx.relatedTransactionHash = knownTx.relatedTransactionHash;
                }
                if (!tx.fiatValue && knownTx.fiatValue) {
                    tx.fiatValue = knownTx.fiatValue;
                }
            }

            // Detect proxies and observe them for tx-history and new incoming txs.
            detectProxyTransactions(txs, this.state.transactions);

            for (const plain of txs) {
                newTxs[plain.transactionHash] = Object.assign(
                    this.state.transactions[plain.transactionHash] || plain,
                    plain,
                );

                // Detect swaps
                if (!useSwapsStore().state.swapByTransaction[plain.transactionHash]) {
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

                        if (!useSwapsStore().state.swaps[fundingData.hashRoot].out) {
                            // Check this swap with the Fastspot API to detect if this was a EUR swap
                            getContract(SwapAsset.NIM, plain.recipient).then((contractWithEstimate) => {
                                if (contractWithEstimate.to.asset === SwapAsset.EUR) {
                                    useSwapsStore().addSettlementData(fundingData.hashRoot, {
                                        asset: SwapAsset.EUR,
                                        amount: contractWithEstimate.to.amount,
                                        // We cannot get bank info or EUR HTLC details from this.
                                    });
                                }
                            }).catch(() => undefined);
                        }
                    }
                    // HTLC Refunding
                    if ('creator' in plain.proof) {
                        // Find funding transaction
                        const selector = (tx: Transaction) => tx.recipient === plain.sender && 'hashRoot' in tx.data;

                        // First search known transactions
                        let fundingTx = [...Object.values(this.state.transactions), ...txs].find(selector);

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
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            this.calculateFiatAmounts();
        },

        setRelatedTransaction(transaction: Transaction, relatedTransaction: Transaction | null) {
            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transactions in Vue 3.
            if (relatedTransaction === null) {
                delete transaction.relatedTransactionHash;
                this.state.transactions[transaction.transactionHash] = { ...transaction };
                return;
            }
            transaction.relatedTransactionHash = relatedTransaction.transactionHash;
            relatedTransaction.relatedTransactionHash = transaction.transactionHash;
            this.state.transactions[transaction.transactionHash] = { ...transaction };
            this.state.transactions[relatedTransaction.transactionHash] = { ...relatedTransaction };
        },

        async calculateFiatAmounts(fiat?: FiatCurrency) {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatCurrency = fiat || useFiatStore().currency.value;
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
            cleanupKnownProxyTransactions(txs);
            // TODO cleanup swap store
            this.state.transactions = transactions;
        },
    },
});

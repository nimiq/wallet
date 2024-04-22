import Vue from 'vue';
import { getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { getContract, SwapAsset } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import Config from 'config';
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { detectProxyTransactions, cleanupKnownProxyTransactions } from '../lib/ProxyDetection';
import { useSwapsStore } from './Swaps';
import { getNetworkClient } from '../network';
import { getEurPerCrypto, getFiatFees } from '../lib/swap/utils/Functions';
import { AddressInfo, useAddressStore } from './Address';

export type Transaction = ReturnType<Nimiq.Client.TransactionDetails['toPlain']> & {
    fiatValue?: Partial<Record<FiatCurrency, number | typeof FIAT_PRICE_UNAVAILABLE>>,
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

const scheduledHistoricFiatAmountUpdates: Partial<Record<FiatCurrency, Set<string>>> = {};

export const useTransactionsStore = createStore({
    id: 'transactions',
    state: () => ({
        transactions: {} as {[hash: string]: Transaction},
    }),
    getters: {
        // activeAccount: state => state.accounts[state.activeAccountId],
        pendingTransactionsBySender: (state) => {
            const pendingTxs = Object.values(state.transactions).filter((tx) => tx.state === 'pending');
            const txsBySender: {[address: string]: Transaction[] | undefined} = {};
            for (const tx of pendingTxs) {
                const array = txsBySender[tx.sender] || [];
                array.push(tx);
                txsBySender[tx.sender] = array;
            }
            return txsBySender;
        },
    },
    actions: {
        // Note: this method should not be async to avoid race conditions between parallel calls. Otherwise an older
        // transaction can overwrite its updated version.
        addTransactions(txs: Transaction[]) {
            if (!txs.length) return;

            // re-apply original timestamp and known fiatValue and relatedTransactionHash
            for (const tx of txs) {
                const knownTx = this.state.transactions[tx.transactionHash];
                if (!knownTx) continue;
                if (knownTx.timestamp) {
                    // Keep original timestamp and blockHeight instead of values at confirmation after 10 blocks.
                    tx.timestamp = knownTx.timestamp;
                    tx.blockHeight = knownTx.blockHeight;
                }
                if (!tx.relatedTransactionHash && knownTx.relatedTransactionHash) {
                    tx.relatedTransactionHash = knownTx.relatedTransactionHash;
                }
                if (!tx.fiatValue && knownTx.fiatValue) {
                    tx.fiatValue = knownTx.fiatValue;
                }
            }

            // Detect proxies and observe them for tx-history and new incoming txs.
            detectProxyTransactions(txs, this.state.transactions);

            const allKnownTransactions = [...Object.values(this.state.transactions), ...txs]; // overlaps are no problem
            for (const plain of txs) {
                // Async sub call to keep the main method synchronous to avoid race conditions with other places where
                // transactions are being overwritten like in calculateFiatAmounts, and to avoid await in loop (slow
                // sequential processing).
                detectSwap(plain, allKnownTransactions);

                // Prevent received tx from displaying as "not sent"
                if (plain.state === TransactionState.NEW) {
                    const addressStore = useAddressStore();
                    const ourSender = addressStore.state.addressInfos[plain.sender] as AddressInfo | undefined;
                    const ourRecipient = addressStore.state.addressInfos[plain.recipient] as AddressInfo | undefined;

                    if (!ourSender && ourRecipient) {
                        plain.state = TransactionState.PENDING;
                    }
                }
            }

            const newTxs = txs.reduce((newOrUpdatedTxs, tx) => {
                newOrUpdatedTxs[tx.transactionHash] = Object.assign(
                    // Get the newest transaction from the store in case it was updated via setRelatedTransaction
                    this.state.transactions[tx.transactionHash] || tx,
                    tx,
                );
                return newOrUpdatedTxs;
            }, {} as { [hash: string]: Transaction });
            // Need to re-assign the whole object in Vue 2 for change detection of new transactions.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            const { promoBoxVisible, setPromoBoxVisible } = useSwapsStore();
            if (promoBoxVisible.value) {
                setPromoBoxVisible(false);
            }

            // Run async operation in background
            this.calculateFiatAmounts(Object.values(newTxs));
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

        async calculateFiatAmounts(transactions?: Transaction[], fiatCurrency?: FiatCurrency) {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatStore = useFiatStore();
            fiatCurrency = fiatCurrency || fiatStore.currency.value;
            const historyFiatCurrency = isHistorySupportedFiatCurrency(fiatCurrency, FIAT_API_PROVIDER_TX_HISTORY)
                ? fiatCurrency
                : FiatCurrency.USD;
            const lastExchangeRateUpdateTime = fiatStore.timestamp.value;
            const currentRate = fiatStore.exchangeRates.value[CryptoCurrency.NIM]?.[fiatCurrency]; // might be pending
            const currentUsdRate = fiatStore.exchangeRates.value[CryptoCurrency.NIM]?.[FiatCurrency.USD];
            const transactionsToUpdate = (transactions || Object.values(this.state.transactions)).filter((tx) =>
                // Only update the fiat amount if it's neither set for the actual fiatCurrency nor historyFiatCurrency.
                // Generally, the amount for the actually requested fiatCurrency is preferred, so if that is already set
                // there is no need to fetch for the historyFiatCurrency. On the other hand, if historyFiatCurrency is
                // different to fiatCurrency, no historic amounts for fiatCurrency can be determined, thus only for new
                // transactions, and if an amount for historyFiatCurrency is already set, it's not a new transaction.
                typeof tx.fiatValue?.[fiatCurrency!] !== 'number'
                    && typeof tx.fiatValue?.[historyFiatCurrency] !== 'number'
                    && !scheduledHistoricFiatAmountUpdates[historyFiatCurrency]?.has(tx.transactionHash)
                    // NIM price is only available starting 2018-07-28T00:00:00Z, and this timestamp
                    // check prevents us from re-querying older transactions again and again.
                    && tx.timestamp && tx.timestamp >= 1532736000,
            ) as Array<Transaction & { timestamp: number }>;

            if (!transactionsToUpdate.length) return;

            scheduledHistoricFiatAmountUpdates[historyFiatCurrency] ||= new Set();
            const historicTransactions: typeof transactionsToUpdate = [];
            const { swapByTransaction } = useSwapsStore().state;

            for (const tx of transactionsToUpdate) {
                tx.fiatValue ||= {};

                // For very recent transactions use current exchange rate without unnecessarily querying historic rates,
                // which also don't get updated minutely and might not include the newest rates yet. If the user time is
                // not set correctly, this will gracefully fall back to fetching rates for new transactions as historic
                // exchange rates; old transactions at the user's system's time might be interpreted as current though.
                const isNewTransaction = Math.abs(tx.timestamp * 1000 - lastExchangeRateUpdateTime) < 2.5 * 60 * 1000;
                if (isNewTransaction && currentRate) {
                    // Set via Vue.set to let vue handle reactivity.
                    // TODO this might be not necessary anymore with Vue3, also for the other Vue.sets in this file.
                    Vue.set(tx.fiatValue, fiatCurrency, currentRate * (tx.value / 1e5));
                } else {
                    historicTransactions.push(tx);
                    scheduledHistoricFiatAmountUpdates[historyFiatCurrency]!.add(tx.transactionHash);
                }
                // For the calculation of swap limits, USD amounts of swap transactions are required. If we have the USD
                // rate already available without having to fetch it, because it's a new transaction, store it.
                if (isNewTransaction && currentUsdRate && swapByTransaction[tx.transactionHash]) {
                    Vue.set(tx.fiatValue, FiatCurrency.USD, currentUsdRate * (tx.value / 1e5));
                }
            }

            if (historicTransactions.length) {
                const historicExchangeRates = await getHistoricExchangeRates(
                    CryptoCurrency.NIM,
                    historyFiatCurrency,
                    historicTransactions.map((tx) => tx.timestamp * 1000),
                    FIAT_API_PROVIDER_TX_HISTORY,
                );

                for (let tx of historicTransactions) {
                    const exchangeRate = historicExchangeRates.get(tx.timestamp * 1000);
                    // Get the newest transaction from the store in case it was updated via setRelatedTransaction.
                    tx = this.state.transactions[tx.transactionHash] as typeof tx || tx;
                    Vue.set(tx.fiatValue!, historyFiatCurrency, exchangeRate !== undefined
                        ? exchangeRate * (tx.value / 1e5)
                        : FIAT_PRICE_UNAVAILABLE,
                    );

                    scheduledHistoricFiatAmountUpdates[historyFiatCurrency]!.delete(tx.transactionHash);
                }
            }

            // Manually notify the store of the deep changes to trigger subscriptions.
            // TODO this hack is likely not necessary in newer pinia versions.
            this.patch({});
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

// Note: this method should not modify the transaction itself or the transaction store, to avoid race conditions with
// other methods that do so.
async function detectSwap(transaction: Transaction, knownTransactions: Transaction[]) {
    const { state: swaps$, addFundingData, addSettlementData } = useSwapsStore();
    if (swaps$.swapByTransaction[transaction.transactionHash]) return; // already known

    // HTLC Creation
    if ('hashRoot' in transaction.data) {
        const fundingData = transaction.data as {
            sender: string,
            recipient: string,
            hashAlgorithm: string,
            hashRoot: string,
            hashCount: number,
            timeout: number,
            raw: string,
        };
        addFundingData(fundingData.hashRoot, {
            asset: SwapAsset.NIM,
            transactionHash: transaction.transactionHash,
            htlc: {
                address: transaction.recipient,
                refundAddress: fundingData.sender,
                redeemAddress: fundingData.recipient,
                timeoutBlockHeight: fundingData.timeout,
            },
        });

        if (!swaps$.swaps[fundingData.hashRoot].out) {
            // Check this swap with the Fastspot API to detect if this was a EUR swap
            const contractWithEstimate = await getContract(SwapAsset.NIM, transaction.recipient).catch(() => undefined);
            if (contractWithEstimate?.to.asset === SwapAsset.EUR) {
                const exchangeRate = {
                    [CryptoCurrency.NIM]: {
                        [FiatCurrency.EUR]: getEurPerCrypto(SwapAsset.NIM, contractWithEstimate),
                    },
                };
                const fiatFees = getFiatFees(
                    contractWithEstimate,
                    CryptoCurrency.NIM,
                    exchangeRate,
                    FiatCurrency.EUR,
                    null,
                );

                addSettlementData(fundingData.hashRoot, {
                    asset: SwapAsset.EUR,
                    amount: contractWithEstimate.to.amount,
                    // We cannot get bank info or EUR HTLC details from this.
                }, {
                    fees: {
                        totalFee: fiatFees.funding.total,
                        asset: SwapAsset.EUR,
                    },
                });
            }
        }
    }

    // HTLC Refunding
    if ('creator' in transaction.proof
        && !(
            'signer' in transaction.proof
            && Config.nimiqPay.cosignerPublicKeys.includes(transaction.proof.publicKey!)
        )
    ) {
        // Find funding transaction
        const selector = (tx: Transaction) => tx.recipient === transaction.sender && 'hashRoot' in tx.data;

        // First search known transactions
        let fundingTx = knownTransactions.find(selector);

        // Then get funding tx from the blockchain
        if (!fundingTx) {
            const client = await getNetworkClient();
            const chainTxs = await client.getTransactionsByAddress(transaction.sender);
            fundingTx = chainTxs.map((tx) => tx.toPlain()).find(selector);
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
            addSettlementData(fundingData.hashRoot, {
                asset: SwapAsset.NIM,
                transactionHash: transaction.transactionHash,
            });
        }
    }

    // HTLC Settlement
    if ('hashRoot' in transaction.proof) {
        const settlementData = transaction.proof as {
            type: 'regular-transfer',
            hashAlgorithm: string,
            hashDepth: number,
            hashRoot: string,
            preImage: string,
            signer: string,
            signature: string,
            publicKey: string,
            pathLength: number,
            raw: string,
        };
        addSettlementData(settlementData.hashRoot, {
            asset: SwapAsset.NIM,
            transactionHash: transaction.transactionHash,
        });

        if (!swaps$.swaps[settlementData.hashRoot].in) {
            // Check this swap with the Fastspot API to detect if this was a EUR swap
            const contractWithEstimate = await getContract(SwapAsset.NIM, transaction.sender).catch(() => undefined);
            if (contractWithEstimate?.from.asset === SwapAsset.EUR) {
                const exchangeRate = {
                    [CryptoCurrency.NIM]: {
                        [FiatCurrency.EUR]: getEurPerCrypto(SwapAsset.NIM, contractWithEstimate),
                    },
                };
                const fiatFees = getFiatFees(
                    contractWithEstimate,
                    CryptoCurrency.NIM,
                    exchangeRate,
                    FiatCurrency.EUR,
                    null,
                );

                addFundingData(settlementData.hashRoot, {
                    asset: SwapAsset.EUR,
                    amount: contractWithEstimate.from.amount,
                    // We cannot get bank info or EUR HTLC details from this.
                }, {
                    fees: {
                        totalFee: fiatFees.settlement.total,
                        asset: SwapAsset.EUR,
                    },
                });
            }
        }
    }
}

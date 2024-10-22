import Vue from 'vue';
import { getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
// import { SwapAsset } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { useSwapsStore } from './Swaps';
// import { getPolygonClient } from '../ethers';

type HtlcOpenEvent = {
    name: 'Open',
    id: string,
    token: string,
    amount: number,
    recipient: string,
    hash: string,
    timeout: number,
};

type HtlcRedeemEvent = {
    name: 'Redeem',
    id: string,
    secret: string,
};

type HtlcRefundEvent = {
    name: 'Refund',
    id: string,
};

export type HtlcEvent = HtlcOpenEvent | HtlcRedeemEvent | HtlcRefundEvent;

/**
 * These events are created from the viewpoint of bridged USDT, to be able to include the
 * (bridged USDT) fee in the resulting Transaction object.
 */
export type UniswapEvent = {
    name: 'Swap',
    amountIn: number,
    amountOut: number,
}

// This is a simplified transaction, only storing the token transfer.
// It is NOT a full Ethereum/Polygon transaction.
// Might be better named `UsdtTokenTransfer`...
export type Transaction = {
    token?: string,
    transactionHash: string,
    logIndex: number,
    sender: string,
    recipient: string,
    value: number,
    fee?: number,
    event?: HtlcEvent | UniswapEvent,
    state: TransactionState,
    blockHeight?: number,
    timestamp?: number,
} & {
    fiatValue?: Partial<Record<FiatCurrency, number | typeof FIAT_PRICE_UNAVAILABLE>>,
};

export enum TransactionState {
    NEW = 'new',
    PENDING = 'pending',
    MINED = 'mined',
    FAILED = 'failed',
    EXPIRED = 'expired',
    CONFIRMED = 'confirmed',
}

const scheduledHistoricFiatAmountUpdates: Partial<Record<FiatCurrency, Set<string>>> = {};

export const useUsdtTransactionsStore = createStore({
    id: 'usdtTransactions',
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

            // re-apply original timestamp and known fiatValue
            for (const tx of txs) {
                const knownTx = this.state.transactions[tx.transactionHash];
                if (!knownTx) continue;
                if (knownTx.timestamp) {
                    // Keep original timestamp and blockHeight instead of values at confirmation after 10 blocks.
                    tx.timestamp = knownTx.timestamp;
                    tx.blockHeight = knownTx.blockHeight;
                }
                if (!tx.fiatValue && knownTx.fiatValue) {
                    tx.fiatValue = knownTx.fiatValue;
                }
            }

            const newTxs: { [hash: string]: Transaction } = {};
            const allKnownTransactions = [...Object.values(this.state.transactions), ...txs]; // overlaps are no problem
            for (const tx of txs) {
                // Async sub call to keep the main method synchronous to avoid race conditions with other places where
                // transactions are being overwritten like in calculateFiatAmounts, and to avoid await in loop (slow
                // sequential processing).
                detectSwap(tx, allKnownTransactions);
                newTxs[tx.transactionHash] = tx;
            }

            // Need to re-assign the whole object in Vue 2 for change detection of new transactions.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            // const { promoBoxVisible, setPromoBoxVisible } = useSwapsStore();
            // if (promoBoxVisible.value) {
            //     setPromoBoxVisible(false);
            // }

            // Run async operation in background
            this.calculateFiatAmounts(Object.values(newTxs));
        },

        async calculateFiatAmounts(transactions?: Transaction[], fiatCurrency?: FiatCurrency) {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatStore = useFiatStore();
            fiatCurrency = fiatCurrency || fiatStore.currency.value;
            const historyFiatCurrency = isHistorySupportedFiatCurrency(fiatCurrency, FIAT_API_PROVIDER_TX_HISTORY)
                ? fiatCurrency
                : FiatCurrency.USD;
            const lastExchangeRateUpdateTime = fiatStore.timestamp.value;
            const currentRate = fiatStore.exchangeRates.value[CryptoCurrency.USDT]?.[fiatCurrency]; // might be pending
            const currentUsdRate = fiatStore.exchangeRates.value[CryptoCurrency.USDT]?.[FiatCurrency.USD];
            const transactionsToUpdate = (transactions || Object.values(this.state.transactions)).filter((tx) =>
                // Only update the fiat amount if it's neither set for the actual fiatCurrency nor historyFiatCurrency.
                // Generally, the amount for the actually requested fiatCurrency is preferred, so if that is already set
                // there is no need to fetch for the historyFiatCurrency. On the other hand, if historyFiatCurrency is
                // different to fiatCurrency, no historic amounts for fiatCurrency can be determined, thus only for new
                // transactions, and if an amount for historyFiatCurrency is already set, it's not a new transaction.
                typeof tx.fiatValue?.[fiatCurrency!] !== 'number'
                    && typeof tx.fiatValue?.[historyFiatCurrency] !== 'number'
                    && !scheduledHistoricFiatAmountUpdates[historyFiatCurrency]?.has(tx.transactionHash)
                    // USDT price is only available starting 2015-03-06T00:00:00Z, and this timestamp
                    // check prevents us from re-querying older transactions again and again.
                    && tx.timestamp && tx.timestamp >= 1425600000,
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
                    Vue.set(tx.fiatValue, fiatCurrency, currentRate * (tx.value / 1e6));
                } else {
                    historicTransactions.push(tx);
                    scheduledHistoricFiatAmountUpdates[historyFiatCurrency]!.add(tx.transactionHash);
                }
                // For the calculation of swap limits, USD amounts of swap transactions are required. If we have the USD
                // rate already available without having to fetch it, because it's a new transaction, store it.
                if (isNewTransaction && currentUsdRate && swapByTransaction[tx.transactionHash]) {
                    Vue.set(tx.fiatValue, FiatCurrency.USD, currentUsdRate * (tx.value / 1e6));
                }
            }

            if (historicTransactions.length) {
                const historicExchangeRates = await getHistoricExchangeRates(
                    CryptoCurrency.USDT,
                    historyFiatCurrency,
                    historicTransactions.map((tx) => tx.timestamp * 1000),
                    FIAT_API_PROVIDER_TX_HISTORY,
                );

                for (let tx of historicTransactions) {
                    const exchangeRate = historicExchangeRates.get(tx.timestamp * 1000);
                    // Get the newest transaction object from the store in case it changed (which for the USDT
                    // transaction store it doesn't do, but doesn't hurt to make the code more resilient).
                    tx = this.state.transactions[tx.transactionHash] as typeof tx || tx;
                    Vue.set(tx.fiatValue!, historyFiatCurrency, exchangeRate !== undefined
                        ? exchangeRate * (tx.value / 1e6)
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
            // TODO cleanup swap store
            this.state.transactions = transactions;
        },
    },
});

// Note: this method should not modify the transaction itself or the transaction store, to avoid race conditions with
// other methods that do so.
async function detectSwap(transaction: Transaction, knownTransactions: Transaction[]) {
    // const { state: swaps$, addFundingData, addSettlementData, detectSwapFiatCounterpart } = useSwapsStore();
    // if (swaps$.swapByTransaction[transaction.transactionHash]) return; // already known
    // const asset = SwapAsset.USDT;

    // // HTLC Creation
    // if (transaction.event?.name === 'Open') {
    //     const hashRoot = transaction.event.hash.substring(2);
    //     addFundingData(hashRoot, {
    //         asset,
    //         transactionHash: transaction.transactionHash,
    //         htlc: {
    //             address: transaction.event.id,
    //             refundAddress: transaction.sender,
    //             redeemAddress: transaction.event.recipient,
    //             timeoutTimestamp: transaction.event.timeout,
    //         },
    //     });

    //     await detectSwapFiatCounterpart(transaction.event.id.substring(2), hashRoot, 'settlement', asset);
    // }

    // // HTLC Refunding
    // if (transaction.event?.name === 'Refund') {
    //     const swapId = transaction.event.id;
    //     // Find funding transaction
    //     const selector = (testedTx: Transaction) =>
    //         testedTx.event?.name === 'Open' && testedTx.event.id === swapId;

    //     // First search known transactions
    //     const fundingTx = knownTransactions.find(selector);

    //     // Then get funding transaction from the blockchain
    //     if (!fundingTx) {
    //         // TODO: Find Open event for transaction.event!.id
    //         // const client = await getPolygonClient();
    //         // const chainTxs = await client.getTransactionsByAddress(transaction.sender);
    //         // fundingTx = chainTxs.map((transaction) => transaction.toPlain()).find(selector);
    //     }

    //     if (fundingTx) {
    //         const hashRoot = (fundingTx.event as HtlcOpenEvent).hash.substring(2);
    //         addSettlementData(hashRoot, {
    //             asset,
    //             transactionHash: transaction.transactionHash,
    //         });
    //     }
    // }

    // // HTLC Settlement
    // if (transaction.event?.name === 'Redeem') {
    //     const secret = transaction.event.secret.substring(2);
    //     const hashRoot = Nimiq.Hash.sha256(Nimiq.BufferUtils.fromHex(secret)).toHex();
    //     addSettlementData(hashRoot, {
    //         asset,
    //         transactionHash: transaction.transactionHash,
    //     });

    //     await detectSwapFiatCounterpart(transaction.event.id.substring(2), hashRoot, 'funding', asset);
    // }
}

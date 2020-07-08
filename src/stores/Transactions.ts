/* eslint-disable import/no-cycle */

import Vue from 'vue';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { createStore } from 'pinia';
import { useFiatStore } from './Fiat'; // eslint-disable-line import/no-cycle
import { CryptoCurrency, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import {
    isCashlinkData,
    handleCashlinkTransaction,
} from '../lib/CashlinkDetection';
import { useCashlinkStore } from './Cashlink';

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
        transactions: {} as {[id: string]: Transaction},
    }),
    getters: {
        // activeAccount: state => state.accounts[state.activeAccountId],
    },
    actions: {
        addTransactions(txs: Transaction[]) {
            if (!txs.length) return;

            let foundCashlinks = false;
            const newTxs: { [hash: string]: Transaction } = {};
            for (const plain of txs) {
                // Detect cashlinks and observe them for tx-history and new incoming tx
                if (isCashlinkData(plain.data.raw)) {
                    foundCashlinks = true;
                    const cashlinkTxs = handleCashlinkTransaction(plain, Object.values({
                        ...this.state.transactions,
                        // Need to pass processed transactions from this batch in as well,
                        // as two related txs can be added in the same batch, and the store
                        // is only updated after this loop.
                        ...newTxs,
                    }));
                    for (const tx of cashlinkTxs) {
                        newTxs[tx.transactionHash] = tx;
                    }
                    continue;
                }

                newTxs[plain.transactionHash] = plain;
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            this.calculateFiatAmounts();

            if (foundCashlinks) {
                const cashlinkStore = useCashlinkStore();
                cashlinkStore.triggerNetwork();
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
                    ? (exchangeRate * tx.value) / 1e5 // TODO adapt for BTC
                    : FIAT_PRICE_UNAVAILABLE);
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

import Vue from 'vue';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { createStore } from 'pinia'
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FiatCurrency, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';

export type Transaction = ReturnType<import('@nimiq/core-web').Client.TransactionDetails["toPlain"]> & {
    fiatValue?: { [fiatCurrency: string]: number | typeof FIAT_PRICE_UNAVAILABLE | undefined },
};

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
            const newTxs: { [hash: string]: Transaction } = {}
            for (const plain of txs) {
                newTxs[plain.transactionHash] = plain
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transaction in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            }

            this.calculateFiatAmounts();
        },

        async calculateFiatAmounts() {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatCurrency = useFiatStore().state.currency;
            const transactionsToUpdate = Object.values(this.state.transactions).filter((tx) =>
                !!tx.timestamp && (!tx.fiatValue || !(fiatCurrency in tx.fiatValue)),
            );
            if (transactionsToUpdate.length === 0) return;
            const timestamps = transactionsToUpdate.map((tx) => tx.timestamp! * 1000);
            const historicExchangeRates = await getHistoricExchangeRates(CryptoCurrency.NIM, fiatCurrency, timestamps);

            for (const tx of transactionsToUpdate) {
                const exchangeRate = historicExchangeRates.get(tx.timestamp! * 1000);
                // Set via Vue.set to let vue setup the reactivity. TODO this might be not necessary anymore with Vue3
                if (!tx.fiatValue) Vue.set(tx, 'fiatValue', {});
                Vue.set(tx.fiatValue!, fiatCurrency, exchangeRate !== undefined
                    ? Math.round(exchangeRate * tx.value) / 1e5 // rounded to 5 decimals
                    : FIAT_PRICE_UNAVAILABLE,
                );
            }
        },
    },
})

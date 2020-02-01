import { createStore } from 'pinia'

export type Transaction = ReturnType<import('@nimiq/core-web').Client.TransactionDetails["toPlain"]>

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
            const newTxs: {[hash: string]: Transaction} = {}
            for (const plain of txs) {
                newTxs[plain.transactionHash] = plain
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transaction in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            }
        },
    },
})

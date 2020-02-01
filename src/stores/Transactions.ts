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
    actions: {},
})

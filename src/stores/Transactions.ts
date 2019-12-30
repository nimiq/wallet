import { createStore } from 'pinia'

export type Transaction = ReturnType<Nimiq.Client.TransactionDetails["toPlain"]>

export const useTransactionsStore = createStore(
    // name of the store
    // it is used in devtools and allows restoring state
    'transactions',
    // a function that returns a fresh state
    () => ({
        transactions: {} as {[id: string]: Transaction},
    }),
    // optional getters
    {
        // activeAccount: state => state.accounts[state.activeAccountId],
    }
)

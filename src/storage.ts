import { useTransactionsStore, Transaction } from './stores/Transactions'
import { useAccountsStore, Account} from './stores/Accounts'

const TRANSACTIONS_STORAGE_KEY = 'safe-next_transactions'
const ACCOUNTS_STORAGE_KEY = 'safe-next_accounts'

export function initStorage() {
    /**
     * TRANSACTIONS
     */
    const transactionsStore = useTransactionsStore()

    // Load transactions from storage
    const storedTxs = localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
    if (storedTxs) {
        const txs: Transaction[] = JSON.parse(storedTxs)
        transactionsStore.patch({
            // @ts-ignore Some weird error about a type missmatch
            transactions: txs,
        })
    }

    // Write transactions to storage when updated
    transactionsStore.subscribe(() => {
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactionsStore.state.transactions))
    })


    /**
     * ACCOUNTS
     */
    const accountsStore = useAccountsStore()

    // Load accounts from storage
    const storedAccountsState = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (storedAccountsState) {
        const accountsState: Account[] = JSON.parse(storedAccountsState)
        // @ts-ignore Some weird error about a type missmatch
        accountsStore.patch(accountsState)
    }

    // Write accounts to storage when updated
    accountsStore.subscribe(() => {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accountsStore.state))
    })
}

import { useTransactionsStore, Transaction } from './stores/Transactions'
import { useAddressStore, AddressState } from './stores/Address'
import { useAccountStore, AccountState } from './stores/Account'
import { useSettingsStore, SettingsState } from './stores/Settings';

const TRANSACTIONS_STORAGE_KEY = 'safe-next_transactions'
const ACCOUNTINFOS_STORAGE_KEY = 'safe-next_accounts'
const ADDRESSINFOS_STORAGE_KEY = 'safe-next_addresses'
const SETTINGS_STORAGE_KEY = 'safe-next_settings'

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
    const accountStore = useAccountStore()

    // Load accounts from storage
    const storedAccountState = localStorage.getItem(ACCOUNTINFOS_STORAGE_KEY)
    if (storedAccountState) {
        const accountState: AccountState = JSON.parse(storedAccountState)
        accountStore.patch(accountState)
    }

    // Write accounts to storage when updated
    accountStore.subscribe(() => {
        localStorage.setItem(ACCOUNTINFOS_STORAGE_KEY, JSON.stringify(accountStore.state))
    })


    /**
     * ADDRESSES
     */
    const addressStore = useAddressStore()

    // Load addresses from storage
    const storedAddressState = localStorage.getItem(ADDRESSINFOS_STORAGE_KEY)
    if (storedAddressState) {
        const addressState: AddressState = JSON.parse(storedAddressState)
        addressStore.patch(addressState)
    }

    // Write addresses to storage when updated
    addressStore.subscribe(() => {
        localStorage.setItem(ADDRESSINFOS_STORAGE_KEY, JSON.stringify(addressStore.state))
    })

    /**
     * SETTINGS
     */
    const settingsStore = useSettingsStore();
    // Load user settings from storage
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
        const settingsState: SettingsState = JSON.parse(storedSettings);
        settingsStore.patch(settingsState);
    }
    settingsStore.subscribe(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsStore.state))
    })

}

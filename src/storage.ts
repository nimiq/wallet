import { useTransactionsStore, Transaction } from './stores/Transactions';
import { useAddressStore, AddressState } from './stores/Address';
import { useAccountStore, AccountState } from './stores/Account';
import { useSettingsStore, SettingsState } from './stores/Settings';
import { useContactsStore, ContactsState } from './stores/Contacts';
import { useFiatStore, FiatState } from './stores/Fiat';
import { useCashlinkStore, CashlinkState } from './stores/Cashlink';

const StorageKeys = {
    TRANSACTIONS: 'wallet_transactions_v01',
    ACCOUNTINFOS: 'wallet_accounts_v01',
    ADDRESSINFOS: 'wallet_addresses_v01',
    SETTINGS: 'wallet_settings_v01',
    FIAT: 'wallet_exchange-rates_v01',
    CASHLINKS: 'wallet_cashlinks_v01',
};

const PersistentStorageKeys = {
    CONTACTS: 'wallet_contacts_v01',
};

const unsubscriptions: (() => void)[] = [];

export function initStorage() {
    /**
     * TRANSACTIONS
     */
    const transactionsStore = useTransactionsStore();

    // Load transactions from storage
    const storedTxs = localStorage.getItem(StorageKeys.TRANSACTIONS);
    if (storedTxs) {
        const txs: Transaction[] = JSON.parse(storedTxs);
        transactionsStore.patch({
            // @ts-ignore Some weird error about a type missmatch
            transactions: txs,
        });
        transactionsStore.calculateFiatAmounts();
    }

    unsubscriptions.push(
        // Write transactions to storage when updated
        transactionsStore.subscribe(() => {
            localStorage.setItem(StorageKeys.TRANSACTIONS, JSON.stringify(transactionsStore.state.transactions));
        }),
    );

    /**
     * ACCOUNTS
     */
    const accountStore = useAccountStore();

    // Load accounts from storage
    const storedAccountState = localStorage.getItem(StorageKeys.ACCOUNTINFOS);
    if (storedAccountState) {
        const accountState: AccountState = JSON.parse(storedAccountState);
        accountStore.patch(accountState);
    }

    unsubscriptions.push(
        // Write accounts to storage when updated
        accountStore.subscribe(() => {
            localStorage.setItem(StorageKeys.ACCOUNTINFOS, JSON.stringify(accountStore.state));
        }),
    );

    /**
     * ADDRESSES
     */
    const addressStore = useAddressStore();

    // Load addresses from storage
    const storedAddressState = localStorage.getItem(StorageKeys.ADDRESSINFOS);
    if (storedAddressState) {
        const addressState: AddressState = JSON.parse(storedAddressState);
        addressStore.patch(addressState);
    }

    unsubscriptions.push(
        // Write addresses to storage when updated
        addressStore.subscribe(() => {
            localStorage.setItem(StorageKeys.ADDRESSINFOS, JSON.stringify(addressStore.state));
        }),
    );

    /**
     * SETTINGS
     */
    const settingsStore = useSettingsStore();
    // Load user settings from storage
    const storedSettings = localStorage.getItem(StorageKeys.SETTINGS);
    if (storedSettings) {
        const settingsState: SettingsState = JSON.parse(storedSettings);
        settingsStore.patch(settingsState);
    }

    unsubscriptions.push(
        settingsStore.subscribe(() => {
            localStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(settingsStore.state));
        }),
    );

    /**
     * CONTACTS
     */
    const contactsStore = useContactsStore();
    const storedContacts = localStorage.getItem(PersistentStorageKeys.CONTACTS);
    if (storedContacts) {
        const contacts: ContactsState = JSON.parse(storedContacts);
        // @ts-ignore Some weird error about a type missmatch
        contactsStore.patch({ contacts });
    }

    unsubscriptions.push(
        contactsStore.subscribe(() => {
            localStorage.setItem(PersistentStorageKeys.CONTACTS, JSON.stringify(contactsStore.state.contacts));
        }),
    );

    /**
     * FIAT
     */
    const fiatStore = useFiatStore();
    const storedRates = localStorage.getItem(StorageKeys.FIAT);
    if (storedRates) {
        const fiatState: FiatState = JSON.parse(storedRates);
        if (fiatState.timestamp > fiatStore.state.timestamp) {
            fiatStore.patch(fiatState);
        }
    }

    unsubscriptions.push(
        fiatStore.subscribe(() => {
            localStorage.setItem(StorageKeys.FIAT, JSON.stringify(fiatStore.state));
        }),
    );

    /**
     * CASHLINKS
     */
    const cashlinkStore = useCashlinkStore();
    const storedCashlinkState = localStorage.getItem(StorageKeys.CASHLINKS);
    if (storedCashlinkState) {
        const cashlinkState: CashlinkState = JSON.parse(storedCashlinkState);
        cashlinkStore.patch({
            ...cashlinkState,
            networkTrigger: 0,
        });
    }

    unsubscriptions.push(
        cashlinkStore.subscribe(() => {
            localStorage.setItem(StorageKeys.CASHLINKS, JSON.stringify(cashlinkStore.state));
        }),
    );
}

export function clearStorage() {
    for (const unsub of unsubscriptions) {
        unsub();
    }
    for (const key of Object.values(StorageKeys)) {
        localStorage.removeItem(key);
    }
}

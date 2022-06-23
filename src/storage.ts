/* eslint-disable max-classes-per-file */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { captureException } from '@sentry/vue';
import idbReady from 'safari-14-idb-fix';
import Config from 'config';
import { useTransactionsStore, Transaction } from './stores/Transactions';
import { useAddressStore, AddressState } from './stores/Address';
import { useAccountStore, AccountState } from './stores/Account';
import { useSettingsStore, SettingsState } from './stores/Settings';
import { useContactsStore } from './stores/Contacts';
import { useFiatStore, FiatState } from './stores/Fiat';
import { useProxyStore, ProxyState } from './stores/Proxy';
import { useBtcAddressStore, BtcAddressState } from './stores/BtcAddress';
import { useBtcTransactionsStore, Transaction as BtcTransaction } from './stores/BtcTransactions';
import { useBtcLabelsStore, BtcLabelsState } from './stores/BtcLabels';
import { useSwapsStore, SwapsState } from './stores/Swaps';
import { useBankStore, BankState } from './stores/Bank';
import { KycState, useKycStore } from './stores/Kyc';

const StorageKeys = {
    TRANSACTIONS: 'wallet_transactions_v01',
    ACCOUNTINFOS: 'wallet_accounts_v01',
    ADDRESSINFOS: 'wallet_addresses_v01',
    SETTINGS: 'wallet_settings_v01',
    FIAT: 'wallet_exchange-rates_v01',
    DEPRECATED_CASHLINKS: 'wallet_cashlinks_v01', // TODO deprecated; remove in the future
    PROXIES: 'wallet_proxies_v01',
    BTCTRANSACTIONS: 'wallet_btctransactions_v01',
    BTCADDRESSINFOS: 'wallet_btcaddresses_v01',
    SWAPS: 'wallet_swaps_v01',
    BANK: 'wallet_bank_v01',
    KYC: 'wallet_kyc_v01',
};

const PersistentStorageKeys = {
    CONTACTS: 'wallet_contacts_v01',
    BTCLABELS: 'wallet_btclabels_v01',
};

const unsubscriptions: (() => void)[] = [];

interface StorageBackend {
    get<ResultType>(key: string): Promise<ResultType | undefined>;
    set(key: string, value: any): Promise<void>;
    del(key: string): Promise<void>;
}

class IndexedDBStorage {
    private static lastError = '';

    static async get<ResultType>(key: string) {
        return idbGet<ResultType>(key);
    }

    static async set(key: string, value: any) {
        try {
            return await idbSet(key, value);
        } catch (error) {
            // TODO: Handle quota-errors with a user notification
            const message = error instanceof Error ? error.message : error as string;

            if (this.lastError !== message) {
                this.lastError = message;
                throw error;
            }
            return undefined;
        }
    }

    static async del(key: string) {
        return idbDel(key);
    }
}

class LocalStorageStorage {
    private static lastError = '';

    static async get<ResultType>(key: string) {
        const stored = localStorage.getItem(key);
        if (!stored) return undefined;
        return JSON.parse(stored) as ResultType;
    }

    static async set(key: string, value: any) {
        try {
            return localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            // TODO: Handle quota-errors with a user notification
            const message = error instanceof Error ? error.message : error as string;

            if (this.lastError !== message) {
                this.lastError = message;
                throw error;
            }
            return undefined;
        }
    }

    static async del(key: string) {
        return localStorage.removeItem(key);
    }
}

let Storage: StorageBackend;

export async function initStorage() {
    try {
        await idbReady();
        await migrateToIdb();
        Storage = IndexedDBStorage;
    } catch (error) {
        if (Config.reportToSentry) captureException(error);
        else console.error(error); // eslint-disable-line no-console
        Storage = LocalStorageStorage;
    }

    /**
     * TRANSACTIONS
     */
    const transactionsStore = useTransactionsStore();

    // Load transactions from storage
    const storedTxs = await Storage.get<{[hash: string]: Transaction}>(StorageKeys.TRANSACTIONS);
    if (storedTxs) {
        transactionsStore.patch({
            transactions: storedTxs,
        });
        transactionsStore.calculateFiatAmounts();
    }

    unsubscriptions.push(
        // Write transactions to storage when updated
        transactionsStore.subscribe(() => Storage.set(StorageKeys.TRANSACTIONS, transactionsStore.state.transactions)),
    );

    /**
     * ACCOUNTS
     */
    const accountStore = useAccountStore();

    // Load accounts from storage
    const storedAccountState = await Storage.get<AccountState>(StorageKeys.ACCOUNTINFOS);
    if (storedAccountState) {
        accountStore.patch(storedAccountState);
    }

    unsubscriptions.push(
        // Write accounts to storage when updated
        accountStore.subscribe(() => Storage.set(StorageKeys.ACCOUNTINFOS, accountStore.state)),
    );

    /**
     * ADDRESSES
     */
    const addressStore = useAddressStore();

    // Load addresses from storage
    const storedAddressState = await Storage.get<AddressState>(StorageKeys.ADDRESSINFOS);
    if (storedAddressState) {
        addressStore.patch(storedAddressState);
    }

    unsubscriptions.push(
        // Write addresses to storage when updated
        addressStore.subscribe(() => Storage.set(StorageKeys.ADDRESSINFOS, addressStore.state)),
    );

    /**
     * SETTINGS
     */
    const settingsStore = useSettingsStore();
    // Load user settings from storage
    const storedSettings = await Storage.get<SettingsState>(StorageKeys.SETTINGS);
    if (storedSettings) {
        settingsStore.patch({
            ...storedSettings,
            updateAvailable: false,
            btcDecimals: storedSettings.btcDecimals === 3 ? 5 : storedSettings.btcDecimals,
        });
    }

    unsubscriptions.push(
        settingsStore.subscribe(() => Storage.set(StorageKeys.SETTINGS, settingsStore.state)),
    );

    /**
     * CONTACTS
     */
    const contactsStore = useContactsStore();
    const storedContacts = await Storage.get<{[address: string]: string}>(PersistentStorageKeys.CONTACTS);
    if (storedContacts) {
        contactsStore.patch({
            contacts: storedContacts,
        });
    }

    unsubscriptions.push(
        contactsStore.subscribe(() => Storage.set(PersistentStorageKeys.CONTACTS, contactsStore.state.contacts)),
    );

    /**
     * FIAT
     */
    const fiatStore = useFiatStore();
    const storedRates = await Storage.get<FiatState>(StorageKeys.FIAT);
    if (storedRates) {
        if (storedRates.timestamp > fiatStore.state.timestamp) {
            fiatStore.patch(storedRates);
        }
    }

    unsubscriptions.push(
        fiatStore.subscribe(() => Storage.set(StorageKeys.FIAT, fiatStore.state)),
    );

    /**
     * PROXIES
     */
    const proxyStore = useProxyStore();
    const storedProxyState = await Storage.get<ProxyState>(StorageKeys.PROXIES)
        || await Storage.get<ProxyState>(StorageKeys.DEPRECATED_CASHLINKS);
    await Storage.del(StorageKeys.DEPRECATED_CASHLINKS);
    if (storedProxyState) {
        proxyStore.patch({
            ...storedProxyState,
            networkTrigger: 0,
        });
    }

    unsubscriptions.push(
        proxyStore.subscribe(() => Storage.set(StorageKeys.PROXIES, proxyStore.state)),
    );

    /**
     * BTC TRANSACTIONS
     */
    const btcTransactionsStore = useBtcTransactionsStore();

    // Load transactions from storage
    const storedBtcTxs = await Storage.get<{[hash: string]: BtcTransaction}>(StorageKeys.BTCTRANSACTIONS);
    if (storedBtcTxs) {
        btcTransactionsStore.patch({
            transactions: storedBtcTxs,
        });
        btcTransactionsStore.calculateFiatAmounts();
    }

    unsubscriptions.push(
        // Write transactions to storage when updated
        btcTransactionsStore.subscribe(() =>
            Storage.set(StorageKeys.BTCTRANSACTIONS, btcTransactionsStore.state.transactions)),
    );

    /**
     * BTC ADDRESSES
     */
    const btcAddressStore = useBtcAddressStore();

    // Load addresses from storage
    const storedBtcAddressState = await Storage.get<BtcAddressState>(StorageKeys.BTCADDRESSINFOS);
    if (storedBtcAddressState) {
        btcAddressStore.patch(storedBtcAddressState);
    }

    unsubscriptions.push(
        // Write addresses to storage when updated
        btcAddressStore.subscribe(() => Storage.set(StorageKeys.BTCADDRESSINFOS, btcAddressStore.state)),
    );

    /**
     * BTC Labels
     */
    const btcLabelsStore = useBtcLabelsStore();
    const storedBtcLabelsState = await Storage.get<BtcLabelsState>(PersistentStorageKeys.BTCLABELS);
    if (storedBtcLabelsState) {
        btcLabelsStore.patch(storedBtcLabelsState);
    }

    unsubscriptions.push(
        btcLabelsStore.subscribe(() => Storage.set(PersistentStorageKeys.BTCLABELS, btcLabelsStore.state)),
    );

    /**
     * Swaps
     */
    const swapsStore = useSwapsStore();
    const storedSwapsState = await Storage.get<SwapsState>(StorageKeys.SWAPS);
    if (storedSwapsState) {
        swapsStore.patch(storedSwapsState);
    }

    unsubscriptions.push(
        swapsStore.subscribe(() => Storage.set(StorageKeys.SWAPS, swapsStore.state)),
    );

    /**
     * Bank
     */
    const bankStore = useBankStore();
    const storedBankState = await Storage.get<BankState>(StorageKeys.BANK);
    if (storedBankState) {
        bankStore.patch(storedBankState);
    }

    unsubscriptions.push(
        bankStore.subscribe(() => Storage.set(StorageKeys.BANK, bankStore.state)),
    );

    /**
     * KYC
     */
    const kycStore = useKycStore();
    const storedKycState = await Storage.get<KycState>(StorageKeys.KYC);
    if (storedKycState) {
        kycStore.patch(storedKycState);
    }

    unsubscriptions.push(
        kycStore.subscribe(() => Storage.set(StorageKeys.KYC, kycStore.state)),
    );
}

export async function clearStorage() {
    for (const unsub of unsubscriptions) {
        unsub();
    }
    for (const key of Object.values(StorageKeys)) {
        await Storage.del(key); // eslint-disable-line no-await-in-loop
    }
}

async function migrateToIdb() {
    if (!localStorage.getItem(StorageKeys.ACCOUNTINFOS)) return;

    const keys = Object.values(StorageKeys).concat(Object.values(PersistentStorageKeys));

    for (const key of keys) {
        const localState = localStorage.getItem(key);
        if (!localState) continue;
        await idbSet(key, JSON.parse(localState)); // eslint-disable-line no-await-in-loop
    }

    // Only remove localstorage items when all items have been migrated successfully.
    for (const key of keys) {
        localStorage.removeItem(key);
    }
}

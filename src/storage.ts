/* eslint-disable max-classes-per-file */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { captureException } from '@sentry/vue';
import idbReady from 'safari-14-idb-fix';
import type { Store, StateTree } from 'pinia';
import { useTransactionsStore } from './stores/Transactions';
import { useAddressStore } from './stores/Address';
import { useAccountStore } from './stores/Account';
import { useSettingsStore } from './stores/Settings';
import { useContactsStore } from './stores/Contacts';
import { useFiatStore, guessUserCurrency } from './stores/Fiat';
import { useProxyStore } from './stores/Proxy';
import { useBtcAddressStore } from './stores/BtcAddress';
import { useBtcTransactionsStore } from './stores/BtcTransactions';
import { useBtcLabelsStore } from './stores/BtcLabels';
import { useUsdcAddressStore } from './stores/UsdcAddress';
import { useUsdcContactsStore } from './stores/UsdcContacts';
import { useUsdcTransactionsStore } from './stores/UsdcTransactions';
import { useSwapsStore } from './stores/Swaps';
import { useBankStore } from './stores/Bank';
import { useKycStore } from './stores/Kyc';
import { useStakingStore } from './stores/Staking';
import { useConfig } from './composables/useConfig';
import { useGeoIp } from './composables/useGeoIp';

const StorageKeys = {
    TRANSACTIONS: 'wallet_transactions_v02',
    ACCOUNTINFOS: 'wallet_accounts_v01',
    ADDRESSINFOS: 'wallet_addresses_v01',
    SETTINGS: 'wallet_settings_v01',
    FIAT: 'wallet_exchange-rates_v01',
    DEPRECATED_CASHLINKS: 'wallet_cashlinks_v01', // TODO deprecated; remove in the future
    PROXIES: 'wallet_proxies_v01',
    BTCTRANSACTIONS: 'wallet_btctransactions_v01',
    BTCADDRESSINFOS: 'wallet_btcaddresses_v01',
    USDCADDRESSINFOS: 'wallet_usdcaddresses_v01',
    USDCTRANSACTIONS: 'wallet_usdctransactions_v01',
    SWAPS: 'wallet_swaps_v01',
    BANK: 'wallet_bank_v01',
    KYC: 'wallet_kyc_v00',
    STAKING: 'wallet_staking_v00',
};

const PersistentStorageKeys = {
    CONTACTS: 'wallet_contacts_v01',
    BTCLABELS: 'wallet_btclabels_v01',
    USDCCONTACTS: 'wallet_usdccontacts_v01',
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
        if (useConfig().config.reportToSentry) captureException(error);
        else console.error(error); // eslint-disable-line no-console
        Storage = LocalStorageStorage;
    }

    const transactionsStore = useTransactionsStore();
    const btcTransactionsStore = useBtcTransactionsStore();
    const usdcTransactionsStore = useUsdcTransactionsStore();
    const proxyStore = useProxyStore();

    // Delete deprecated stores
    if (StorageKeys.TRANSACTIONS === 'wallet_transactions_v02') {
        idbDel('wallet_transactions_v01'); // no need to await this, fire and forget
    }

    await Promise.all([
        initStoreStore(
            useSettingsStore(),
            StorageKeys.SETTINGS,
            (state) => state, // this is the default, but we still provide it for ts type inference
            (storedSettings) => ({
                ...storedSettings,
                updateAvailable: false,
                btcDecimals: storedSettings.btcDecimals === 3 ? 5 : storedSettings.btcDecimals,
            }),
        ),
        initStoreStore(useFiatStore(), StorageKeys.FIAT).then((storedFiatState) => {
            if (storedFiatState) return;
            // Get location from GeoIP service to set initial fiat currency. We do this in the background to not block
            // app startup. There is theoretically a race condition between the geo ip check and the Wallet redirecting
            // to the Hub Onboarding if there are no accounts present. However, the accounts are fetched in syncFromHub
            // which is only started after the storages are initialized (see main.ts), and involves loading the Hub
            // iframe, such that we can expect the geo ip check to resolve before that.
            useGeoIp().locate().then((location) => {
                if (!location.country) return;
                useFiatStore().state.currency = guessUserCurrency(location.country);
            }).catch((error) => {
                // eslint-disable-next-line no-console
                console.debug(`Failed to locate user for fiat currency: ${error.message || error}`);
            });
        }),
        initStoreStore(useSwapsStore(), StorageKeys.SWAPS),
        initStoreStore(useBankStore(), StorageKeys.BANK),
        initStoreStore(
            useKycStore(),
            StorageKeys.KYC,
            (state) => state, // this is the default, but we still provide it for ts type inference
            (storedKycState) => ({
                ...storedKycState,
                kycLimits: null,
            }),
        ),
        initStoreStore(useAccountStore(), StorageKeys.ACCOUNTINFOS),
        initStoreStore(useAddressStore(), StorageKeys.ADDRESSINFOS),
        initStoreStore(
            transactionsStore,
            StorageKeys.TRANSACTIONS,
            (state) => state.transactions,
            (storedTransactions) => ({ transactions: storedTransactions }),
        ),
        initStoreStore(
            useContactsStore(),
            PersistentStorageKeys.CONTACTS,
            (state) => state.contacts,
            (storedContacts) => ({ contacts: storedContacts }),
        ),
        initStoreStore(proxyStore, StorageKeys.PROXIES).then((storedProxies) => {
            if (!storedProxies) {
                // Migrate proxies over from deprecated Cashlink store, if it exists.
                return initStoreStore(proxyStore, StorageKeys.DEPRECATED_CASHLINKS);
            }
            // Proxies have already been migrated. Delete deprecated Cashlink store if it still exists.
            Storage.del(StorageKeys.DEPRECATED_CASHLINKS); // no need to await this
            return storedProxies;
        }),
        initStoreStore(useBtcAddressStore(), StorageKeys.BTCADDRESSINFOS),
        initStoreStore(useBtcLabelsStore(), PersistentStorageKeys.BTCLABELS),
        initStoreStore(
            btcTransactionsStore,
            StorageKeys.BTCTRANSACTIONS,
            (state) => state.transactions,
            (storedBtcTransactions) => ({ transactions: storedBtcTransactions }),
        ),
        initStoreStore(useUsdcAddressStore(), StorageKeys.USDCADDRESSINFOS),
        initStoreStore(
            usdcTransactionsStore,
            StorageKeys.USDCTRANSACTIONS,
            (store) => store.transactions,
            (storedUsdcTransactions) => ({ transactions: storedUsdcTransactions }),
        ),
        initStoreStore(
            useUsdcContactsStore(),
            PersistentStorageKeys.USDCCONTACTS,
            (state) => state.contacts,
            (storedContacts) => ({ contacts: storedContacts }),
        ),
        initStoreStore(
            useStakingStore(),
            StorageKeys.STAKING,
            (state) => state, // this is the default, but we still provide it for ts type inference
            (storedStakingState) => ({
                ...storedStakingState,
                validators: {},
            }),
        ),
    ]);

    // Fetch missing exchange rates.
    transactionsStore.calculateFiatAmounts();
    btcTransactionsStore.calculateFiatAmounts();
    usdcTransactionsStore.calculateFiatAmounts();
}

async function initStoreStore<State extends StateTree, StoredState>(
    store: Store<string, State, any, any>,
    storageKey: string,
    writeTransform: (state: State) => StoredState = (state: State) => state,
    readTransform: (storedState: StoredState) => Partial<State> = (storedState: StoredState) => storedState,
): Promise<StoredState | undefined> {
    const storedState = await Storage.get<StoredState>(storageKey);
    if (storedState) {
        store.patch(readTransform(storedState));
    }
    unsubscriptions.push(
        // Write state back to storage on changes.
        store.subscribe(() => Storage.set(storageKey, writeTransform(store.state))),
    );
    return storedState;
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

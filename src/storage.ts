/* eslint-disable max-classes-per-file */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import idbReady from 'safari-14-idb-fix';
import type { Store, StateTree } from 'pinia';
import { useTransactionsStore } from './stores/Transactions';
import { useAddressStore } from './stores/Address';
import { useAccountStore } from './stores/Account';
import { useSettingsStore } from './stores/Settings';
import { useAccountSettingsStore } from './stores/AccountSettings';
import { useContactsStore } from './stores/Contacts';
import { useFiatStore, guessUserCurrency } from './stores/Fiat';
import { useProxyStore } from './stores/Proxy';
import { useBtcAddressStore } from './stores/BtcAddress';
import { useBtcTransactionsStore } from './stores/BtcTransactions';
import { useBtcLabelsStore } from './stores/BtcLabels';
import { usePolygonAddressStore } from './stores/PolygonAddress';
import { useUsdcContactsStore } from './stores/UsdcContacts';
import { useUsdcTransactionsStore } from './stores/UsdcTransactions';
import { useUsdtContactsStore } from './stores/UsdtContacts';
import { useUsdtTransactionsStore } from './stores/UsdtTransactions';
import { useSwapsStore } from './stores/Swaps';
import { useBankStore } from './stores/Bank';
import { useKycStore } from './stores/Kyc';
import { useStakingStore } from './stores/Staking';
import { useGeoIp } from './composables/useGeoIp';
import VueCompositionApiUtils from './lib/VueCompositionApiUtils';
import { reportToSentry } from './lib/Sentry';

const StorageKeys = {
    TRANSACTIONS: 'wallet_transactions_v01',
    ACCOUNTINFOS: 'wallet_accounts_v01',
    ADDRESSINFOS: 'wallet_addresses_v01',
    SETTINGS: 'wallet_settings_v01',
    ACCOUNTSETTINGS: 'wallet_accountsettings_v00',
    FIAT: 'wallet_exchange-rates_v01',
    DEPRECATED_CASHLINKS: 'wallet_cashlinks_v01', // TODO deprecated; remove in the future
    PROXIES: 'wallet_proxies_v01',
    BTCTRANSACTIONS: 'wallet_btctransactions_v01',
    BTCADDRESSINFOS: 'wallet_btcaddresses_v01',
    POLYGONADDRESSINFOS: 'wallet_usdcaddresses_v01', // Legacy value to not delete all user's Polygon addresses
    USDCTRANSACTIONS: 'wallet_usdctransactions_v01',
    USDTTRANSACTIONS: 'wallet_usdttransactions_v01',
    SWAPS: 'wallet_swaps_v01',
    BANK: 'wallet_bank_v01',
    KYC: 'wallet_kyc_v00',
    STAKING: 'wallet_staking_v00',
};

const PersistentStorageKeys = {
    CONTACTS: 'wallet_contacts_v01',
    BTCLABELS: 'wallet_btclabels_v01',
    USDCCONTACTS: 'wallet_usdccontacts_v01',
    USDTCONTACTS: 'wallet_usdtcontacts_v01',
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
        reportToSentry(error);
        Storage = LocalStorageStorage;
    }

    const transactionsStore = useTransactionsStore();
    const btcTransactionsStore = useBtcTransactionsStore();
    const usdcTransactionsStore = useUsdcTransactionsStore();
    const usdtTransactionsStore = useUsdtTransactionsStore();
    const proxyStore = useProxyStore();

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
        initStoreStore(
            useAccountSettingsStore(),
            StorageKeys.ACCOUNTSETTINGS,
            (state) => state.settings,
            (storedAccountSettings) => ({ settings: storedAccountSettings }),
        ),
        initStoreStore(
            useFiatStore(),
            StorageKeys.FIAT,
            (state) => state, // this is the default, but we still provide it for ts type inference
            (storedFiatState) => {
                if (storedFiatState.timestamp && Math.abs(Date.now() - storedFiatState.timestamp) > 10 * 60 * 1000) {
                    // Discard stored exchange rates if they're older than 10 minutes.
                    storedFiatState.timestamp = 0;
                    storedFiatState.exchangeRates = {};
                }
                return storedFiatState;
            },
        ).then((storedFiatState) => {
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
        initStoreStore(
            usePolygonAddressStore(),
            StorageKeys.POLYGONADDRESSINFOS,
            (state) => state, // this is the default, but we still provide it for ts type inference
            ({ addressInfos }) => {
                const mapped = Object.entries(addressInfos).map(([id, ai]) => [id, {
                    address: ai.address,
                    // Map old properties to new properties
                    // @ts-expect-error Old property no longer typed
                    balanceUsdcBridged: ai.balanceUsdcBridged ?? ai.balance,
                    // @ts-expect-error Old property no longer typed
                    balanceUsdc: ai.balanceUsdc ?? ai.nativeBalance,
                    balanceUsdtBridged: ai.balanceUsdtBridged ?? null,
                    // @ts-expect-error Old property no longer typed
                    pol: ai.pol ?? ai.matic,
                }] as [string, typeof ai]);
                return {
                    addressInfos: Object.fromEntries(mapped),
                };
            },
        ),
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
            usdtTransactionsStore,
            StorageKeys.USDTTRANSACTIONS,
            (store) => store.transactions,
            (storedUsdtTransactions) => ({ transactions: storedUsdtTransactions }),
        ),
        initStoreStore(
            useUsdtContactsStore(),
            PersistentStorageKeys.USDTCONTACTS,
            (state) => state.contacts,
            (storedContacts) => ({ contacts: storedContacts }),
        ),
        initStoreStore(
            useStakingStore(),
            StorageKeys.STAKING,
            (state) => state, // this is the default, but we still provide it for ts type inference
            (storedStakingState) => ({
                ...storedStakingState,
                // Make the staking events non-reactive to avoid the very noticeable performance impact of Vue's
                // reactivity system on the possibly tens of thousands of entries. See Staking.ts
                stakingEventsByAddress: VueCompositionApiUtils.nonReactive(storedStakingState.stakingEventsByAddress),
            }),
        ),
    ]);

    // Fetch missing exchange rates.
    transactionsStore.calculateFiatAmounts();
    btcTransactionsStore.calculateFiatAmounts();
    usdcTransactionsStore.calculateFiatAmounts();
    usdtTransactionsStore.calculateFiatAmounts();
}

async function initStoreStore<State extends StateTree, StoredState>(
    store: Store<string, State, any, any>,
    storageKey: string,
    writeTransform: (state: State) => StoredState = (state: State) => state,
    readTransform: (storedState: StoredState) => Partial<State> = (storedState: StoredState) => storedState,
): Promise<StoredState | undefined> {
    const storedState = await Storage.get<StoredState>(storageKey);
    if (storedState) {
        // Don't use store.patch, because it's broken. It doesn't properly set up reactivity on newly created properties
        // as it does not use Vue.set to create them. This causes this data to not trigger change notifications, both on
        // the current change and on future changes, even if Vue.set is used in the future. See experiments and comments
        // in VueCompositionApiUtils.ts.
        // However, also don't use VueCompositionApiUtils.updateObject, to avoid the performance overhead of recursing
        // the object checking for changes, which is not needed here, as we're initiating the object here and pretty
        // much all data changes. It is thus more efficient to simply overwrite the entire object.
        store.state = {
            ...store.state,
            ...readTransform(storedState),
        };
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

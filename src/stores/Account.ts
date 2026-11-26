import HubApi, { Account, AccountType as AccountTypeEnumType } from '@nimiq/hub-api';
import { defineStore } from 'pinia';
import { CryptoCurrency } from '../lib/Constants';
import { useAccountSettingsStore } from './AccountSettings';
import { useAddressStore } from './Address';

export type AccountState = {
    accountInfos: { [id: string]: AccountInfo };
    activeAccountId: string | null;
    activeCurrency: CryptoCurrency;
};

// Reconstruct AccountType enum by typescript declaration merging of enum values and enum type
const { AccountType } = HubApi; // AccountType enum values
type AccountType = AccountTypeEnumType; // AccountType enum type
export { AccountType };

export type AccountInfo = Omit<
    Account,
    'accountId' | 'type' | 'contracts' | 'addresses' | 'uid' | 'requestType' | 'polygonAddresses'
> & {
    id: string;
    type: AccountType;
    addresses: string[];
    uid?: string;
    polygonAddresses?: string[];
};

export const useAccountStore = defineStore('accounts', {
    state: () =>
        ({
            accountInfos: {},
            activeAccountId: null,
            activeCurrency: CryptoCurrency.NIM,
        }) as AccountState,
    getters: {
        activeAccountInfo: (state) => (state.activeAccountId ? state.accountInfos[state.activeAccountId] : null),
        accountNimAddresses(): string[] {
            return this.activeAccountInfo?.addresses || [];
        },
        hasBitcoinAddresses(): boolean {
            return Boolean(this.activeAccountInfo?.btcAddresses?.external.length);
        },
        hasPolygonAddresses(): boolean {
            return Boolean(this.activeAccountInfo?.polygonAddresses?.length);
        },
    },
    actions: {
        selectAccount(accountId: string) {
            this.$state.activeAccountId = accountId;

            // If the selected account does not support Bitcoin or USDC (or has them not enabled),
            // switch active currency to NIM
            if (
                (this.activeCurrency === CryptoCurrency.BTC && !this.hasBitcoinAddresses)
                || (this.activeCurrency === CryptoCurrency.USDC && !this.hasPolygonAddresses)
                || (this.activeCurrency === CryptoCurrency.USDT && !this.hasPolygonAddresses)
            ) {
                this.setActiveCurrency(CryptoCurrency.NIM);
            }

            if ([CryptoCurrency.USDC, CryptoCurrency.USDT].includes(this.activeCurrency)) {
                const stablecoin = useAccountSettingsStore().$state.settings[accountId]?.stablecoin;
                if (!stablecoin) {
                    this.setActiveCurrency(CryptoCurrency.NIM);
                } else if (stablecoin !== this.activeCurrency) {
                    this.setActiveCurrency(stablecoin);
                }
            }

            const { selectAddress } = useAddressStore();
            // FIXME: Instead of always selecting the first address, store which address was selected per account.
            selectAddress(this.activeAccountInfo!.addresses[0]);
        },
        addAccountInfo(accountInfo: AccountInfo, selectIt = true) {
            // Need to assign whole object for change detection of new accounts.
            // TODO: Simply set new accountInfo in Vue 3.
            this.$state.accountInfos = {
                ...this.$state.accountInfos,
                [accountInfo.id]: accountInfo,
            };

            if (selectIt) this.selectAccount(accountInfo.id);
        },
        setAccountInfos(accountInfos: AccountInfo[]) {
            const newAccountInfos: { [id: string]: AccountInfo } = {};

            for (const accountInfo of accountInfos) {
                newAccountInfos[accountInfo.id] = accountInfo;
            }

            this.$state.accountInfos = newAccountInfos;

            // If no account selected yet, or selected account does not exist anymore, select the first available.
            if (!this.$state.activeAccountId || !this.$state.accountInfos[this.$state.activeAccountId]) {
                if (accountInfos[0]) {
                    this.selectAccount(accountInfos[0].id);
                } else {
                    this.$state.activeAccountId = null;
                }
            }

            // Ensure active account and active address are in a consistent state.
            // Even an account that was already selected might be inconsistent to the selected address. It might for
            // example have changed to a different account's address in a second tab.
            useAddressStore().ensureActiveAddressInActiveAccount();
        },
        patchAccount(accountId: string, patch: Partial<AccountInfo>) {
            this.$state.accountInfos[accountId] = {
                ...this.$state.accountInfos[accountId],
                ...patch,
            };
        },
        addAddressToAccount(accountId: string, address: string) {
            if (this.$state.accountInfos[accountId].addresses.includes(address)) return;
            this.$state.accountInfos[accountId].addresses.push(address);
        },
        removeAccount(accountId: string) {
            const accountInfos = { ...this.$state.accountInfos };
            delete accountInfos[accountId];
            this.$state.accountInfos = accountInfos;

            if (this.$state.activeAccountId === accountId) {
                const accountInfosArray = Object.values(accountInfos);
                if (accountInfosArray[0]) {
                    this.selectAccount(accountInfosArray[0].id);
                } else {
                    this.$state.activeAccountId = null;
                }
            }
        },
        setActiveCurrency(currency: CryptoCurrency) {
            this.$state.activeCurrency = currency;
        },
    },
});

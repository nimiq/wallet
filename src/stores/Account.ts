import { defineStore } from 'pinia';
import { Account } from '@nimiq/hub-api';
import { useAddressStore } from './Address';
import { CryptoCurrency } from '../lib/Constants';

export type AccountState = {
    accountInfos: {[id: string]: AccountInfo},
    activeAccountId: string | null,
    activeCurrency: CryptoCurrency,
}

// Mirror of Hub WalletType, which is not exported
export enum AccountType {
    LEGACY = 1,
    BIP39 = 2,
    LEDGER = 3,
}

export type AccountInfo = Omit<Account, 'accountId' | 'type' | 'contracts' | 'addresses' | 'uid'> & {
    id: string,
    type: AccountType,
    addresses: string[],
    uid?: string,
}

export const useAccountStore = defineStore({
    id: 'accounts',
    state: (): AccountState => ({
        accountInfos: {},
        activeAccountId: null,
        activeCurrency: CryptoCurrency.NIM,
    }),
    getters: {
        activeAccountInfo(): AccountInfo | null {
            return this.activeAccountId ? this.accountInfos[this.activeAccountId] : null;
        },
    },
    actions: {
        selectAccount(accountId: string) {
            this.activeAccountId = accountId;

            // If the selected account does not support Bitcoin (or has it not enabled), switch active currency to NIM
            const activeAccountInfo = this.activeAccountInfo.value!;
            if (!activeAccountInfo.btcAddresses || !activeAccountInfo.btcAddresses.external.length) {
                this.setActiveCurrency(CryptoCurrency.NIM);
            }

            const { selectAddress } = useAddressStore();
            // FIXME: Instead of always selecting the first address, store which address was selected per account.
            selectAddress(activeAccountInfo.addresses[0]);
        },
        addAccountInfo(accountInfo: AccountInfo, selectIt = true) {
            // Need to assign whole object for change detection of new accounts.
            // TODO: Simply set new accountInfo in Vue 3.
            this.accountInfos = {
                ...this.accountInfos,
                [accountInfo.id]: accountInfo,
            };

            if (selectIt) this.activeAccountId = accountInfo.id;
        },
        setAccountInfos(accountInfos: AccountInfo[]) {
            const newAccountInfos: {[id: string]: AccountInfo} = {};

            for (const accountInfo of accountInfos) {
                newAccountInfos[accountInfo.id] = accountInfo;
            }

            this.accountInfos = newAccountInfos;

            // If no account selected yet, or selected account does not exist anymore, select the first available.
            // TODO: Replace with account selection screen?
            if (!this.activeAccountId || !this.accountInfos[this.activeAccountId]) {
                this.activeAccountId = accountInfos[0] ? accountInfos[0].id : null;
            }
        },
        patchAccount(accountId: string, patch: Partial<AccountInfo>) {
            this.accountInfos[accountId] = {
                ...this.accountInfos[accountId],
                ...patch,
            };
        },
        addAddressToAccount(accountId: string, address: string) {
            if (this.accountInfos[accountId].addresses.includes(address)) return;
            this.accountInfos[accountId].addresses.push(address);
        },
        removeAccount(accountId: string) {
            const accountInfos = { ...this.accountInfos };
            delete accountInfos[accountId];
            this.accountInfos = accountInfos;

            if (this.activeAccountId === accountId) {
                const accountInfosArray = Object.values(accountInfos);
                if (accountInfosArray[0]) {
                    this.selectAccount(accountInfosArray[0].id);
                } else {
                    this.activeAccountId = null;
                }
            }
        },
        setActiveCurrency(currency: CryptoCurrency) {
            this.activeCurrency = currency;
        },
    },
});

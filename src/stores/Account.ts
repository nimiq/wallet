import { createStore } from 'pinia';
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

export const useAccountStore = createStore({
    id: 'accounts',
    state: () => ({
        accountInfos: {},
        activeAccountId: null,
        activeCurrency: CryptoCurrency.NIM,
    } as AccountState),
    getters: {
        accountInfos: (state) => state.accountInfos,
        activeAccountId: (state) => state.activeAccountId,
        activeAccountInfo: (state) => state.activeAccountId
            ? state.accountInfos[state.activeAccountId]
            : null,
        activeCurrency: (state) => state.activeCurrency,
        hasBitcoinAddresses: (state, { activeAccountInfo }) =>
            Boolean((activeAccountInfo.value as AccountInfo | null)?.btcAddresses?.external.length),
    },
    actions: {
        selectAccount(accountId: string) {
            this.state.activeAccountId = accountId;

            // If the selected account does not support Bitcoin (or has it not enabled), switch active currency to NIM
            if (!this.hasBitcoinAddresses.value) {
                this.setActiveCurrency(CryptoCurrency.NIM);
            }

            const { selectAddress } = useAddressStore();
            // FIXME: Instead of always selecting the first address, store which address was selected per account.
            selectAddress(this.activeAccountInfo.value!.addresses[0]);
        },
        addAccountInfo(accountInfo: AccountInfo, selectIt = true) {
            // Need to assign whole object for change detection of new accounts.
            // TODO: Simply set new accountInfo in Vue 3.
            this.state.accountInfos = {
                ...this.state.accountInfos,
                [accountInfo.id]: accountInfo,
            };

            if (selectIt) this.state.activeAccountId = accountInfo.id;
        },
        setAccountInfos(accountInfos: AccountInfo[]) {
            const newAccountInfos: {[id: string]: AccountInfo} = {};

            for (const accountInfo of accountInfos) {
                newAccountInfos[accountInfo.id] = accountInfo;
            }

            this.state.accountInfos = newAccountInfos;

            // If no account selected yet, or selected account does not exist anymore, select the first available.
            // TODO: Replace with account selection screen?
            if (!this.state.activeAccountId || !this.state.accountInfos[this.state.activeAccountId]) {
                this.state.activeAccountId = accountInfos[0] ? accountInfos[0].id : null;
            }
        },
        patchAccount(accountId, patch: Partial<AccountInfo>) {
            this.state.accountInfos[accountId] = {
                ...this.state.accountInfos[accountId],
                ...patch,
            };
        },
        addAddressToAccount(accountId: string, address: string) {
            if (this.state.accountInfos[accountId].addresses.includes(address)) return;
            this.state.accountInfos[accountId].addresses.push(address);
        },
        removeAccount(accountId: string) {
            const accountInfos = { ...this.state.accountInfos };
            delete accountInfos[accountId];
            this.state.accountInfos = accountInfos;

            if (this.state.activeAccountId === accountId) {
                const accountInfosArray = Object.values(accountInfos);
                if (accountInfosArray[0]) {
                    this.selectAccount(accountInfosArray[0].id);
                } else {
                    this.state.activeAccountId = null;
                }
            }
        },
        setActiveCurrency(currency: CryptoCurrency) {
            this.state.activeCurrency = currency;
        },
    },
});

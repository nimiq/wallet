import { CryptoCurrency } from '@nimiq/utils';
import { createStore } from 'pinia';
import { useAccountStore } from './Account';

export type Stablecoin = CryptoCurrency.USDC | CryptoCurrency.USDT;

export type AccountSettingsState = {
    [accountId: string]: {
        stablecoin: Stablecoin | null,
    },
};

export const useAccountSettingsStore = createStore({
    id: 'account-settings',
    state: (): AccountSettingsState => ({}),
    getters: {
        stablecoin: (state): Readonly<Stablecoin | null> => {
            const activeAccountId = useAccountStore().activeAccountId.value;
            if (!activeAccountId) return null;
            return state[activeAccountId]?.stablecoin ?? null;
        },
    },
    actions: {
        setStablecoin(stablecoin: Stablecoin, accountId?: string) {
            const activeAccountId = accountId || useAccountStore().activeAccountId.value;
            if (!activeAccountId) return;
            if (!this.state[activeAccountId]) {
                // Reassign whole state object to trigger reactivity in Vue 2
                // TODO: In Vue 3, simply create the new property: `this.state[activeAccountId] = { stablecoin };`
                this.state = {
                    ...this.state,
                    [activeAccountId]: { stablecoin },
                };
            } else {
                this.state[activeAccountId].stablecoin = stablecoin;
            }
        },
    },
});

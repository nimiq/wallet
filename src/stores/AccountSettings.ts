import { CryptoCurrency } from '@nimiq/utils';
import { createStore } from 'pinia';
import { useAccountStore } from './Account';

export type Stablecoin = CryptoCurrency.USDC | CryptoCurrency.USDT;

export type AccountSettingsState = {
    settings: {
        [accountId: string]: {
            stablecoin: Stablecoin | null,
            knowsAboutUsdt?: boolean,
        },
    },
};

export const useAccountSettingsStore = createStore({
    id: 'account-settings',
    state: (): AccountSettingsState => ({
        settings: {},
    }),
    getters: {
        stablecoin: ({ settings }): Readonly<Stablecoin | null> => {
            const activeAccountId = useAccountStore().activeAccountId.value;
            if (!activeAccountId) return null;
            return settings[activeAccountId]?.stablecoin ?? null;
        },
        knowsAboutUsdt: ({ settings }): Readonly<boolean | null> => {
            const activeAccountId = useAccountStore().activeAccountId.value;
            if (!activeAccountId) return null;
            return settings[activeAccountId]?.knowsAboutUsdt ?? false;
        },
    },
    actions: {
        setStablecoin(stablecoin: Stablecoin, accountId?: string) {
            const activeAccountId = accountId || useAccountStore().activeAccountId.value;
            if (!activeAccountId) return;
            // Need to assign whole object for change detection of new settings.
            // TODO: Simply set new settings in Vue 3.
            this.state.settings = {
                ...this.state.settings,
                [activeAccountId]: {
                    ...this.state.settings[activeAccountId],
                    stablecoin,
                    ...(stablecoin === CryptoCurrency.USDT ? { knowsAboutUsdt: true } : {}),
                },
            };
        },
        setKnowsAboutUsdt(knowsAboutUsdt: boolean, accountId?: string) {
            const activeAccountId = accountId || useAccountStore().activeAccountId.value;
            if (!activeAccountId) return;// Need to assign whole object for change detection of new settings.
            // TODO: Simply set new settings in Vue 3.
            this.state.settings = {
                ...this.state.settings,
                [activeAccountId]: {
                    ...this.state.settings[activeAccountId],
                    knowsAboutUsdt,
                },
            };
        },
    },
});

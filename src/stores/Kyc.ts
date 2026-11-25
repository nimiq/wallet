import { UserLimits } from '@nimiq/fastspot-api';
import { defineStore } from 'pinia';
import { useConfig } from '../composables/useConfig';
import { useAccountStore } from './Account';

export enum KycProvider {
    TEN31PASS = 'TEN31 Pass',
}

export type TEN31PassUser = {
    provider: KycProvider.TEN31PASS;
    appGrant: string;
    id: string;
    name: string;
};

// Union of provider user types
export type KycUser = TEN31PassUser;

export type KycState = {
    connectedUsers: Record<string, KycUser | null>;
    // kycLimits stores the general KYC limits of Fastspot.
    // It has nothing to do with any currently connected user.
    kycLimits: UserLimits | null;
};

export const useKycStore = defineStore('kyc', {
    state: (): KycState => ({
        connectedUsers: {},
        kycLimits: null,
    }),
    getters: {
        connectedUser: (state): Readonly<KycUser | null> => {
            if (!useConfig().config.ten31Pass.enabled) return null;

            const { activeAccountId } = useAccountStore();
            if (!activeAccountId) return null;

            return state.connectedUsers[activeAccountId] || null;
        },
    },
    actions: {
        connect(accountId: string, user: KycUser) {
            this.$state.connectedUsers = {
                ...this.$state.connectedUsers,
                [accountId]: user,
            };
        },
        disconnect(accountId: string) {
            const connectedUsers = { ...this.$state.connectedUsers };
            delete connectedUsers[accountId];
            this.$state.connectedUsers = connectedUsers;
        },
        setKycLimits(limits: UserLimits) {
            this.$state.kycLimits = limits;
        },
    },
});

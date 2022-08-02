import { UserLimits } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import Config from 'config';
import { useAccountStore } from './Account';

export enum KycProvider {
    TEN31PASS = 'TEN31 Pass',
}

export type TEN31PassUser = {
    provider: KycProvider.TEN31PASS,
    appGrant: string,
    id: string,
    name: string,
}

// Union of provider user types
type KycUser = TEN31PassUser

export type KycState = {
    connectedUsers: Record<string, KycUser | null>,
    // kycLimits stores the general KYC limits of Fastspot.
    // It has nothing to do with any currently connected user.
    kycLimits: UserLimits | null,
}

export const useKycStore = createStore({
    id: 'kyc',
    state: (): KycState => ({
        connectedUsers: {},
        kycLimits: null,
    }),
    getters: {
        connectedUser: (state): Readonly<KycUser | null> => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return null;

            // We need to fetch the user from the state here first, to register it as a reactive dependency
            // for this getter. Otherwise, if ten31Pass is disabled when this getter is first accessed,
            // execution stops at the config check and dependencies that come later are not registered for
            // reactivity.
            const user = state.connectedUsers[activeAccountId.value] || null;
            if (!Config.ten31Pass.enabled) return null;

            return user;
        },
        kycLimits: (state): Readonly<UserLimits | null> => state.kycLimits,
    },
    actions: {
        connect(accountId: string, user: KycUser) {
            this.state.connectedUsers = {
                ...this.state.connectedUsers,
                [accountId]: user,
            };
        },
        disconnect(accountId: string) {
            const connectedUsers = { ...this.state.connectedUsers };
            delete connectedUsers[accountId];
            this.state.connectedUsers = connectedUsers;
        },
        setKycLimits(limits: UserLimits) {
            this.state.kycLimits = limits;
        },
    },
});

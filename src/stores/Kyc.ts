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
            if (!Config.TEN31Pass.enabled) return null;

            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return null;

            return state.connectedUsers[activeAccountId.value] || null;
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

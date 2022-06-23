import { createStore } from 'pinia';

export enum KycProvider {
    TEN31PASS = 'TEN31 Pass',
}

export type TEN31PassUser = {
    provider: KycProvider.TEN31PASS,
    id: string,
    name: string,
}

// Union of provider user types
type KycUser = TEN31PassUser

export type KycState = {
    connectedUser: KycUser | null,
}

export const useKycStore = createStore({
    id: 'kyc',
    state: (): KycState => ({
        connectedUser: null,
    }),
    getters: {
        connectedUser: (state): Readonly<KycUser | null> => state.connectedUser,
    },
    actions: {
        connect(user: KycUser) {
            this.state.connectedUser = user;
        },
        disconnect() {
            this.state.connectedUser = null;
        },
    },
});

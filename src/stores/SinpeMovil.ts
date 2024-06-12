import { UserLimits } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import { useConfig } from '../composables/useConfig'; 

export type SinpeMovilState = {
    phoneNumber: string | null,
    token: string | null,
    userLimits: UserLimits | null,
};

export const useSinpeMovilStore = createStore({
    id: 'kyc',
    state: (): SinpeMovilState => ({
        phoneNumber: null,
        token: null,
        userLimits: null,
    }),
    getters: {
        isUserVerified: (state): Readonly<boolean> => {
            if (!useConfig().config.sinpeMovil.enabled) return false;

            // Check if state is set and the timestamp is less than 5 minutes ago
            return !!state.phoneNumber && !!state.token;
        },
        kycLimits: (state): Readonly<UserLimits | null> => state.userLimits,
    },
    actions: {
        connect(user: Omit<SinpeMovilState, 'userLimits'>) {
            this.state = { ...user, userLimits: this.state.userLimits };
        },
        resetUser() {
            this.state = { phoneNumber: null, token: null, userLimits: this.state.userLimits };
        },
    },
});

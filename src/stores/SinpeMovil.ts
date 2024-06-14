import { UserLimits } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import { useConfig } from '../composables/useConfig';

export type SinpeMovilState = {
    phoneNumber: string | null,
    label: string | null,
    token: string | null,
    tokenTimestamp: string | null,
    userLimits: UserLimits | null,
};

export const useSinpeMovilStore = createStore({
    id: 'sinpemovil',
    state: (): SinpeMovilState => ({
        phoneNumber: null,
        label: null,
        token: null,
        tokenTimestamp: null,
        userLimits: null,
    }),
    getters: {
        phoneNumber: (state): Readonly<string | null> => state.phoneNumber || '',
        label: (state): Readonly<string | null> => state.label || '',
        initials: (state): Readonly<string | null> =>
            // Split by non-alphabetic characters (name can be), take the first character of each word and join them
            state.label?.split(/[^a-zA-Z]+/).map((word) => word[0]).join('') || '',
        isUserVerified: (state): Readonly<boolean> => {
            if (!useConfig().config.sinpeMovil.enabled) return false;

            // TODO: Check if state is set and the timestamp is less than 5 minutes ago
            return !!state.phoneNumber && !!state.token;
        },
        kycLimits: (state): Readonly<UserLimits | null> => state.userLimits,
    },
    actions: {
        connect(user: Omit<SinpeMovilState, 'userLimits' | 'label'>) {
            // replace non-alphanumeric characters with spaces
            // We might show user name instead in the future
            // const label = user.label.replace(/[^a-zA-Z0-9]/g, ' ');
            // For now, we just show the service name
            const label = 'Sinpe Móvil';

            this.state = { ...user, label, userLimits: this.state.userLimits };
        },
        resetUser() {
            this.state = {
                phoneNumber: null,
                label: null,
                token: null,
                tokenTimestamp: null,
                userLimits: this.state.userLimits,
            };
        },
    },
});

import { UserLimits } from '@nimiq/fastspot-api';
import { createStore } from 'pinia';
import { useConfig } from '../composables/useConfig';

export type SinpeMovilState = {
    phoneNumber: string | null,
    label: string,
    smsApiToken: string | null,
    userLimits: UserLimits | null,
};

const defaultSinpeMovilLabel = 'Sinpe Móvil';

export const useSinpeMovilStore = createStore({
    id: 'sinpemovil',
    state: (): SinpeMovilState => ({
        phoneNumber: null,
        label: defaultSinpeMovilLabel,
        smsApiToken: null,
        userLimits: null,
    }),
    getters: {
        phoneNumber: (state): Readonly<string | null> => state.phoneNumber || '',
        label: (state): Readonly<string | null> => state.label || '',
        smsApiToken: (state): Readonly<string | null> => state.smsApiToken || '',
        initials: (state): Readonly<string | null> =>
            // Split by non-alphabetic characters (name can be), take the first character of each word and join them
            state.label?.split(/[^\p{L}]+/u).map((word) => word[0]).join('') || '',

        isUserVerified: (state): Readonly<boolean> => {
            if (!useConfig().config.sinpeMovil.enabled) return false;
            return !!state.phoneNumber && !!state.smsApiToken;
        },
        kycLimits: (state): Readonly<UserLimits | null> => state.userLimits,
    },
    actions: {
        setData(user: Omit<SinpeMovilState, 'userLimits' | 'label'>) {
            // replace non-alphanumeric characters with spaces
            // We might show user name instead in the future
            // const label = user.label.replace(/[^a-zA-Z0-9]/g, ' ');
            // For now, we just show the service name
            const label = defaultSinpeMovilLabel;

            this.state = { ...user, label, userLimits: this.state.userLimits };
        },
    },
});

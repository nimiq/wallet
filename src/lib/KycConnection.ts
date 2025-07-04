import { watch } from 'vue';
import Ten31PassApi from '@nimiq/ten31-pass-api';
import { useAccountStore } from '../stores/Account';
import { KycProvider, useKycStore } from '../stores/Kyc';
import { useConfig } from '../composables/useConfig';
import { i18n } from '../i18n/i18n-setup';

let ten31PassApi: Ten31PassApi;

export function init() {
    const { connectedUser } = useKycStore();
    const { config } = useConfig();

    ten31PassApi = new Ten31PassApi(config.ten31Pass.apiEndpoint);

    watch(connectedUser, async (user) => {
        if (!user.value) return;

        try {
            if (!await ten31PassApi.getAppGrantInfo(user.value.appGrant)) {
                // grant doesn't exist or expired
                disconnectKyc();
            }
        } catch (error) {
            console.warn(error); // eslint-disable-line no-console
        }
    });
}

export async function connectKyc(provider = KycProvider.TEN31PASS) {
    if (provider !== KycProvider.TEN31PASS) throw new Error('Unsupported KYC provider');

    const accountId = useAccountStore().activeAccountId.value;
    if (!accountId) return;

    const { config } = useConfig();
    const grantResponse = await ten31PassApi.requestGrants(config.ten31Pass.appId, undefined, true, {
        popupOverlay: {
            // Text and logo same as in @nimiq/hub-api's PopupRequest
            text: i18n.t('A popup has been opened,\nclick anywhere to bring it back to the front.') as string,
            // eslint-disable-next-line max-len
            logo: 'data:image/svg+xml,<svg width="135" height="32" viewBox="0 0 135 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35.6 14.5l-7.5-13A3 3 0 0025.5 0h-15a3 3 0 00-2.6 1.5l-7.5 13a3 3 0 000 3l7.5 13a3 3 0 002.6 1.5h15a3 3 0 002.6-1.5l7.5-13a3 3 0 000-3z" fill="url(%23hub-overlay-nimiq-logo)"/><path d="M62.25 6.5h3.26v19H63L52.75 12.25V25.5H49.5v-19H52l10.25 13.25V6.5zM72 25.5v-19h3.5v19H72zM97.75 6.5h2.75v19h-3V13.75L92.37 25.5h-2.25L85 13.75V25.5h-3v-19h2.75l6.5 14.88 6.5-14.88zM107 25.5v-19h3.5v19H107zM133.88 21.17a7.91 7.91 0 01-4.01 3.8c.16.38.94 1.44 1.52 2.05.59.6 1.2 1.23 1.98 1.86L131 30.75a15.91 15.91 0 01-4.45-5.02l-.8.02c-1.94 0-3.55-.4-4.95-1.18a7.79 7.79 0 01-3.2-3.4 11.68 11.68 0 01-1.1-5.17c0-2.03.37-3.69 1.12-5.17a7.9 7.9 0 013.2-3.4 9.8 9.8 0 014.93-1.18c1.9 0 3.55.4 4.94 1.18a7.79 7.79 0 013.2 3.4 11.23 11.23 0 011.1 5.17c0 2.03-.44 3.83-1.11 5.17zm-12.37.01a5.21 5.21 0 004.24 1.82 5.2 5.2 0 004.23-1.82c1.01-1.21 1.52-2.92 1.52-5.18 0-2.24-.5-4-1.52-5.2a5.23 5.23 0 00-4.23-1.8c-1.82 0-3.23.6-4.24 1.79-1 1.2-1.51 2.95-1.51 5.21s.5 3.97 1.51 5.18z" fill="white"/><defs><radialGradient id="hub-overlay-nimiq-logo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-35.9969 0 0 -32 36 32)"><stop stop-color="%23EC991C"/><stop offset="1" stop-color="%23E9B213"/></radialGradient></defs></svg>',
        },
    });
    if (!grantResponse) throw new Error('Didn\'t receive a grant response via postMessage');
    const appGrantDetails = await ten31PassApi.getAppGrantInfo(grantResponse.app);
    if (!appGrantDetails) throw new Error(`Unknown or expired app grant ${grantResponse.app}`);

    useKycStore().connect(accountId, {
        provider,
        appGrant: grantResponse.app,
        id: appGrantDetails.user.id,
        name: appGrantDetails.user.displayName,
    });
}

export function disconnectKyc() {
    const accountId = useAccountStore().activeAccountId.value;
    if (!accountId) return;

    useKycStore().disconnect(accountId);

    // TODO: Show notification that KYC got disconnected
}

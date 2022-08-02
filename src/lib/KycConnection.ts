import { watch } from '@vue/composition-api';
import Config from 'config';
import { useAccountStore } from '../stores/Account';
import { KycProvider, useKycStore } from '../stores/Kyc';
import { getAppGrantDetails, init as initTEN31Pass, requestAppGrant } from './TEN31Pass';

export function init() {
    initTEN31Pass(Config.ten31Pass.apiEndpoint, Config.ten31Pass.appId);

    const { connectedUser } = useKycStore();

    watch(connectedUser, async (user) => {
        if (!user) return;

        try {
            const grantDetails = await getAppGrantDetails(user.appGrant);
            if ('error' in grantDetails) {
                disconnectKyc();
            }
        } catch (error) {
            console.warn(error); // eslint-disable-line no-console
        }
    }, { lazy: false });
}

export async function connectKyc(provider = KycProvider.TEN31PASS) {
    if (provider !== KycProvider.TEN31PASS) throw new Error('Unsupported KYC provider');

    const accountId = useAccountStore().activeAccountId.value;
    if (!accountId) return;

    const appGrant = await requestAppGrant();
    const grantDetails = await getAppGrantDetails(appGrant);
    if ('error' in grantDetails) {
        throw new Error('Failed to query app grant: '
            + `${grantDetails.error}${grantDetails.message ? `: ${grantDetails.message}` : ''}`);
    }

    useKycStore().connect(accountId, {
        provider,
        appGrant,
        id: grantDetails.user.id,
        name: grantDetails.user.displayName,
    });
}

export function disconnectKyc() {
    const accountId = useAccountStore().activeAccountId.value;
    if (!accountId) return;

    useKycStore().disconnect(accountId);

    // TODO: Show notification that KYC got disconnected
}

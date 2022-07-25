import Config from 'config';
import { useAccountStore } from '../stores/Account';
import { KycProvider, useKycStore } from '../stores/Kyc';
import { getAppGrantDetails, init, requestAppGrant } from './TEN31Pass';

export async function connectKyc(provider = KycProvider.TEN31PASS) {
    if (provider !== KycProvider.TEN31PASS) throw new Error('Unsupported KYC provider');

    init(Config.TEN31Pass.apiEndpoint, Config.TEN31Pass.appId);

    const accountId = useAccountStore().activeAccountId.value;
    if (!accountId) return;

    const appGrant = await requestAppGrant();
    const grantDetails = await getAppGrantDetails(appGrant);

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
}

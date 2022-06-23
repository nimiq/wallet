import Config from 'config';
import { KycProvider, useKycStore } from '../stores/Kyc';
import { getAppGrantDetails, init, requestAppGrant } from './TEN31Pass';

export async function connectKyc(provider = KycProvider.TEN31PASS) {
    if (provider !== KycProvider.TEN31PASS) throw new Error('Unsupported KYC provider');

    init(Config.TEN31Pass.apiEndpoint, Config.TEN31Pass.appId);

    const appGrant = await requestAppGrant();
    const grantDetails = await getAppGrantDetails(appGrant);

    useKycStore().connect({
        provider,
        appGrant,
        id: grantDetails.user.id,
        name: grantDetails.user.displayName,
    });
}

export function disconnectKyc() {
    useKycStore().disconnect();
}

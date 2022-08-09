import { watch } from '@vue/composition-api';
import Ten31PassApi from '@nimiq/ten31-pass-api';
import Config from 'config';
import { useAccountStore } from '../stores/Account';
import { KycProvider, useKycStore } from '../stores/Kyc';

let ten31PassApi: Ten31PassApi;

export function init() {
    ten31PassApi = new Ten31PassApi(Config.ten31Pass.apiEndpoint);

    const { connectedUser } = useKycStore();

    watch(connectedUser, async (user) => {
        if (!user) return;

        try {
            if (!await ten31PassApi.getAppGrantInfo(user.appGrant)) {
                // grant doesn't exist or expired
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

    const grantResponse = await ten31PassApi.requestGrants(Config.ten31Pass.appId);
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

// Swap kyc handler that handles TEN31 Pass KYC and forwards the result to hub create-swap request.
// We invoke TEN31 Pass and the Nimiq Hub via redirects in this single wallet popup to avoid having to open separate
// popups for TEN31 Pass and the Hub.
// As sessionStorage is sand-boxed for separate windows, we use it here for storing the request and intermediary results
// to still be available on reloads and after returning from redirects, without affecting the Wallet main window and
// potential other Wallet windows or swaps. However, for the case that the wallet is configured to use redirects, we
// still clear the swap kyc handler storage after requests.

import type VueI18n from 'vue-i18n';
import HubApi, { SetupSwapRequest, SetupSwapResult } from '@nimiq/hub-api';
import { BehaviorType } from '@nimiq/hub-api/dist/src/RequestBehavior.d';
import Ten31PassApi, { GrantResponse, ResponseType, ServiceRequest } from '@nimiq/ten31-pass-api';
import { ResponseStatus, RpcServer, State as RpcServerState } from '@nimiq/rpc';
import { FormattableNumber } from '@nimiq/utils';
import Config from 'config'; // Not using useConfig composable because we try to avoid Vue as dependency here.
import { KycProvider, KycUser } from './stores/Kyc';
import { i18n, detectLanguage, loadLanguage } from './i18n/i18n-setup';
import { isFiatAsset } from './stores/Swaps';

export interface SetupSwapWithKycResult extends SetupSwapResult {
    kyc: {
        provider: KycProvider.TEN31PASS,
        s3GrantToken: string, // JWT token representing the S3 service grant
        oasisGrantToken?: string, // JWT token representing the OASIS service grant
    };
}

interface KycResponse {
    provider: KycProvider.TEN31PASS;
    grantResponse: GrantResponse;
    s3GrantToken: string;
    oasisGrantToken?: string;
}

interface SwapKycHandlerStorage {
    rpcServerState?: string;
    request?: SetupSwapRequest;
    kycUser?: KycUser;
    kycResponse?: KycResponse;
}

export type SWAP_KYC_HANDLER_STORAGE_KEY = 'wallet-swap-kyc-handler';
const SWAP_KYC_HANDLER_STORAGE_KEY: SWAP_KYC_HANDLER_STORAGE_KEY = 'wallet-swap-kyc-handler';

function readSwapKycHandlerStorage(): [RpcServerState?, SetupSwapRequest?, KycUser?, KycResponse?] {
    try {
        const swapKycHandlerStorageJson = sessionStorage[SWAP_KYC_HANDLER_STORAGE_KEY] || '{}';
        const swapKycHandlerStorage: SwapKycHandlerStorage = JSON.parse(swapKycHandlerStorageJson);
        return [
            swapKycHandlerStorage.rpcServerState
                ? RpcServerState.fromJSON(swapKycHandlerStorage.rpcServerState)
                : undefined,
            swapKycHandlerStorage.request,
            swapKycHandlerStorage.kycUser,
            swapKycHandlerStorage.kycResponse,
        ];
    } catch (e) {
        return [];
    }
}

function writeSwapKycHandlerStorage(
    rpcServerState?: RpcServerState,
    request?: SetupSwapRequest,
    kycUser?: KycUser,
    kycResponse?: KycResponse,
) {
    const swapKycHandlerStorage: SwapKycHandlerStorage = {
        rpcServerState: rpcServerState ? rpcServerState.toJSON() : undefined,
        request,
        kycUser,
        kycResponse,
    };
    sessionStorage[SWAP_KYC_HANDLER_STORAGE_KEY] = JSON.stringify(swapKycHandlerStorage);
}

function clearSwapKycHandlerStorage() {
    sessionStorage.removeItem(SWAP_KYC_HANDLER_STORAGE_KEY);
}

function toDecimalString(amount: number, decimals: number): string {
    // Convert to decimal string without the risk of potential floating division imprecision occurring
    return new FormattableNumber(amount).moveDecimalSeparator(-1 * decimals).toString();
}

// For translating error messages which get displayed in the UI.
// Translate on a best effort basis; if language file has not been loaded yet, return a fallback. The method is called
// $t such that source strings in calls to it get detected by our webpack-i18n-tools extractor. It's essentially the
// same as VueI18n's $t but extended by the fallback string which will be returned if the language file has not been
// loaded yet. Note that we're not just using the key as fallback because, webpack-i18n-tools optimizes these away to be
// just simple index numbers.
loadLanguage(detectLanguage());
i18n.missing = () => ''; // don't return index numbers before language loaded; same as set in i18n-setup for production
function $t(key: VueI18n.Path, fallback: string): string;
function $t(key: VueI18n.Path, values: VueI18n.Values, fallback: string): string;
function $t(key: VueI18n.Path, valuesOrFallback: VueI18n.Values | string, fallback?: string): string {
    return i18n.t(key, typeof valuesOrFallback !== 'string' ? valuesOrFallback : undefined) as string
        // The translation was missing and i18n.t returned an empty string as configured by i18n.missing
        || (typeof valuesOrFallback === 'string' ? valuesOrFallback : fallback!);
}

async function run() {
    let rpcServerState: RpcServerState | undefined;
    let request: SetupSwapRequest | undefined;
    let kycUser: KycUser | undefined;
    let kycResponse: KycResponse | undefined;
    try {
        [rpcServerState, request, kycUser, kycResponse] = readSwapKycHandlerStorage();

        // Listen for initial request if not known yet.
        if (!rpcServerState || !request || !kycUser) {
            [rpcServerState, request, kycUser] = await new Promise<[RpcServerState, SetupSwapRequest, KycUser]>((
                resolve,
                reject,
            ) => {
                const rpcServer = new RpcServer(/* allowed origins */ window.location.origin);
                // no need to parse/validate the request as we are the only allowed origin
                rpcServer.onRequest(HubApi.RequestType.SETUP_SWAP, (state, req, user) => resolve([state, req, user]));
                rpcServer.init(/* onClientTimeout */ () =>
                    reject(new Error($t('No request received.', 'No request received.'))));
            });
            writeSwapKycHandlerStorage(rpcServerState, request, kycUser, kycResponse);
        }

        // Request TEN31 Pass grants or check for TEN31 Pass redirect response.
        if (kycUser.provider === KycProvider.TEN31PASS) {
            const ten31PassApi = new Ten31PassApi(Config.ten31Pass.apiEndpoint);
            const grantResponse = ten31PassApi.getRedirectGrantResponse()?.response;
            const s3ServiceId = Config.ten31Pass.services.s3.serviceId;
            const oasisServiceId = Config.ten31Pass.services.oasis.serviceId;
            // console.log('Swap kyc handler TEN31 Pass response referrer', document.referrer); // eslint-disable-line

            // Request grants if we didn't get them yet.
            if (!kycResponse && !grantResponse) {
                // Note that all amounts in the grants refer to the values S3 initially gave us on createSwap. As the
                // Hub partially operates on different values, we need to revert this preprocessing here that the Wallet
                // did on the original values. More specifically, we want to get the original swapSuggestion values back
                // that were modified in the hubRequest in SwapModal, BuyCryptoModal and SellCryptoModal.
                const serviceRequests: ServiceRequest[] = [{
                    serviceId: s3ServiceId,
                    usages: [{
                        usageId: Config.ten31Pass.services.s3.usageIds.swap,
                        parameters: {
                            from_amount: (() => {
                                switch (request.fund.type) {
                                    case 'NIM': return toDecimalString(request.fund.value, 5);
                                    case 'BTC': return toDecimalString(request.fund.output.value, 8);
                                    case 'EUR': return toDecimalString(request.fund.value + request.fund.fee, 2);
                                    case 'CRC': return toDecimalString(request.fund.value + request.fund.fee, 0);
                                    default: throw new Error($t('Unsupported currency', 'Unsupported currency'));
                                }
                            })(),
                            from_asset: request.fund.type,
                            to_amount: (() => {
                                switch (request.redeem.type) {
                                    case 'NIM': return toDecimalString(request.redeem.value + request.redeem.fee, 5);
                                    case 'BTC': return toDecimalString(request.redeem.input.value, 8);
                                    case 'EUR': return toDecimalString(request.redeem.value, 2);
                                    case 'CRC': return toDecimalString(request.redeem.value, 0);
                                    default: throw new Error($t('Unsupported currency', 'Unsupported currency'));
                                }
                            })(),
                            to_asset: request.redeem.type,
                            id: request.swapId,
                        },
                    }],
                }];
                if (request.fund.type === 'EUR') {
                    serviceRequests.push({
                        serviceId: oasisServiceId,
                        usages: [{
                            usageId: Config.ten31Pass.services.oasis.usageIds.clearing,
                            parameters: {
                                amount: request.fund.value + request.fund.fee,
                            },
                        }],
                    });
                } else if (request.redeem.type === 'EUR') {
                    serviceRequests.push({
                        serviceId: oasisServiceId,
                        usages: [{
                            usageId: Config.ten31Pass.services.oasis.usageIds.settling,
                            parameters: {
                                amount: request.redeem.value,
                            },
                        }],
                    });
                }
                // Redirect to TEN31 Pass.
                await ten31PassApi.requestGrants(
                    Config.ten31Pass.appId,
                    serviceRequests,
                    /* asPopup */ false,
                    {
                        preferredResponseType: ResponseType.IMMEDIATE_REDIRECT,
                    },
                );
                return;
            }

            // Process and store new or changed grantResponse (for the case that the user navigated back and gave grants
            // again). If we just got the same grantResponse we already know, we don't want to process it again. We can
            // simply base the equality check on the json representation, as for same grant responses also the order of
            // object entries should be the same.
            const isChangedGrantResponse = JSON.stringify(grantResponse) !== JSON.stringify(kycResponse?.grantResponse);
            if (grantResponse && (!kycResponse || isChangedGrantResponse)) {
                const s3Grant = grantResponse.services[s3ServiceId];
                const oasisGrant = grantResponse.services[oasisServiceId];
                const isOasisSwap = isFiatAsset(request.fund.type) || isFiatAsset(request.redeem.type);
                if (!s3Grant || (isOasisSwap && !oasisGrant)) {
                    throw new Error($t(
                        'TEN31 Pass didn\'t return expected grants.',
                        'TEN31 Pass didn\'t return expected grants.',
                    ));
                }
                if (grantResponse.app !== kycUser.appGrant) {
                    throw new Error($t(
                        'Unexpected user. This account is currently connected to the TEN31 Pass of {userName}.',
                        { userName: kycUser.name },
                        `Unexpected user. This account is currently connected to the TEN31 Pass of ${kycUser.name}.`,
                    ));
                }
                const [s3GrantToken, oasisGrantToken] = await Promise.all([
                    ten31PassApi.getServiceGrantInfo(s3Grant),
                    oasisGrant ? ten31PassApi.getServiceGrantInfo(oasisGrant) : Promise.resolve(null),
                ].map((serviveGrantPromise) => serviveGrantPromise.then((serviceGrant) => serviceGrant?.token)));
                if (!s3GrantToken || (isOasisSwap && !oasisGrantToken)) {
                    throw new Error($t(
                        'TEN31 Pass didn\'t return expected grants.',
                        'TEN31 Pass didn\'t return expected grants.',
                    ));
                }
                kycResponse = {
                    provider: KycProvider.TEN31PASS,
                    grantResponse,
                    s3GrantToken,
                    oasisGrantToken,
                };
                writeSwapKycHandlerStorage(rpcServerState, request, kycUser, kycResponse);
            } else if (!kycResponse) {
                // This can't happen based on the checks above. This is just a type guard for typescript.
                throw new Error('Unexpected');
            }
        } else {
            throw new Error($t(
                'Unsupported KYC provider {provider}.',
                { provider: kycUser.provider },
                `Unsupported KYC provider ${kycUser.provider}.`,
            ));
        }

        // Launch Hub swap creation flow or check for Hub redirect response.
        const hubApi = new HubApi(Config.hubEndpoint);
        const setupSwapResult = await new Promise<SetupSwapResult | undefined>((resolve, reject) => {
            // triggered by checkRedirectResponse if there is a response
            hubApi.on(HubApi.RequestType.SETUP_SWAP, resolve, reject);
            hubApi.checkRedirectResponse().then(() => resolve(undefined));
        });
        // Redirect to Hub if we didn't get the hub response yet.
        if (!setupSwapResult) {
            await hubApi.setupSwap<BehaviorType.REDIRECT>({
                ...request,
                kyc: {
                    ...kycResponse,
                    userId: kycUser.id,
                },
            }, new HubApi.RedirectRequestBehavior());
            return;
        }

        // Return result
        const setupSwapWithKycResult: SetupSwapWithKycResult = {
            ...setupSwapResult,
            kyc: kycResponse,
        };
        clearSwapKycHandlerStorage();
        rpcServerState.reply(ResponseStatus.OK, setupSwapWithKycResult);
    } catch (e: any) {
        clearSwapKycHandlerStorage();
        if (rpcServerState) {
            rpcServerState.reply(ResponseStatus.ERROR, e);
        } else if (window.opener) {
            // Can't report error as we don't know the request id. Display a good old alert.
            alert($t( // eslint-disable-line no-alert
                'An error occurred: {message}',
                { message: e.message || e },
                `An error occurred: ${e.message || e}`,
            ));
            window.close();
        } else {
            // We're in fact not a popup but were opened by hub.ts as redirect. Go back to Wallet main UI.
            window.location.assign(window.location.origin);
        }
    }
}
run();

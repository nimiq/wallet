// Swap kyc handler that handles TEN31 Pass KYC and forwards the result to hub create-swap request.
// We invoke TEN31 Pass and the Nimiq Hub via redirects in this single wallet popup to avoid having to open separate
// popups for TEN31 Pass and the Hub.
// As sessionStorage is sand-boxed for separate windows, we use it here for storing the request and intermediary results
// to still be available on reloads and after returning from redirects, without affecting the Wallet main window and
// potential other Wallet windows or swaps.

import HubApi, { SetupSwapRequest, SetupSwapResult } from '@nimiq/hub-api';
import { BehaviorType } from '@nimiq/hub-api/dist/src/client/RequestBehavior.d';
import Ten31PassApi, { GrantResponse, ResponseType, ServiceRequest } from '@nimiq/ten31-pass-api';
import { ResponseStatus, RpcServer, State as RpcServerState } from '@nimiq/rpc';
import Config from 'config';
import { KycProvider } from './stores/Kyc';

export interface SetupSwapWithKycRequest extends Omit<SetupSwapRequest, 'kyc'> {
    kyc: {
        provider: KycProvider.TEN31PASS,
        userId: string,
    };
}

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
    request?: SetupSwapWithKycRequest;
    kycResponse?: KycResponse;
}

const SWAP_KYC_HANDLER_STORAGE_KEY = 'wallet-swap-kyc-handler';

function readSwapKycHandlerStorage(): [RpcServerState?, SetupSwapWithKycRequest?, KycResponse?] {
    try {
        const swapKycHandlerStorageJson = sessionStorage[SWAP_KYC_HANDLER_STORAGE_KEY] || '{}';
        const swapKycHandlerStorage: SwapKycHandlerStorage = JSON.parse(swapKycHandlerStorageJson);
        return [
            swapKycHandlerStorage.rpcServerState
                ? RpcServerState.fromJSON(swapKycHandlerStorage.rpcServerState)
                : undefined,
            swapKycHandlerStorage.request,
            swapKycHandlerStorage.kycResponse,
        ];
    } catch (e) {
        return [];
    }
}

function writeSwapKycHandlerStorage(
    rpcServerState?: RpcServerState,
    request?: SetupSwapWithKycRequest,
    kycResponse?: KycResponse,
) {
    const swapKycHandlerStorage: SwapKycHandlerStorage = {
        rpcServerState: rpcServerState ? rpcServerState.toJSON() : undefined,
        request,
        kycResponse,
    };
    sessionStorage[SWAP_KYC_HANDLER_STORAGE_KEY] = JSON.stringify(swapKycHandlerStorage);
}

async function run() {
    let rpcServerState: RpcServerState | undefined;
    let request: SetupSwapWithKycRequest | undefined;
    let kycResponse: KycResponse | undefined;
    try {
        [rpcServerState, request, kycResponse] = readSwapKycHandlerStorage();

        // Listen for initial request if not known yet.
        if (!rpcServerState || !request) {
            [rpcServerState, request] = await new Promise<[RpcServerState, SetupSwapWithKycRequest]>((res, rej) => {
                const rpcServer = new RpcServer(/* allowed origins */ window.location.origin);
                // no need to parse/validate the request as we are the only allowed origin
                rpcServer.onRequest(HubApi.RequestType.SETUP_SWAP, (state, req) => res([state, req]));
                rpcServer.init(/* onClientTimeout */ () => rej(new Error('No request received.')));
            });
            writeSwapKycHandlerStorage(rpcServerState, request, kycResponse);
        }

        // Request TEN31 Pass grants or check for TEN31 Pass redirect response.
        if (request.kyc.provider === KycProvider.TEN31PASS) {
            const ten31PassApi = new Ten31PassApi(Config.ten31Pass.apiEndpoint);
            const grantResponse = ten31PassApi.getRedirectGrantResponse()?.response;
            const s3ServiceId = Config.ten31Pass.services.s3.serviceId;
            const oasisServiceId = Config.ten31Pass.services.oasis.serviceId;
            // console.log('Swap kyc handler TEN31 Pass response referrer', document.referrer); // eslint-disable-line

            if (!kycResponse && !grantResponse) {
                // Request grants.
                const serviceRequests: ServiceRequest[] = [{
                    serviceId: s3ServiceId,
                    usages: [{
                        usageId: Config.ten31Pass.services.s3.usageIds.swap,
                        parameters: {
                            from_amount: request.fund.type === 'NIM' ? request.fund.value
                                : request.fund.type === 'BTC' ? request.fund.output.value
                                    : request.fund.value,
                            from_asset: request.fund.type,
                            to_amount: request.redeem.type === 'NIM' ? request.redeem.value
                                : request.redeem.type === 'BTC' ? request.redeem.output.value
                                    : request.redeem.value,
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
                                amount: request.fund.value,
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
                    ResponseType.IMMEDIATE_REDIRECT,
                );
                return;
            }

            const isChangedGrantResponse = JSON.stringify(grantResponse) !== JSON.stringify(kycResponse?.grantResponse);
            if (grantResponse && (!kycResponse || isChangedGrantResponse)) {
                // Process and store new or changed grantResponse (for the case that the user navigated back and gave
                // grants again). If we just got the same grantResponse we already know, we don't want to process it
                // again. We can simply base the equality check on the json representation, as for same grant responses
                // also the order of object entries should be the same.
                const s3Grant = grantResponse.services[s3ServiceId];
                const oasisGrant = grantResponse.services[oasisServiceId];
                const isOasisSwap = request.fund.type === 'EUR' || request.redeem.type === 'EUR';
                if (!s3Grant || (isOasisSwap && !oasisGrant)) {
                    throw new Error('TEN31 Pass didn\'t return expected grants.');
                }
                const [appGrant, s3GrantToken, oasisGrantToken] = await Promise.all([
                    ten31PassApi.getAppGrantInfo(grantResponse.app),
                    ...[
                        ten31PassApi.getServiceGrantInfo(s3Grant),
                        oasisGrant ? ten31PassApi.getServiceGrantInfo(oasisGrant) : Promise.resolve(null),
                    ].map((serviveGrantPromise) => serviveGrantPromise.then((serviceGrant) => serviceGrant?.token)),
                ]);
                if (!appGrant || !s3GrantToken || (isOasisSwap && !oasisGrantToken)) {
                    throw new Error('TEN31 Pass didn\'t return expected grants.');
                }
                if (appGrant.user.id !== request.kyc.userId) {
                    throw new Error(`Unexpected TEN31 Pass user ${appGrant.user.displayName}.`);
                }
                kycResponse = {
                    provider: KycProvider.TEN31PASS,
                    grantResponse,
                    s3GrantToken,
                    oasisGrantToken,
                };
                writeSwapKycHandlerStorage(rpcServerState, request, kycResponse);
            } else if (!kycResponse) {
                // This can't happen based on the checks above. This is just a type guard for typescript.
                throw new Error('Unexpected');
            }
        } else {
            throw new Error(`Unsupported KYC provider ${request.kyc.provider}`);
        }

        // Launch Hub swap creation flow or check for Hub redirect response.
        const hubApi = new HubApi(Config.hubEndpoint);
        const setupSwapResult = await new Promise<SetupSwapResult | undefined>((resolve, reject) => {
            // triggered by checkRedirectResponse if there is a response
            hubApi.on(HubApi.RequestType.SETUP_SWAP, resolve, reject);
            hubApi.checkRedirectResponse().then(() => resolve(undefined));
        });
        if (!setupSwapResult) {
            // Redirect to Hub.
            await hubApi.setupSwap<BehaviorType.REDIRECT>({
                ...request,
                kyc: {
                    ...kycResponse,
                    userId: request.kyc.userId,
                },
            }, new HubApi.RedirectRequestBehavior());
            return;
        }

        // Return result
        const setupSwapWithKycResult: SetupSwapWithKycResult = {
            ...setupSwapResult,
            kyc: kycResponse,
        };
        rpcServerState.reply(ResponseStatus.OK, setupSwapWithKycResult);
    } catch (e: any) {
        if (rpcServerState) {
            rpcServerState.reply(ResponseStatus.ERROR, e);
        } else if (window.opener) {
            // Can't report error as we don't know the request id. Display a good old alert.
            alert(`An error occurred: ${e.message || e}.`); // eslint-disable-line no-alert
            window.close();
        } else {
            // We're in fact not a popup but were opened by hub.ts as redirect. Go back to Wallet main UI.
            window.location.assign(window.location.origin);
        }
    }
}
run();

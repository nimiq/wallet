/* eslint-disable max-len, no-console, no-async-promise-executor */
import HubApi, { SetupSwapResult } from '@nimiq/hub-api';
import { ignoreHubRequests } from './DemoConstants';
import { addOngoingSwap } from './DemoSwaps';

interface SetupSwapArgs {
    accountId: string;
    swapId: string;
    fund: {
        type: 'BTC' | 'NIM' /* | 'USDC' | 'USDT' */,
        inputs: {
            address: string,
            transactionHash: string,
            outputIndex: number,
            outputScript: string,
            value: number,
        }[],
        output: {
            value: number,
        },
        changeOutput: {
            address: string,
            value: number,
        },
        refundAddress: string,
    };
    redeem: {
        type: 'BTC' | 'NIM' /* | 'USDC' | 'USDT' */,
        recipient: string,
        value: number,
        fee: number,
        validityStartHeight: number,
    };
    fundingFiatRate: number;
    redeemingFiatRate: number;
    fundFees: {
        processing: number,
        redeeming: number,
    };
    redeemFees: {
        funding: number,
        processing: number,
    };
    serviceSwapFee: number;
    nimiqAddresses: {
        address: string,
        balance: number,
    }[];
    polygonAddresses: {
        address: string,
        usdcBalance: number,
        usdtBalance: number,
    }[];
}

/**
 * Mock Hub API that redirects calls to demo modals instead of real Hub.
 */
export class DemoHubApi extends HubApi {
    static create(): DemoHubApi {
        const instance = new DemoHubApi();
        return new Proxy(instance, {
            get(target, prop: keyof HubApi) {
                if (typeof target[prop] !== 'function') {
                    return target[prop];
                }

                return async (...args: Parameters<HubApi[typeof prop]>) => new Promise(async (resolveInterceptedAction) => {
                    const requestName = String(prop);
                    const [firstArg] = args;
                    console.warn(`[Demo] Mocking Hub call: ${requestName}("${firstArg}")`);

                    if (ignoreHubRequests.includes(requestName)) {
                        return;
                    }

                    if (requestName === 'setupSwap') {
                        const swap = await firstArg as SetupSwapArgs;
                        const signerTransaction: SetupSwapResult = {
                            nim: {
                                transaction: new Uint8Array(),
                                serializedTx: '0172720036a3b2ca9e0de8b369e6381753ebef945a020091fa7bbddf959616767c50c50962c9e056ade9c400000000000000989680000000000000000000c3e23d0500a60100010366687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f292520000000000000000000000000000000000000000000000000000000000000000000200demoSerializedTx',
                                hash: '6c58b337a907fe000demoTxHash8a1f4ab4fdc0f69b1e582f',
                                raw: {
                                    signerPublicKey: new Uint8Array(),
                                    signature: new Uint8Array(),
                                    sender: 'NQ86 D3M0 SW4P NB59 U3F8 NDLX CE0P AFMX Y52S',
                                    senderType: 2,
                                    recipient: swap.redeem.recipient,
                                    recipientType: 0,
                                    value: swap.redeem.value,
                                    fee: 0,
                                    validityStartHeight: swap.redeem.validityStartHeight,
                                    extraData: new Uint8Array(),
                                    flags: 0,
                                    networkId: 5,
                                    proof: new Uint8Array(),
                                },
                            },
                            btc: {
                                serializedTx: '0200000000010168c8952af998f2c68412a848a72d1f9b0b7ff27417df1cb85514c97474b51ba40000000000ffffffff026515000000000000220020bf0ffdd2ffb9a579973455cfe9b56515538b79361d5ae8a4d255dea2519ef77864c501000000000016001428257447efe2d254ce850ea2760274d233d86e5c024730440220792fa932d9d0591e3c5eb03f47d05912a1e21f3e76d169e383af66e47896ac8c02205947df5523490e4138f2da0fc5c9da3039750fe43bd217b68d26730fdcae7fbe012102ef8d4b51d1a075e67d62baa78991d5fc36a658fec28d8b978826058168ed2a1a00000000',
                                hash: '3090808993a796c26a614f5a4a36a48e0b4af6cd3e28e39f3f006e9a447da2b3',
                            },
                            refundTx: '02000000000101b3a27d449a6e003f9fe3283ecdf64a0b8ea4364a5a4f616ac296a793898090300000000000feffffff011e020000000000001600146d2146bb49f6d1de6b4f14e0a8074c79b887cef50447304402202a7dce2e39cf86ee1d7c1e9cc55f1e0fb26932fd22e5437e5e5804a9e5d220b1022031aa177ea085c10c4d54b2f5aa528aac0013b67f9ee674070aa2fb51894de80e0121025b4d40682bbcb5456a9d658971b725666a3cccaa2fb45d269d2f1486bf85b3c000636382012088a820be8719b9427f1551c4234f8b02d8f8aa055ae282b2e9eef6c155326ae951061f8876a914e546b01d8c9d9bf35f9f115132ce8eab7191a68d88ac67046716ca67b17576a9146d2146bb49f6d1de6b4f14e0a8074c79b887cef588ac686816ca67',
                        };

                        // Add to onGoingSwaps map
                        addOngoingSwap(swap.swapId, swap);

                        resolveInterceptedAction(signerTransaction);
                        return;
                    }

                    // For any other Hub API method, redirect to the demo fallback modal
                    console.log('[Demo] Redirecting to fallback modal');
                    // This would need access to the router, which would be passed in during initialization
                    // For now, we'll resolve with undefined and let the UI handle it
                    resolveInterceptedAction(undefined);
                });
            },
        });
    }
}

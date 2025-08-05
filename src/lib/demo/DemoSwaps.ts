import {
    FastspotAsset,
    FastspotLimits,
    FastspotUserLimits,
    ReferenceAsset,
    SwapAsset,
    SwapStatus,
} from '@nimiq/fastspot-api';
import Config from 'config';
import { useAccountStore } from '@/stores/Account';
import { SwapState, useSwapsStore } from '@/stores/Swaps';
import { useFiatStore } from '@/stores/Fiat';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { completeSwapTransactions } from './DemoTransactions';
import { demoBtcAddress } from './DemoConstants';

// Track ongoing swaps
const onGoingSwaps = new Map<string, SetupSwapArgs>();

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
 * Intercepts fetch request for swaps
 */
export function interceptFetchRequest(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
        if (typeof args[0] !== 'string') return originalFetch(...args);
        if (args[0].startsWith('/')) return originalFetch(...args);

        const url = new URL(args[0] as string);
        const isFastspotRequest = url.host === (new URL(Config.fastspot.apiEndpoint).host);
        const isLimitsRequest = url.pathname.includes('/limits');
        const isAssetsRequest = url.pathname.includes('/assets');
        const isSwapRequest = url.pathname.includes('/swaps');

        // return originalFetch(...args);
        if (!isFastspotRequest) {
            return originalFetch(...args);
        }

        console.log('[Demo] Intercepted fetch request:', url.pathname);

        if (isLimitsRequest) {
            const constants = {
                current: '9800',
                daily: '50000',
                dailyRemaining: '49000',
                monthly: '100000',
                monthlyRemaining: '98000',
                swap: '10000',
            } as const;

            const [assetOrLimit] = url.pathname.split('/').slice(-2) as [SwapAsset | 'limits', string];

            if (assetOrLimit === 'limits') {
                const limits: FastspotUserLimits = {
                    asset: ReferenceAsset.USD,
                    ...constants,
                };
                return new Response(JSON.stringify(limits));
            }

            const asset = assetOrLimit as SwapAsset;

            const { exchangeRates, currency } = useFiatStore();
            const rate: number = exchangeRates.value[asset.toLocaleLowerCase().split('_')[0]][currency.value]!;

            const json: FastspotLimits<SwapAsset> = {
                asset,
                referenceAsset: ReferenceAsset.USD,
                referenceCurrent: constants.current,
                referenceDaily: constants.daily,
                referenceDailyRemaining: constants.dailyRemaining,
                referenceMonthly: constants.monthly,
                referenceMonthlyRemaining: constants.monthlyRemaining,
                referenceSwap: `${10000}`,
                current: `${Number(constants.current) / rate}`,
                daily: `${Number(constants.daily) / rate}`,
                dailyRemaining: `${Number(constants.dailyRemaining) / rate}`,
                monthly: `${Number(constants.monthly) / rate}`,
                monthlyRemaining: `${Number(constants.monthlyRemaining) / rate}`,
                swap: `${Number(constants.swap) / rate}`,
            };

            return new Response(JSON.stringify(json));
        }

        if (isAssetsRequest) {
            // Return mock assets data with fees for all supported assets
            const json: FastspotAsset[] = [
                {
                    symbol: SwapAsset.BTC,
                    name: 'Bitcoin',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.BTC)}`,
                    limits: { minimum: '0.0001', maximum: '1' },
                },
                {
                    symbol: SwapAsset.NIM,
                    name: 'Nimiq',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.NIM)}`,
                    limits: { minimum: '1', maximum: '100000' },
                },
                {
                    symbol: SwapAsset.USDC_MATIC,
                    name: 'USDC (Polygon)',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.USDC_MATIC)}`,
                    limits: { minimum: '1', maximum: '100000' },
                },
                {
                    symbol: SwapAsset.USDT_MATIC,
                    name: 'USDT (Polygon)',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.USDT_MATIC)}`,
                    limits: { minimum: '1', maximum: '100000' },
                },
            ];

            return new Response(JSON.stringify(json));
        }

        if (isSwapRequest) {
            const swapId = url.pathname.split('/').slice(-1)[0];

            if (swapId === 'swaps') {
                const { patchAccount, activeAccountInfo } = useAccountStore();
                const newBtcAddress = demoBtcAddress + Math.random().toString(36).slice(2, 9);

                patchAccount(activeAccountInfo.value?.id, {
                    ...activeAccountInfo,
                    btcAddresses: {
                        external: [...(activeAccountInfo.value?.btcAddresses.external || []), newBtcAddress],
                        internal: [...(activeAccountInfo.value?.btcAddresses.internal || []), newBtcAddress],
                    },
                });

                const { addAddressInfos } = useBtcAddressStore();
                addAddressInfos([{
                    address: newBtcAddress,
                    txoCount: 0, // Total number of outputs received
                    utxos: [],
                }]);
            } else {
                listenForSwapChanges();

                console.log('[Demo] Swap request:', swapId);
                const swap = onGoingSwaps.get(swapId);
                if (!swap) {
                    return new Response(JSON.stringify({
                        error: 'Swap not found',
                        status: 404,
                    }), { status: 404 });
                }

                console.log('[Demo] Swap:', swap);
                const expirationTimestamp = Math.floor(Date.now() / 1000) + 3600;

                return new Response(JSON.stringify({
                    id: swapId,
                    status: SwapStatus.WAITING_FOR_CONFIRMATION,
                    expires: expirationTimestamp,
                    info: {
                        from: [
                            {
                                symbol: swap.fund.type,
                                amount: swap.fund.output.value / 1e8,
                                fundingNetworkFee: {
                                    total: '0.000037',
                                    perUnit: '0.000000240254',
                                    totalIsIncluded: true,
                                },
                                operatingNetworkFee: {
                                    total: '0',
                                    perUnit: '0.000000240254',
                                    totalIsIncluded: false,
                                },
                                finalizeNetworkFee: {
                                    total: '0.0000346',
                                    perUnit: '0.000000240254',
                                    totalIsIncluded: false,
                                },
                            },
                        ],
                        to: [
                            {
                                symbol: swap.redeem.type,
                                amount: swap.redeem.value / 1e5,
                                fundingNetworkFee: {
                                    total: '0',
                                    perUnit: '0',
                                    totalIsIncluded: false,
                                },
                                operatingNetworkFee: {
                                    total: '0',
                                    perUnit: '0',
                                    totalIsIncluded: false,
                                },
                                finalizeNetworkFee: {
                                    total: '0',
                                    perUnit: '0',
                                    totalIsIncluded: false,
                                },
                            },
                        ],
                        serviceFeePercentage: 0.0025,
                        direction: 'reverse',
                    },
                    hash: '946dc06baf94ee49a1bd026eff8eb4f30d34c9e162211667dbebd5a5282e6294',
                    contracts: [
                        {
                            asset: swap.fund.type,
                            refund: {
                                address: swap.fund.refundAddress,
                            },
                            recipient: {
                                address: swap.fund.refundAddress,
                            },
                            amount: swap.fund.output.value,
                            timeout: expirationTimestamp,
                            direction: 'send',
                            status: 'pending',
                            id: '2MzQo4ehDrSEsxX7RnysLL6VePD3tuNyx4M',
                            intermediary: {},
                        },
                        {
                            asset: swap.redeem.type,
                            refund: {
                                address: swap.redeem.recipient,
                            },
                            recipient: {
                                address: swap.redeem.recipient,
                            },
                            amount: swap.redeem.value,
                            timeout: expirationTimestamp,
                            direction: 'receive',
                            status: 'pending',
                            id: 'eff8a1a5-4f4e-3895-b95c-fd5a40c99001',
                            intermediary: {},
                        },
                    ],
                }));
            }
        }

        return originalFetch(...args);
    };
}

/**
 * Fee per unit helper function
 */
function getNetworkFeePerUnit(asset: string): number {
    switch (asset) {
        case SwapAsset.BTC:
            return Math.floor(Math.random() * 100) / 1e8; // 1 - 100 sats/vbyte
        case SwapAsset.NIM:
            return 0; // luna per byte
        case SwapAsset.USDC_MATIC:
        case SwapAsset.USDT_MATIC:
            return 1000000000; // 1 Gwei
        default:
            return 0;
    }
}

let swapInterval: NodeJS.Timeout | null = null;

export function listenForSwapChanges(): void {
    if (swapInterval) return;
    swapInterval = setInterval(() => {
        // Check if there are any active swaps that need to be processed
        const swap = useSwapsStore().activeSwap.value;
        if (!swap) return;
        console.log('[Demo] Active swap:', { swap, state: swap.state });
        switch (swap.state) {
            case SwapState.AWAIT_INCOMING:
                console.log('[Demo] Swap is in AWAIT_INCOMING state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.CREATE_OUTGOING,
                });
                break;
            case SwapState.CREATE_OUTGOING:
                console.log('[Demo] Swap is in CREATE_OUTGOING state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.AWAIT_SECRET,
                });
                break;
            case SwapState.AWAIT_SECRET:
                console.log('[Demo] Swap is in AWAIT_SECRET state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.SETTLE_INCOMING,
                });
                break;
            case SwapState.SETTLE_INCOMING:
                console.log('[Demo] Swap is in SETTLE_INCOMING state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.COMPLETE,
                });
                completeSwap(swap);
                break;
            case SwapState.COMPLETE:
                console.log('[Demo] Swap is in COMPLETE state');
                if (swapInterval) clearInterval(swapInterval);
                swapInterval = null;
                break;
            default:
                console.log('[Demo] Swap is in unknown state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.AWAIT_INCOMING,
                });
                break;
        }
    }, 1_800);
}

/**
 * Completes an active swap by creating transactions for both sides of the swap
 */
function completeSwap(activeSwap: any): void {
    // Add transactions for both sides of the swap
    const fromAsset = activeSwap.from.asset;
    const toAsset = activeSwap.to.asset;
    const fromAmount = activeSwap.from.amount;
    const toAmount = activeSwap.to.amount;

    // Use the consolidated transaction creation function
    completeSwapTransactions(fromAsset, fromAmount, toAsset, toAmount);

    console.log('[Demo] Swap completed:', { fromAsset, toAsset, fromAmount, toAmount });
}

export function addOngoingSwap(swapId: string, swapArgs: SetupSwapArgs): void {
    onGoingSwaps.set(swapId, swapArgs);
}

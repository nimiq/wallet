import type { PlainTransactionDetails } from '@nimiq/core';
import { createStore } from 'pinia';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { Swap as SwapObject, SwapAsset, getContract } from '@nimiq/fastspot-api';
import { DeniedReason, Htlc as OasisHtlc, SepaClearingInstruction, SettlementStatus } from '@nimiq/oasis-api';
import { FiatCurrency } from '../lib/Constants';
import { assetToCurrency } from '../lib/swap/utils/Assets';
import { getEurPerCrypto, getFiatFees } from '../lib/swap/utils/Functions';
import { Transaction as PolygonTransaction } from './UsdcTransactions';

export enum SwapState {
    SIGN_SWAP,
    AWAIT_INCOMING,
    CREATE_OUTGOING,
    AWAIT_SECRET,
    SETTLE_INCOMING,
    COMPLETE,
    EXPIRED,
}

export enum SwapDirection {
    LEFT_TO_RIGHT,
    RIGHT_TO_LEFT,
}

export type SwapNimData = {
    asset: SwapAsset.NIM,
    transactionHash: string,
    htlc?: {
        address?: string,
        refundAddress: string,
        redeemAddress: string,
        timeoutBlockHeight: number,
    },
};

export type SwapBtcData = {
    asset: SwapAsset.BTC,
    transactionHash: string,
    outputIndex: number,
    htlc?: {
        address?: string,
        script: string,
        refundAddress: string,
        redeemAddress: string,
        timeoutTimestamp: number,
    },
};

export type SwapUsdcData = {
    asset: SwapAsset.USDC | SwapAsset.USDC_MATIC,
    transactionHash: string,
    htlc?: {
        address?: string,
        refundAddress: string,
        redeemAddress: string,
        timeoutTimestamp: number,
    },
};

export type SwapEurData = {
    asset: SwapAsset.EUR,
    bankLabel?: string,
    bankLogo?: string,
    iban?: string,
    amount: number,
    htlc?: {
        id: string,
        timeoutTimestamp: number,
        settlement?: {
            status: SettlementStatus,
            eta?: number,
            reason?: DeniedReason | string,
            lastUpdated?: number,
        },
    },
};

export type SwapData = SwapNimData | SwapBtcData | SwapUsdcData | SwapEurData;

export type Swap = {
    id?: string,
    in?: SwapData,
    out?: SwapData,
    fees?: {
        totalFee: number,
        asset: SwapAsset,
    },
};

export type ActiveSwap = SwapObject & {
    state: SwapState,
    stateEnteredAt: number,
    watchtowerNotified: boolean,
    fundingInstructions?: SepaClearingInstruction,
    fundingSerializedTx?: string,
    // Authorization token for KYC enabled OASIS settlements (when selling crypto for fiat).
    // S3 KYC grant tokens and KYC enabled OASIS clearing authorization tokens (buying crypto), don't have to be handled
    // during the swap process in wallet, as those tokens are passed to S3 already in the Hub during swap confirmation.
    settlementAuthorizationToken?: string,
    settlementSerializedTx?: string,
    nimiqProxySerializedTx?: string,
    remoteFundingTx?: PlainTransactionDetails | BtcTransactionDetails | OasisHtlc
        | PolygonTransaction,
    fundingTx?: PlainTransactionDetails | BtcTransactionDetails | OasisHtlc
        | PolygonTransaction,
    secret?: string,
    settlementTx?: PlainTransactionDetails | BtcTransactionDetails | OasisHtlc
        | PolygonTransaction,
    error?: string,
    errorAction?: SwapErrorAction,
}

export enum SwapErrorAction {
    USDC_RESIGN_REDEEM = 'usdc-resign-redeem',
}

export type SwapsState = {
    swaps: { [hash: string]: Swap },
    swapByTransaction: { [transactionHash: string]: string },
    activeSwap: ActiveSwap | null,
    promoBoxVisible: boolean,
};

export const useSwapsStore = createStore({
    id: 'swaps',
    state: (): SwapsState => ({
        swaps: {},
        swapByTransaction: {},
        activeSwap: null,
        promoBoxVisible: false,
    }),
    getters: {
        getSwap: (state): ((hash: string) => Swap | undefined) => (hash: string): Readonly<Swap> =>
            state.swaps[hash],
        getSwapByTransactionHash: (state): ((transactionHash: string) => Swap | null) =>
            (transactionHash: string): Readonly<Swap> | null => {
                const swapHash = state.swapByTransaction[transactionHash];
                if (!swapHash) return null;
                return state.swaps[swapHash] || null;
            },
        activeSwap: (state): Readonly<ActiveSwap | null> => state.activeSwap,
        promoBoxVisible: (state): Readonly<boolean> => state.promoBoxVisible,
    },
    actions: {
        setSwap(hash: string, swap: Swap) {
            this.state.swaps = {
                ...this.state.swaps,
                [hash]: swap,
            };
            this.state.swapByTransaction = {
                ...this.state.swapByTransaction,
                ...(swap.in && 'transactionHash' in swap.in ? { [swap.in.transactionHash]: hash } : {}),
                ...(swap.out && 'transactionHash' in swap.out ? { [swap.out.transactionHash]: hash } : {}),
            };
        },
        addFundingData(hash: string, data: SwapData, newSwapData: Swap = {}) {
            const swap: Swap = this.state.swaps[hash] || {};
            this.setSwap(hash, {
                ...swap,
                in: data,
                ...newSwapData,
            });
        },
        addSettlementData(hash: string, data: SwapData, newSwapData: Swap = {}) {
            const swap: Swap = this.state.swaps[hash] || {};
            this.setSwap(hash, {
                ...swap,
                out: data,
                ...newSwapData,
            });
        },
        setActiveSwap(swap: ActiveSwap | null) {
            this.state.activeSwap = swap;
        },
        setPromoBoxVisible(visible: boolean) {
            this.state.promoBoxVisible = visible;
        },

        async detectSwapFiatCounterpart(
            contractAddress: string,
            hashRoot: string,
            type: 'funding' | 'settlement',
            otherAsset: Exclude<SwapAsset, SwapAsset.EUR>,
        ) {
            // Check swap with the Fastspot API to detect if it was a EUR swap.
            const [addSwapData, swapProp, contractProp, feesProp] = type === 'funding'
                ? [this.addFundingData.bind(this), 'in', 'from', 'settlement'] as const
                : [this.addSettlementData.bind(this), 'out', 'to', 'funding'] as const;
            const otherCurrency = assetToCurrency(otherAsset);
            const swap = this.state.swaps[hashRoot];
            if (!swap || !!swap[swapProp]) return; // not a swap, or counterpart already known
            const contractWithEstimate = await getContract(otherAsset, contractAddress).catch(() => undefined);
            if (contractWithEstimate?.[contractProp].asset !== SwapAsset.EUR) return; // No contract or no EUR

            const exchangeRate = {
                [otherCurrency]: {
                    [FiatCurrency.EUR]: getEurPerCrypto(otherAsset, contractWithEstimate),
                },
            };
            const fees = getFiatFees(
                contractWithEstimate,
                otherCurrency,
                exchangeRate,
                FiatCurrency.EUR,
                null,
            );

            addSwapData(hashRoot, {
                asset: SwapAsset.EUR,
                amount: contractWithEstimate[contractProp].amount,
                // We cannot get bank info or EUR HTLC details from this.
            }, {
                fees: {
                    totalFee: fees[feesProp].total,
                    asset: SwapAsset.EUR,
                },
            });
        },
    },
});

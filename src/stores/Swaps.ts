import { createStore } from 'pinia';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { Swap as SwapObject, SwapAsset } from '../lib/FastspotApi';
import { FiatCurrency } from '../lib/Constants';

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
    NIM_TO_BTC,
    BTC_TO_NIM,
}

export type SwapNimData = {
    asset: SwapAsset.NIM,
    transactionHash: string,
};

export type SwapBtcData = {
    asset: SwapAsset.BTC,
    transactionHash: string,
    outputIndex: number,
};

export type Swap = {
    id?: string,
    provider?: 'Fastspot',
    in?: SwapNimData | SwapBtcData,
    out?: SwapNimData | SwapBtcData,
    fees?: {
        myBtcFeeFiat: number,
        myNimFeeFiat: number,
        serviceBtcFeeFiat: number,
        serviceNimFeeFiat: number,
        serviceExchangeFeeFiat: number,
        serviceExchangeFeePercentage: number,
        currency: FiatCurrency,
    },
};

export type ActiveSwap<T extends SwapState> = SwapObject & {
    state: T,
} & (T extends SwapState.AWAIT_INCOMING
             | SwapState.CREATE_OUTGOING
             | SwapState.AWAIT_SECRET
             | SwapState.SETTLE_INCOMING
             | SwapState.COMPLETE
    ? {
        fundingSerializedTx: string,
        settlementSerializedTx: string,
    } : {})
& (T extends SwapState.CREATE_OUTGOING
           | SwapState.AWAIT_SECRET
           | SwapState.SETTLE_INCOMING
           | SwapState.COMPLETE
    ? {
        remoteFundingTx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails,
    } : {})
& (T extends SwapState.AWAIT_SECRET
           | SwapState.SETTLE_INCOMING
           | SwapState.COMPLETE
    ? {
        fundingTx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails,
    } : {})
& (T extends SwapState.SETTLE_INCOMING
           | SwapState.COMPLETE
    ? {
        // remoteSettlementTxHash: string,
        secret: string,
    } : {})
& (T extends SwapState.COMPLETE
    ? {
        settlementTx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails,
    } : {});

export type SwapsState = {
    swaps: { [hash: string]: Swap },
    swapByTransaction: { [transactionHash: string]: string },
    activeSwap: ActiveSwap<any> | null,
};

export const useSwapsStore = createStore({
    id: 'swaps',
    state: (): SwapsState => ({
        swaps: {},
        swapByTransaction: {},
        activeSwap: null,
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
        activeSwap: (state): Readonly<ActiveSwap<any> | null> => state.activeSwap,
    },
    actions: {
        setSwap(hash: string, swap: Swap) {
            this.state.swaps = {
                ...this.state.swaps,
                [hash]: swap,
            };
            this.state.swapByTransaction = {
                ...this.state.swapByTransaction,
                ...(swap.in ? { [swap.in.transactionHash]: hash } : {}),
                ...(swap.out ? { [swap.out.transactionHash]: hash } : {}),
            };
        },
        addFundingData(hash: string, data: SwapNimData | SwapBtcData, newSwapData: Swap = {}) {
            const swap: Swap = this.state.swaps[hash] || {};
            this.setSwap(hash, {
                ...swap,
                in: data,
                ...newSwapData,
            });
        },
        addSettlementData(hash: string, data: SwapNimData | SwapBtcData, newSwapData: Swap = {}) {
            const swap: Swap = this.state.swaps[hash] || {};
            this.setSwap(hash, {
                ...swap,
                out: data,
                ...newSwapData,
            });
        },
        setActiveSwap(swap: ActiveSwap<any> | null) {
            this.state.activeSwap = swap;
        },
    },
});

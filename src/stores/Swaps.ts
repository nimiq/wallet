import { createStore } from 'pinia';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { Swap as SwapObject, SwapAsset } from '@nimiq/fastspot-api';
import { Htlc, HtlcStatus, SepaClearingInstruction } from '../lib/OasisApi';

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

export type SwapEurData = {
    asset: SwapAsset.EUR,
    bankLabel?: string,
    bankLogo?: string,
    amount: number,
    htlc?: {
        id: string,
        timeoutTimestamp: number,
    },
};

export type Swap = {
    id?: string,
    in?: SwapNimData | SwapBtcData | SwapEurData,
    out?: SwapNimData | SwapBtcData | SwapEurData,
};

export type ActiveSwap = SwapObject & {
    state: SwapState,
    stateEnteredAt: number,
    watchtowerNotified: boolean,
    fundingInstructions?: SepaClearingInstruction,
    fundingSerializedTx?: string,
    settlementSerializedTx?: string,
    remoteFundingTx?: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails | Htlc<HtlcStatus>,
    fundingError?: string,
    fundingTx?: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails | Htlc<HtlcStatus>,
    secret?: string,
    settlementError?: string,
    settlementTx?: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails | Htlc<HtlcStatus>,
}

export enum SEPA_INSTANT_SUPPORT {
    FULL = 'sepa-instant-full-support',
    PARTIAL = 'sepa-instant-partial-support',
    NONE = 'sepa-instant-no-support',
    UNKNOWN = 'sepa-instant-unknown-support',
}

export type BankInfos = {
    name: string,
    BIC: string,
    support: {
        sepa: {
            inbound: SEPA_INSTANT_SUPPORT,
            outbound: SEPA_INSTANT_SUPPORT,
        },
        // swift?
    },
}

export type SwapsState = {
    swaps: { [hash: string]: Swap },
    swapByTransaction: { [transactionHash: string]: string },
    activeSwap: ActiveSwap | null,
    userBank: BankInfos | null,
};

export const useSwapsStore = createStore({
    id: 'swaps',
    state: (): SwapsState => ({
        swaps: {},
        swapByTransaction: {},
        activeSwap: null,
        userBank: null,
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
        userBank: (state): Readonly<BankInfos | null> => state.userBank,
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
        addFundingData(hash: string, data: SwapNimData | SwapBtcData | SwapEurData, newSwapData: Swap = {}) {
            const swap: Swap = this.state.swaps[hash] || {};
            this.setSwap(hash, {
                ...swap,
                in: data,
                ...newSwapData,
            });
        },
        addSettlementData(hash: string, data: SwapNimData | SwapBtcData | SwapEurData, newSwapData: Swap = {}) {
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
        setUserBank(bank: BankInfos) {
            this.state.userBank = bank;
        },
    },
});

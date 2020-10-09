import { createStore } from 'pinia';
import { CryptoCurrency } from '@/lib/Constants';
// import { Transaction as NimTransaction } from './Transactions';
// import { Transaction as BtcTransaction } from './BtcTransactions';

// export enum SwapState {
//     SIGNING,
//     WAITING_FOR_REMOTE_FUNDING,
//     FUNDING,
//     WAITING_FOR_SECRET,
//     SETTLING,
//     COMPLETE,
//     EXPIRED,
// }

export type SwapNimData = {
    currency: CryptoCurrency.NIM,
    transactionHash: string,
};

export type SwapBtcData = {
    currency: CryptoCurrency.BTC,
    transactionHash: string,
    outputIndex: number,
};

export type Swap = {
    id?: string,
    provider?: 'Fastspot',
    in?: SwapNimData | SwapBtcData,
    out?: SwapNimData | SwapBtcData,
};

export type SwapsState = {
    swaps: { [hash: string]: Swap },
};

export const useSwapsStore = createStore({
    id: 'swaps',
    state: (): SwapsState => ({
        swaps: {},
    }),
    getters: {
        getSwap: (state): ((hash: string) => Swap | undefined) => (hash: string): Readonly<Swap> =>
            state.swaps[hash],
    },
    actions: {
        setSwap(hash: string, swap: Swap) {
            this.state.swaps = {
                ...this.state.swaps,
                [hash]: swap,
            };
        },
        addFundingData(hash: string, data: SwapNimData | SwapBtcData) {
            const swap: Swap = this.state.swaps[hash] || {};
            swap.in = data;
            this.setSwap(hash, swap);
        },
        addSettlementData(hash: string, data: SwapNimData | SwapBtcData) {
            const swap: Swap = this.state.swaps[hash] || {};
            swap.out = data;
            this.setSwap(hash, swap);
        },
    },
});

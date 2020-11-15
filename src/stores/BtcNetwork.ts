import { createStore } from 'pinia';

export const useBtcNetworkStore = createStore({
    id: 'btcNetwork',
    state: () => ({
        consensus: 'syncing',
        peerCount: 0,
        height: 0,
        timestamp: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
        height: (state): Readonly<number> => state.height,
        timestamp: (state): Readonly<number> => state.timestamp,
        consensus: (state): Readonly<string> => state.consensus,
    },
    actions: {},
});

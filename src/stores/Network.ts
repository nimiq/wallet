import { createStore } from 'pinia';

export const useNetworkStore = createStore({
    id: 'network',
    state: () => ({
        consensus: 'syncing',
        peerCount: 0,
        height: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
        height: (state): Readonly<number> => state.height,
        consensus: (state): Readonly<string> => state.consensus,
    },
    actions: {},
});

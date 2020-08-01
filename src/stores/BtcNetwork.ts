import { createStore } from 'pinia';

export const useBtcNetworkStore = createStore({
    id: 'btcNetwork',
    state: () => ({
        consensus: 'syncing',
        peerCount: 0,
        height: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
    },
    actions: {},
});

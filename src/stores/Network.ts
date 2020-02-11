import { createStore } from 'pinia';

export const useNetworkStore = createStore({
    id: 'network',
    state: () => ({
        consensus: 'initializing',
        peerCount: 0,
        height: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
    },
    actions: {},
});

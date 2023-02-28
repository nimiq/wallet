import { createStore } from 'pinia';

export const useUsdcNetworkStore = createStore({
    id: 'usdcNetwork',
    state: () => ({
        consensus: 'syncing',
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

import { createStore } from 'pinia';

export const useUsdcNetworkStore = createStore({
    id: 'usdcNetwork',
    state: () => ({
        consensus: 'syncing',
        outdatedHeight: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
        outdatedHeight: (state): Readonly<number> => state.outdatedHeight,
        consensus: (state): Readonly<string> => state.consensus,
    },
    actions: {},
});

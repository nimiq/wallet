import { createStore } from 'pinia';

export const usePolygonNetworkStore = createStore({
    id: 'polygonNetwork',
    state: () => ({
        consensus: 'syncing',
        outdatedHeight: 0,
        fetchingUsdcTxHistory: 0,
    }),
    getters: {
        isFetchingUsdcTxHistory: (state) => state.fetchingUsdcTxHistory > 0,
        outdatedHeight: (state): Readonly<number> => state.outdatedHeight,
        consensus: (state): Readonly<string> => state.consensus,
    },
    actions: {},
});

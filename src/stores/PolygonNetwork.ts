import { defineStore } from 'pinia';

export const usePolygonNetworkStore = defineStore('polygonNetwork', {
    state: () => ({
        consensus: 'syncing',
        outdatedHeight: 0,
        fetchingUsdcTxHistory: 0,
        fetchingUsdtTxHistory: 0,
    }),
    getters: {
        isFetchingUsdcTxHistory: (state) => state.fetchingUsdcTxHistory > 0,
        isFetchingUsdtTxHistory: (state) => state.fetchingUsdtTxHistory > 0,
    },
    actions: {},
});

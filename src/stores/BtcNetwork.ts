import { defineStore } from 'pinia';

export const useBtcNetworkStore = defineStore('btcNetwork', {
    state: () => ({
        consensus: 'syncing',
        peerCount: 0,
        height: 0,
        timestamp: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
    },
    actions: {},
});

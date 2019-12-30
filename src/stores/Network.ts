import { createStore } from 'pinia'

export const useNetworkStore = createStore(
    // name of the store
    // it is used in devtools and allows restoring state
    'network',
    // a function that returns a fresh state
    () => ({
        consensus: 'initializing',
        peerCount: 0,
        height: 0,
        fetchingTxHistory: 0,
    }),
    // optional getters
    {
        isFetchingTxHistory: state => state.fetchingTxHistory > 0,
    }
)

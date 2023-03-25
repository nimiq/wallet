import { createStore } from 'pinia';

export type Peer = {
    peerId: string,
    multiAddress: string,
    nodeType: string,
    connected: boolean,
}

export const useNetworkStore = createStore({
    id: 'network',
    state: () => ({
        consensus: navigator.onLine ? 'syncing' : 'connecting',
        peerCount: 0,
        peers: {} as Record<string, Peer>,
        height: 0,
        fetchingTxHistory: 0,
    }),
    getters: {
        isFetchingTxHistory: (state) => state.fetchingTxHistory > 0,
        height: (state): Readonly<number> => state.height,
        consensus: (state): Readonly<string> => state.consensus,
    },
    actions: {
        addPeer(peer: Peer) {
            // In Vue 2, have to reassign the whole object
            // TODO: In Vue 3, can use `this.peers[peer.peerId] = peer`
            this.state.peers = {
                ...this.state.peers,
                [peer.peerId]: peer,
            };
        },
        removePeer(peerId: string) {
            const peers = { ...this.state.peers };
            delete peers[peerId];
            this.state.peers = peers;
        },
    },
});

<template>
    <div class="network-map" ref="container">
        <canvas class="map" ref="network"></canvas>
        <canvas class="overlay" ref="overlay"></canvas>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, watch } from '@vue/composition-api';
import { useNetworkStore } from '../stores/Network';
import NetworkMap from '../lib/NetworkMap';


export default defineComponent({
    setup(props, context) {
        onMounted(() => {
            const { state: $network } = useNetworkStore();

            const mapCanvas = (context.refs.network as HTMLCanvasElement)!;
            const overlayCanvas = (context.refs.overlay as HTMLCanvasElement)!;

            const networkMap = new NetworkMap(mapCanvas, overlayCanvas);

            watch(() => $network.peerCount, (newPeers) => {
                // TODO connect to the correct peers.
                if (networkMap.peerCount > newPeers) {
                    networkMap.removePeer('');
                } else if (networkMap.peerCount < newPeers) {
                    networkMap.addPeer('');
                }
            });
        });

        return { };
    },
});

</script>

<style lang="scss" scoped>

.network-map {
    padding: 0rem;
    display: flex;
    width: 100%;
    position: relative;
    overflow: hidden;
}

.map,
.overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform:  translate3d(-50%, -50%,  0);
}
</style>

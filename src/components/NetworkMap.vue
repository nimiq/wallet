<template>
    <div class="network-map" ref="container">
        <canvas class="map" ref="network"></canvas>
        <canvas class="overlay" ref="overlay"></canvas>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from '@vue/composition-api';
import { NetworkClient } from '@nimiq/network-client';
import { getNetworkClient } from '../network';
import NetworkMap from '../lib/NetworkMap';

export default defineComponent({
    setup(props, context) {
        onMounted(async () => {
            await getNetworkClient();
            const mapCanvas = (context.refs.network as HTMLCanvasElement)!;
            const overlayCanvas = (context.refs.overlay as HTMLCanvasElement)!;

            const networkMap = new NetworkMap(mapCanvas, overlayCanvas);

            let askForAddressesTimeout = 0;

            const updateKnownAddresses = async () => {
                if (!askForAddressesTimeout) {
                    askForAddressesTimeout = window.setTimeout(async () => {
                        const newKnownAddresses = await NetworkClient.Instance.getKnownAddresses();
                        if (networkMap.updateNodes(newKnownAddresses)) {
                            networkMap.draw();
                        }
                        askForAddressesTimeout = 0;
                    }, 500);
                }
            };

            NetworkClient.Instance.on(NetworkClient.Events.ADDRESSES_ADDED, updateKnownAddresses);
            NetworkClient.Instance.on(NetworkClient.Events.PEERS_CHANGED, updateKnownAddresses);

            // if no consensus is establiched one of the other events will trigger the update
            if (NetworkClient.Instance.consensusState === 'established') {
                updateKnownAddresses();
            }
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

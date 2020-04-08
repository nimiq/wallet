<template>
    <div class="network-map" ref="container">
        <canvas class="map" ref="network"></canvas>
        <canvas class="overlay" ref="overlay"></canvas>
        <div class="nodes" :style="`width: ${width}px; height: ${height}px;`">
            <Tooltip v-for="(node, index) in nodes" :key="'node-' + index"
                class="node"
                theme="inverse"
                :style="`transform: translate(${node.x * scale}px, ${node.y * scale}px);`"
            >
                <div :style="`padding: ${scale}em;`" slot="trigger"></div>
                <span v-for="peer in node._nodes" :key="peer.peerId">
                    <h3 v-if="peer.type === 0 /* SELF */">{{ $t('You are here') }}</h3>
                    <h3 v-else>
                        {{ peer.state === 2 ? $t('Connected') : $t('Available') }}
                        {{ peer.type === 1 ? $t('Full Node') : peer.type === 2 ? $t('Light Node') : $t('Browser') }}
                    </h3>
                    <p v-if="peer.locationData.country"
                        :class="{'self': peer.type === 0 /* SELF */, 'connected': peer.state === 2 /* CONNECTED */}">
                        {{ peer.locationData.city ? `${peer.locationData.city},` : '' }}
                        {{ peer.locationData.country }}
                    </p>
                </span>
            </Tooltip>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { Tooltip, HexagonIcon } from '@nimiq/vue-components';
import { NetworkClient } from '@nimiq/network-client';
import { getNetworkClient } from '../network';
import NetworkMap, { NodeHexagon, WIDTH, HEIGHT, SCALING_FACTOR } from '../lib/NetworkMap';

export default defineComponent({
    setup(props, context) {
        const nodes = ref<NodeHexagon[]>([]);
        const scale = ref(.95);
        const width = ref(2 * WIDTH);
        const height = ref(2 * HEIGHT);

        onMounted(async () => {
            await getNetworkClient();
            const mapCanvas = (context.refs.network as HTMLCanvasElement)!;
            const overlayCanvas = (context.refs.overlay as HTMLCanvasElement)!;
            const container = (context.refs.container as HTMLDivElement)!;

            const networkMap = new NetworkMap(mapCanvas, overlayCanvas, (n) => nodes.value = n);

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


            const setDimensions = () => {
                const containerWidth = container.offsetWidth;
                const containerHeight = container.offsetHeight;

                if (containerHeight * (WIDTH / HEIGHT) > containerWidth) {
                    const newHeight = containerWidth / (WIDTH / HEIGHT);

                    mapCanvas.style.width = `${containerWidth}px`;
                    mapCanvas.style.height = `${newHeight}px`;
                    overlayCanvas.style.width = `${containerWidth}px`;
                    overlayCanvas.style.height = `${newHeight}px`;
                    width.value = containerWidth;
                    height.value = newHeight;
                    scale.value = (SCALING_FACTOR * containerWidth) / (2 * WIDTH);
                } else {
                    const newWidth = containerHeight * (WIDTH / HEIGHT);

                    mapCanvas.style.width = `${newWidth}px`;
                    mapCanvas.style.height = `${containerHeight}px`;
                    overlayCanvas.style.width = `${newWidth}px`;
                    overlayCanvas.style.height = `${containerHeight}px`;
                    width.value = newWidth;
                    height.value = containerHeight;
                    scale.value = (SCALING_FACTOR * containerHeight) / (2 * HEIGHT);
                }
            };

            NetworkClient.Instance.on(NetworkClient.Events.ADDRESSES_ADDED, updateKnownAddresses);
            NetworkClient.Instance.on(NetworkClient.Events.PEERS_CHANGED, updateKnownAddresses);

            // if no consensus is establiched one of the other events will trigger the update
            if (NetworkClient.Instance.consensusState === 'established') {
                updateKnownAddresses();
            }

            window.addEventListener('resize', setDimensions);
            setDimensions();
        });

        return {
            nodes,
            scale,
            width,
            height,
        };
    },
    components: {
        Tooltip,
        HexagonIcon,
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
.overlay,
.nodes {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.node {
    position: absolute;
    left: 0;
    top: -1px;

    /deep/ .trigger {
        font-size: 1.125rem;
        border-radius: 50%;
    }

    /deep/ .tooltip-box {
        white-space: nowrap;

        span + span {
            display: block;
            margin-top: 1.5rem;
        }

        h3 {
            opacity: .5;
            font-size: 1.5rem;
            line-height: 1.5rem;
            margin: 0;
        }

        p {
            opacity: .8;
            font-size: 2rem;
            line-height: 2rem;
            margin: .75rem 0 0;

            &.self {
                color: var(--nimiq-gold-darkened);
            }

            &.connected {
                color: var(--nimiq-light-blue-darkened);
            }
        }
    }
}
</style>

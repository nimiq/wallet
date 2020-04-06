<template>
    <div class="network-map" ref="container">
        <canvas class="map" ref="network"></canvas>
        <canvas class="overlay" ref="overlay"></canvas>
        <div class="nodes" :style="`width: ${width}px; height: ${height}px;`">
            <Tooltip v-for="(node, index) in nodes" :key="'node-' + index"
                class="node"
                theme="inverse"
                :style="`transform: translate(${node.x * scale}px, ${node.y * scale}px);`"
                :class=" [{'connected': node.isConnected, 'self': node.isSelf}, `count-${Math.min(node.nodeCount, 4)}`]"
            >
                <div :style="`font-size: ${scale}em;`" slot="trigger"><HexagonIcon/></div>
                Nodes in this area: {{ node.nodeCount }}
            </Tooltip>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { Tooltip, HexagonIcon } from '@nimiq/vue-components';
import { NetworkClient } from '@nimiq/network-client';
import { getNetworkClient } from '../network';
import NetworkMap from '../lib/NetworkMap';

const WIDTH = 2164;
const HEIGHT = 1004;

export default defineComponent({
    setup(props, context) {
        const nodes = ref<any[]>([]);
        const scale = ref(1);
        const width = ref(WIDTH);
        const height = ref(HEIGHT);

        function updateScale() {
            // Update scale
            const container = context.refs.container as HTMLDivElement;

            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            if (containerHeight * (WIDTH / HEIGHT) > containerWidth) {
                // Container is not wide enough
                scale.value = containerWidth / WIDTH;
                width.value = containerWidth;
                height.value = containerWidth / (WIDTH / HEIGHT);
            } else {
                // Container is not high enough
                scale.value = containerHeight / HEIGHT;
                width.value = containerHeight * (WIDTH / HEIGHT);
                height.value = containerHeight;
            }
        }

        onMounted(async () => {
            await getNetworkClient();
            const mapCanvas = (context.refs.network as HTMLCanvasElement)!;
            const overlayCanvas = (context.refs.overlay as HTMLCanvasElement)!;

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

            NetworkClient.Instance.on(NetworkClient.Events.ADDRESSES_ADDED, updateKnownAddresses);
            NetworkClient.Instance.on(NetworkClient.Events.PEERS_CHANGED, updateKnownAddresses);

            // if no consensus is establiched one of the other events will trigger the update
            if (NetworkClient.Instance.consensusState === 'established') {
                updateKnownAddresses();
            }

            window.addEventListener('resize', updateScale);
            updateScale();
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
    top: 0;
    transition: color 0.3s var(--nimiq-ease), opacity 0.3s var(--nimiq-ease);

    /deep/ .trigger {
        color: inherit;
        transform-origin: top left;
    }

    /deep/ .tooltip-box {
        white-space: nowrap;
    }
}

.node.count-1 .nq-icon { opacity: 0.2; }
.node.count-2 .nq-icon { opacity: 0.4; }
.node.count-3 .nq-icon { opacity: 0.6; }
.node.count-4 .nq-icon { opacity: 0.8; }
.node.count-5 .nq-icon { opacity: 1; }

.node.connected .nq-icon {
    color: var(--nimiq-light-blue);
    opacity: 1;
}

.node.self {
    color: var(--nimiq-gold);
    opacity: 1;
}
</style>

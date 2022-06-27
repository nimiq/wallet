<template>
    <div class="network-map" ref="container$">
        <canvas class="map" ref="network$" :style="`width: ${width}px; height: ${height}px;`"></canvas>
        <canvas class="overlay" ref="overlay$" :style="`width: ${width}px; height: ${height}px;`"></canvas>
        <div class="nodes" :style="`width: ${width}px; height: ${height}px;`">
            <Tooltip v-for="(node, index) in nodes" :key="'node-' + index"
                class="node"
                theme="inverse"
                :container="this"
                :preferredPosition="getPreferredTooltipPosition(node)"
                :margin="{ left: 12, top: 12, right: 12, bottom: 12 }"
                :style="`transform: translate(${Math.floor(node.x * scale)}px, ${Math.floor(node.y * scale)}px);`"
                :styles="{
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                }"
            >
                <template v-slot:trigger>
                    <div :style="`padding: ${scale}em;`"></div>
                </template>
                <NetworkMapPeerList :peers="node.peers" />
            </Tooltip>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed, watch } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
// import { /* getNetworkClient, */ onPeersUpdated, offPeersUpdated } from '../network';
import NetworkMap, {
    NodeHexagon,
    NETWORK_MAP_WIDTH,
    WIDTH,
    NETWORK_MAP_HEIGHT,
    HEIGHT,
    SCALING_FACTOR,
    NodeType,
} from '../lib/NetworkMap';
import NetworkMapPeerList from './NetworkMapPeerList.vue';

export default defineComponent({
    setup(props, context) {
        const container$ = ref<HTMLDivElement>(null);
        const network$ = ref<HTMLCanvasElement>(null);
        const overlay$ = ref<HTMLCanvasElement>(null);
        const nodes = ref<NodeHexagon[]>([]);
        const scale = ref(SCALING_FACTOR);
        const width = ref(2 * WIDTH);
        const height = ref(2 * HEIGHT);

        const setDimensions = () => {
            if (!container$.value) return;
            const containerWidth = container$.value.offsetWidth;
            const containerHeight = container$.value.offsetHeight;

            // Set width and height such that it fits the container. Restrict to even numbers, to avoid blurriness
            // due to subpixel precision by centering via translate(-50%, -50%) and to avoid positioning tooltips
            // at subpixel positions.
            if (containerHeight * (WIDTH / HEIGHT) > containerWidth) {
                width.value = Math.round(containerWidth / 2) * 2;
                height.value = Math.round(containerWidth / (WIDTH / HEIGHT) / 2) * 2;
                scale.value = (SCALING_FACTOR * width.value) / (2 * WIDTH);
            } else {
                width.value = Math.round((containerHeight * (WIDTH / HEIGHT)) / 2) * 2;
                height.value = Math.round(containerHeight / 2) * 2;
                scale.value = (SCALING_FACTOR * height.value) / (2 * HEIGHT);
            }
        };

        let updateKnownAddresses: () => Promise<void>;

        onMounted(async () => {
            // const client = await getNetworkClient();

            const networkMap = new NetworkMap(network$.value!, overlay$.value!, (n) => nodes.value = n);

            let askForAddressesTimeout = 0;

            updateKnownAddresses = async () => {
                if (!askForAddressesTimeout) {
                    askForAddressesTimeout = window.setTimeout(async () => {
                        // const peerAddressInfos = await client.network.getAddresses();
                        // const newKnownAddresses = peerAddressInfos.map((addressInfo) => addressInfo.toPlain());
                        const newKnownAddresses = [{
                            peerAddress: new URL(context.root.$config.networkEndpoint).origin,
                            peerId: '',
                            services: [],
                            netAddress: null,
                            banned: false,
                            connected: true,
                        }];
                        if (networkMap.updateNodes(newKnownAddresses)) {
                            networkMap.draw();
                        }
                        askForAddressesTimeout = 0;
                    }, 500);
                }
            };

            // onPeersUpdated(updateKnownAddresses);

            updateKnownAddresses();

            window.addEventListener('resize', setDimensions);
            requestAnimationFrame(() => setDimensions()); // use requestAnimationFrame to not cause forced layouting
        });

        onUnmounted(() => {
            // offPeersUpdated(updateKnownAddresses);
            window.removeEventListener('resize', setDimensions);
        });

        // Emit own X coordinate so the parent can scroll the map to the correct horizontal position
        const ownNode = computed(() =>
            nodes.value.find((node) => [...node.peers].some((peer) => peer.type === NodeType.SELF)));
        const ownXCoordinate = computed(() => ownNode.value ? ownNode.value.x : null);
        watch(ownXCoordinate, (x) => x !== null && context.emit('own-x-coordinate', (x / 2) * SCALING_FACTOR));

        function getPreferredTooltipPosition(hexagon: NodeHexagon): string {
            let verticalPosition = 'top';
            let horizontalPosition = 'right';
            // display tooltip below for hexagons near the top edge
            if (hexagon.position.y < Math.ceil(NETWORK_MAP_HEIGHT / 2)) {
                verticalPosition = 'bottom';
            }
            // display tooltip to the left for hexagons near the right edge
            if (hexagon.position.x > Math.ceil(NETWORK_MAP_WIDTH / 2)) {
                horizontalPosition = 'left';
            }
            return `${verticalPosition} ${horizontalPosition}`;
        }

        return {
            container$,
            network$,
            overlay$,
            nodes,
            scale,
            width,
            height,
            getPreferredTooltipPosition,
        };
    },
    components: {
        Tooltip,
        NetworkMapPeerList,
    },
});
</script>

<style lang="scss" scoped>
.network-map {
    position: relative;
    overflow: hidden;
    width: 100%;
    max-width: 1500px;
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
    line-height: 0;
    font-size: 1.125rem;
}
</style>

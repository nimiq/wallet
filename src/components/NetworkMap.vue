<template>
    <div class="network-map" ref="$container">
        <canvas class="map" ref="$network" :style="`width: ${width}px; height: ${height}px;`"></canvas>
        <canvas class="overlay" ref="$overlay" :style="`width: ${width}px; height: ${height}px;`"></canvas>
        <div class="nodes" :style="`width: ${width}px; height: ${height}px;`">
            <Tooltip v-for="(node, index) in nodes" :key="'node-' + index"
                class="node"
                theme="inverse"
                :container="$container ? { $el: $container } : null"
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
                <template v-slot:default>
                    <div v-for="peer in node.peers" :key="peer.peerId">
                        <h3 v-if="peer.type === 0 /* SELF */">{{ $t('Your browser') }}</h3>
                        <!-- <h3 v-else>
                            {{ peer.connected ? $t('Connected') : $t('Available') }}
                            {{ peer.type === 1 ? $t('Full Node') : peer.type === 2 ? $t('Light Node') : $t('Browser') }}
                        </h3> -->
                        <h3 v-else-if="peer.host">{{ peer.host }}</h3>
                        <h3 v-else>
                            {{ peer.type === 1 ? $t('Full Node') : peer.type === 2 ? $t('Light Node') : $t('Browser') }}
                        </h3>
                        <p v-if="peer.locationData.country"
                           :class="{'self': peer.type === 0 /* SELF */, 'connected': peer.connected}">
                            {{ getPeerCity(peer) ? `${getPeerCity(peer)},` : '' }}
                            {{ getPeerCountry(peer) }}
                        </p>
                    </div>
                </template>
            </Tooltip>
        </div>
    </div>
</template>

<script lang="ts">
import { shouldPolyfill as shouldPolyFillIntlDisplayNames } from '@formatjs/intl-displaynames/should-polyfill';
import { defineComponent, onMounted, onUnmounted, ref, computed, watch } from '@vue/composition-api';
import { Tooltip, HexagonIcon } from '@nimiq/vue-components';
import { NetworkClient } from '@nimiq/network-client';

import type {
    DisplayNames as IntlDisplayNames,
    DisplayNamesOptions as IntlDisplayNamesOptions,
} from '@formatjs/intl-displaynames';

import { getNetworkClient } from '../network';
import NetworkMap, { NodeHexagon, WIDTH, HEIGHT, SCALING_FACTOR, Node, NodeType } from '../lib/NetworkMap';
import { useSettingsStore } from '../stores/Settings';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
    let DisplayNames: undefined | {
        new (
            locales?: string | string[],
            options?: IntlDisplayNamesOptions,
        ): IntlDisplayNames,

        readonly polyfilled?: true,
    };
}

const intlDisplayNamesReadyPromise = !Intl.DisplayNames?.polyfilled && shouldPolyFillIntlDisplayNames()
    ? import('@formatjs/intl-displaynames/polyfill')
    : Promise.resolve();

export default defineComponent({
    setup(props, context) {
        const $container = ref<HTMLDivElement|null>(null);
        const $network = ref<HTMLCanvasElement|null>(null);
        const $overlay = ref<HTMLCanvasElement|null>(null);
        const nodes = ref<NodeHexagon[]>([]);
        const scale = ref(SCALING_FACTOR);
        const width = ref(2 * WIDTH);
        const height = ref(2 * HEIGHT);

        const setDimensions = () => {
            if (!$container.value) return;
            const containerWidth = $container.value.offsetWidth;
            const containerHeight = $container.value.offsetHeight;

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

        onMounted(async () => {
            await getNetworkClient();

            const networkMap = new NetworkMap($network.value!, $overlay.value!, (n) => nodes.value = n);

            let askForAddressesTimeout = 0;

            const updateKnownAddresses = async () => {
                if (!askForAddressesTimeout) {
                    askForAddressesTimeout = window.setTimeout(async () => {
                        const newKnownAddresses = await NetworkClient.Instance.getPeerAddresses();
                        if (networkMap.updateNodes(newKnownAddresses)) {
                            networkMap.draw();
                        }
                        askForAddressesTimeout = 0;
                    }, 500);
                }
            };

            NetworkClient.Instance.on(NetworkClient.Events.PEER_ADDRESSES_ADDED, updateKnownAddresses);
            NetworkClient.Instance.on(NetworkClient.Events.PEERS_CHANGED, updateKnownAddresses);

            // If no consensus is established, one of the other events will trigger the update
            if (NetworkClient.Instance.consensusState === 'established') {
                updateKnownAddresses();
            }

            window.addEventListener('resize', setDimensions);
            requestAnimationFrame(() => setDimensions()); // use requestAnimationFrame to not cause forced layouting
        });

        onUnmounted(() => window.removeEventListener('resize', setDimensions));

        // Emit own X coordinate so the parent can scroll the map to the correct horizontal position
        const ownNode = computed(() =>
            nodes.value.find((node) => [...node.peers].some((peer) => peer.type === NodeType.SELF)));
        const ownXCoordinate = computed(() => ownNode.value ? ownNode.value.x : null);
        watch(ownXCoordinate, (x) => x !== null && context.emit('own-x-coordinate', (x / 2) * SCALING_FACTOR));

        const { language } = useSettingsStore();
        let i18nCountryName: IntlDisplayNames | null = null;

        watch(language, async () => {
            i18nCountryName = null;
            // TODO polyfill can be removed in the future and i18nCountryName then changed to a non-async computed prop
            await intlDisplayNamesReadyPromise;
            if (Intl.DisplayNames!.polyfilled) {
                // has to be imported after the polyfill is ready
                await import(
                    /* webpackChunkName: "country-names-[request]" */
                    /* webpackInclude: /\/\w{2}\.js$/ */
                    `@formatjs/intl-displaynames/locale-data/${language.value}`);
            }
            i18nCountryName = new Intl.DisplayNames!(language.value, { type: 'region' });
        });

        function getPeerCity(peer: Node) {
            const fallbackCityName = peer.locationData.city;
            const { i18nCityNames } = peer.locationData;
            if (!i18nCityNames) return fallbackCityName;
            // Try to find a translation for current language
            const availableLanguage = i18nCityNames[language.value]
                ? language.value
                : Object.keys(i18nCityNames).find((locale) => locale.startsWith(language.value)); // accept zh-CH for zh
            return availableLanguage ? i18nCityNames[availableLanguage] : fallbackCityName;
        }

        function getPeerCountry(peer: Node) {
            return i18nCountryName && peer.locationData.country
                ? i18nCountryName.of(peer.locationData.country)
                : peer.locationData.country;
        }

        return {
            $container,
            $network,
            $overlay,
            nodes,
            scale,
            width,
            height,
            getPeerCity,
            getPeerCountry,
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

    div + div {
        margin-top: 1.5rem;
    }

    h3 {
        opacity: .5;
        font-size: var(--small-label-size);
        line-height: 1;
        margin: 0;
    }

    p {
        font-size: var(--body-size);
        line-height: 1;
        margin: .75rem 0 0;

        &.self {
            color: var(--nimiq-gold-darkened);
        }

        &.connected {
            --nimiq-light-blue: #0582CA; // Real light blue, not the "on-dark" version
            color: var(--nimiq-light-blue);
        }
    }
}
</style>

<template>
    <div class="network-map-peer-list">
        <div v-for="peer of groupedPeers.slice(0, LIST_LENGTH)" :key="peer.peerId">
            <h3 v-if="peer.type === 0 /* SELF */">{{ $t('Your browser') }}</h3>
            <!-- <h3 v-else>
                {{ peer.connected ? $t('Connected') : $t('Available') }}
                {{ peer.type === 1 ? $t('Full Node') : peer.type === 2 ? $t('Light Node') : $t('Browser') }}
            </h3> -->
            <h3 v-else-if="peer.host">{{ peer.host }}</h3>
            <h3 v-else>
                {{ peer.type === 1
                    ? $t('Full Node')
                    : peer.type === 2
                        ? $t('Light Node')
                        : $tc('Browser | {count} Browsers', peer.count) }}
            </h3>
            <p v-if="peer.locationData.country"
                :class="{'self': peer.type === 0, 'connected': peer.connected}">
                {{ getPeerCity(peer) ? `${getPeerCity(peer)},` : '' }}
                {{ getPeerCountry(peer) }}
            </p>
        </div>
        <h3 v-if="groupedPeers.length > LIST_LENGTH" class="plus-more">
            {{ $t('+{n} more', { n: groupedPeers.slice(LIST_LENGTH).reduce((sum, peer) => sum + peer.count, 0) }) }}
        </h3>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import I18nDisplayNames from '@/lib/I18nDisplayNames';
import { useSettingsStore } from '@/stores/Settings';
import { Node, NodeType } from '../lib/NetworkMap';

type CountedNode = Node & { count: number };

const LIST_LENGTH = 7;

export default defineComponent({
    props: {
        peers: {
            type: Set,
            required: true,
        },
    },
    setup(props) {
        const i18nCountryName = new I18nDisplayNames('region');
        const { language } = useSettingsStore();

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

        function sortGroupedPeers(a: CountedNode, b: CountedNode): number {
            // If this is the SELF node, sort it first
            if (a.type === NodeType.SELF) return -1;
            if (b.type === NodeType.SELF) return 1;

            // Otherwise sort by count (desc)
            const countDiff = b.count - a.count;
            if (countDiff !== 0) return countDiff;

            // Otherwise sort by city name
            if (!a.locationData || !a.locationData.city) return 1;
            if (!b.locationData || !b.locationData.city) return -1;
            if (a.locationData.city > b.locationData.city) return 1;
            return -1;
        }

        const groupedPeers = computed(() => {
            const groups = new Map<string, CountedNode>();

            for (const peer of props.peers as Set<Node>) {
                const groupId = `${peer.type}-${peer.host}-${peer.locationData.city}`;
                const group = groups.get(groupId);
                if (group) {
                    group.count += 1;
                    group.connected = group.connected || peer.connected;
                } else {
                    groups.set(groupId, {
                        ...peer,
                        count: 1,
                    });
                }
            }

            return [...groups.values()].sort(sortGroupedPeers);
        });

        return {
            LIST_LENGTH,
            getPeerCity,
            getPeerCountry,
            groupedPeers,
        };
    },
});
</script>

<style lang="scss" scoped>
div + div {
    margin-top: 1.5rem;
}

h3 {
    opacity: .5;
    font-size: var(--small-label-size);
    line-height: 1;
    margin: 0;
    white-space: nowrap;

    &.plus-more {
        margin-top: 1.5rem;
    }
}

p {
    font-size: var(--body-size);
    line-height: 1;
    margin: .75rem 0 0;
    white-space: nowrap;

    &.self {
        color: var(--nimiq-gold-darkened);
    }

    &.connected {
        --nimiq-light-blue: #0582CA; // Real light blue, not the "on-dark" version
        color: var(--nimiq-light-blue);
    }
}
</style>

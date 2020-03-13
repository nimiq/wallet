<template>
    <div class="consensus-icon" :class="consensus">
        <WorldIcon v-if="consensus === 'initializing' || consensus === 'syncing'"/>
        <WorldCheckIcon v-else-if="consensus === 'established'"/>
        <WorldAlertIcon v-else-if="consensus === 'lost'"/>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';

import { useNetworkStore } from '../stores/Network';
import WorldIcon from './icons/WorldIcon.vue';
import WorldCheckIcon from './icons/WorldCheckIcon.vue';
import WorldAlertIcon from './icons/WorldAlertIcon.vue';

export default defineComponent({
    setup() {
        const { state: $network } = useNetworkStore();

        const consensus = computed(() => {
            console.log('Consensus:', $network.consensus);
            return $network.consensus;
        });

        return {
            consensus,
        };
    },
    components: {
        WorldIcon,
        WorldCheckIcon,
        WorldAlertIcon,
    },
});
</script>

<style lang="scss" scoped>
.consensus-icon {
    width: 2.5rem;
    height: 2.5rem;
}

:hover > .established,
:focus > .established,
.active > .established {
    color: var(--nimiq-green);
}

:hover > .lost,
:focus > .lost,
.active > .lost {
    color: var(--nimiq-orange);
}

svg {
    display: block;
}

.initializing,
.syncing {
    animation: consensus-indicator-spin 1s linear infinite;
}

@keyframes consensus-indicator-spin {
    from { transform: rotateY(0deg) }
    to   { transform: rotateY(360deg) }
}
</style>

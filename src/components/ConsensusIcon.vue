<template>
    <div class="consensus-icon" :class="consensus">
        <WorldIcon v-if="consensus === 'syncing'"/>
        <WorldCheckIcon v-else-if="consensus === 'established'"/>
        <WorldAlertIcon v-else/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useNetworkStore } from '../stores/Network';
import WorldIcon from './icons/WorldIcon.vue';
import WorldCheckIcon from './icons/WorldCheckIcon.vue';
import WorldAlertIcon from './icons/WorldAlertIcon.vue';

export default defineComponent({
    setup() {
        const { consensus } = useNetworkStore();

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
    width: 2.75rem;
    height: 2.75rem;
    margin: -0.125rem;
}

:hover > .established,
:focus > .established,
.active > .established {
    color: var(--nimiq-green) !important;
    opacity: 1 !important;
}

.connecting, .stalled {
    color: var(--nimiq-orange) !important;
    opacity: 1 !important;
}

svg {
    display: block;
}
</style>

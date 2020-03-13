<template>
    <div class="consensus-indicator flex-row">
        <ConsensusIcon/>
        <span class="status">{{ text }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';

import { useNetworkStore } from '../stores/Network';
import ConsensusIcon from './ConsensusIcon.vue';

export default defineComponent({
    setup() {
        const { state } = useNetworkStore();

        const text = computed(() => {
            switch (state.consensus) {
                case 'initializing':
                case 'syncing':
                    return 'syncing...';
                case 'lost':
                    return 'conn. lost';
                default:
                    return `${state.peerCount} peer${state.peerCount !== 1 ? 's' : ''}`;
            }
        });

        return {
            text,
        };
    },
    components: {
        ConsensusIcon,
    },
});
</script>

<style lang="scss" scoped>
    .consensus-indicator {
        align-items: center;
        padding: 2rem 0 2rem 3rem;
        background: rgba(255, 255, 255, 0.07);
        color: rgba(255, 255, 255, 0.6);
    }

    .status {
        margin: 0 1rem 0 1.5rem;
        text-transform: uppercase;
        font-size: 1.625rem;
        font-weight: bold;
        letter-spacing: 0.05em;
    }
</style>

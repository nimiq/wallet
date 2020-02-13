<template>
    <div class="consensus-indicator flex-row">
        <div class="icon" :class="{
            'syncing': consensus === 'initializing' || consensus === 'syncing',
            'nq-green': consensus === 'established',
            'nq-red': consensus === 'lost',
        }">
            <WorldIcon/>
        </div>
        <span class="status">{{ text }}</span>
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';

import { useNetworkStore } from '../stores/Network';
import WorldIcon from './icons/WorldIcon.vue';

export default createComponent({
    setup() {
        const { state } = useNetworkStore();

        const consensus = computed(() => state.consensus);

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
            consensus,
            text,
        };
    },
    components: {
        WorldIcon,
    } as any,
});
</script>

<style lang="scss" scoped>
    .consensus-indicator {
        align-items: center;
        padding: 2rem 0 2rem 3rem;
        background: rgba(255, 255, 255, 0.07);
        color: rgba(255, 255, 255, 0.6);
    }

    .icon svg {
        display: block;
    }

    .syncing {
        animation: consensus-indicator-spin 1s linear infinite;
    }

    @keyframes consensus-indicator-spin {
        from { transform: rotateY(0deg) }
        to   { transform: rotateY(360deg) }
    }

    .status {
        margin: 0 1rem 0 1.5rem;
        text-transform: uppercase;
        font-size: 1.625rem;
        font-weight: bold;
        letter-spacing: 0.05em;
    }
</style>

<template>
    <div class="network">
        <div class="background"></div>
        <div class="network-inner">
            <h1>Coming soon!</h1>
            <div class="world-map">
                <NetworkMap />
            </div>
            <NetworkStats />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import NetworkMap from './NetworkMap.vue';
import NetworkStats from './NetworkStats.vue';

export default defineComponent({
    components: {
        NetworkMap,
        NetworkStats,
    },
});
</script>

<style lang="scss" scoped>
.network {
    background: var(--nimiq-blue-bg);
    color: white;

    .background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        background: var(--nimiq-blue);
        opacity: 0;
    }

    &.delay-leave-active .background {
        transition: opacity .75s var(--nimiq-ease);
    }

    &.delay-leave-to .background {
        opacity: 1;
    }

    .network-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-evenly;
        height: 100%;
    }

    h1 {
        display: flex;
        text-align: center;
    }

    .world-map {
        display: flex;
        text-align: center;
        margin: 0rem 5rem;
    }

    .network-stats {
        flex-grow: 0;
    }
}
</style>

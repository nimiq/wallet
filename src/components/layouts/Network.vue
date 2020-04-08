<template>
    <div class="network nq-blue-bg">
        <div class="background"></div>
        <div class="network-inner flex-column">
            <NetworkMap/>
            <NetworkStats/>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import NetworkMap from '../NetworkMap.vue';
import NetworkStats from '../NetworkStats.vue';

export default defineComponent({
    components: {
        NetworkMap,
        NetworkStats,
    },
});
</script>

<style lang="scss" scoped>
.network {
    position: relative;

    .background {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: -1;
        background: var(--nimiq-blue);
        opacity: 0;

        transition: opacity 0.75s var(--nimiq-ease);
    }

    &.delay-enter-to .background {
        opacity: 0;
    }

    &.delay-enter .background,
    &.delay-leave-to .background {
        opacity: 1;
    }

    .network-inner {
        align-items: center;
        justify-content: space-between;
        height: 100%;
    }

    .network-map {
        flex-grow: 1;
        flex-shrink: 1;
    }

    .network-stats {
        flex-shrink: 0;
        padding: 0 2.5rem 5rem;
    }
}
</style>

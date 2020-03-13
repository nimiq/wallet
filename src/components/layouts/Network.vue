<template>
    <div class="network nq-blue-bg">
        <div class="background"></div>
        <div class="network-inner flex-column">
            <NetworkMap/>
            <h1 class="coming-soon">Coming soon</h1>
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
    }

    &.delay-leave-active .background {
        transition: opacity .75s var(--nimiq-ease);
    }

    &.delay-leave-to .background {
        opacity: 1;
    }

    .network-inner {
        align-items: center;
        justify-content: space-between;
        height: 100%;
    }

    .coming-soon {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        font-size: 10rem;
        line-height: 1;
        margin-top: -12rem;
        text-align: center;
        opacity: 0.4;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .network-map {
        width: 100%;
        flex-grow: 1;
        padding: 7rem;
    }

    .network-stats {
        flex-shrink: 0;
        padding: 0 2.5rem 5rem;
    }
}
</style>

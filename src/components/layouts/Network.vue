<template>
    <div class="network nq-blue-bg">
        <div class="background"></div>
        <div class="network-inner flex-column">
            <div class="mobile-menu-bar flex-row">
                <button class="reset menu-button" @click="$router.back()"><MenuIcon/></button>
                <button class="nq-button-s inverse" @click="$router.replace('/account')">
                    {{ $t('Back to Addresses') }}
                </button>
                <button class="reset"><InfoCircleIcon/></button>
            </div>
            <div class="scroller map">
                <NetworkMap/>
            </div>
            <div class="scroller stats">
                <NetworkStats/>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { InfoCircleIcon } from '@nimiq/vue-components';
import NetworkMap from '../NetworkMap.vue';
import NetworkStats from '../NetworkStats.vue';
import MenuIcon from '../icons/MenuIcon.vue';

export default defineComponent({
    components: {
        NetworkMap,
        NetworkStats,
        MenuIcon,
        InfoCircleIcon,
    },
});
</script>

<style lang="scss" scoped>
.network {
    position: relative;

    &.delay-enter-to .background {
        opacity: 0;
    }

    &.delay-enter .background,
    &.delay-leave-to .background {
        opacity: 1;
    }
}

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

.network-inner {
    align-items: center;
    justify-content: space-between;
    height: 100%;
}

.scroller {
    max-width: 100vw;

    &.map {
        width: 100%;
        flex-grow: 1;
        flex-shrink: 1;
    }

    &.stats {
        flex-shrink: 0;
    }
}

.network-map {
    height: 100%;
}

.network-stats {
    padding-bottom: 5rem;
}

.mobile-menu-bar {
    display: none;
}

@media (max-width: 500px) { // Full mobile breakpoint
    .network-inner {
        align-items: flex-start;
    }

    .scroller {
        overflow-y: auto;
    }

    .network-map {
        // Take the screen height, subtract footer and header heights, and multiply with the ratio between
        // network map width and height.
        --height: calc(100vh - 10rem - 6.75rem - 2rem);
        height: var(--height);
        width: calc(var(--height) * (1082 / 502));
    }

    .network-stats {
        padding-bottom: 3rem;
    }

    .mobile-menu-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-self: stretch;
        padding: 2rem;
        padding-bottom: 0;
        z-index: 1;

        button.reset {
            padding: 1rem;
            opacity: 0.3;
            font-size: 2.5rem;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
        }

        .nq-button-s {
            opacity: 0.7;
        }
    }
}
</style>

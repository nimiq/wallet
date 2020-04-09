<template>
    <div id="app">
        <main>
            <Sidebar/>

            <transition name="delay">
                <router-view name="basement"/>
            </transition>

            <transition name="slide-right">
                <keep-alive>
                    <router-view name="groundfloor"/>
                </keep-alive>
            </transition>
        </main>

        <transition name="fade">
            <PreviewNoticeModal v-if="showPreviewNotice" :emitClose="true" @close="showPreviewNotice = false"/>
        </transition>
    </div><!-- #app -->
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

import Sidebar from './components/layouts/Sidebar.vue';
import PreviewNoticeModal from './components/modals/PreviewNoticeModal.vue';
import router, { provideRouter } from './router';
import { TESTNET_ORIGIN } from './lib/Constants';

export default defineComponent({
    name: 'app',
    setup() {
        provideRouter(router);

        const showPreviewNotice = ref(window.location.origin === TESTNET_ORIGIN);

        return {
            showPreviewNotice,
        };
    },
    components: {
        Sidebar,
        PreviewNoticeModal,
    },
});
</script>

<style scoped lang="scss">
@import './scss/mixins.scss';
#app {
    @include flex-full-height;
    overflow: hidden; // To prevent horizontal scrollbars during panel sliding

    /* Default: >= 1440px */
    --sidebar-width: 21rem;
    --account-column-width: 60rem;
    --address-column-width: 99rem;

    @media (max-width: 1319px) {
        --sidebar-width: 21rem;
        --account-column-width: 46.5rem;
        --address-column-width: 76.5rem;
    }

    @media (min-width: 1800px) {
        --sidebar-width: 25rem;
        --account-column-width: 75rem; // 80.75rem for fullscreen design
        --address-column-width: 110rem; // 134.25rem for fullscreen design
    }

    @media (min-width: 2000px) {
        --sidebar-width: 25rem;
        --account-column-width: 85rem;
        --address-column-width: 139rem;
    }

    main {
        @include flex-full-height;
        flex-direction: row;
        width: 100%;

        .sidebar {
            width: var(--sidebar-width);
            flex-shrink: 0;
        }

        .groundfloor {
            width: 100%;
            min-width: 0;
            position: relative;
        }

        /deep/ .account-overview {
            width: var(--account-column-width);
            flex-shrink: 0;
            z-index: 2;
        }

        /deep/ .address-overview {
            width: var(--address-column-width);
            min-width: 0;
            z-index: 3;
        }

        .network {
            position: absolute;
            top: 0;
            left: var(--sidebar-width);
            width: calc(100% - var(--sidebar-width));
            height: 100%;
            z-index: 0;
        }
    }
}
</style>

<style lang="scss">
:root {
    --transition-time: 0.75s;
}

@media (prefers-reduced-motion: reduce) {
    :root {
        --transition-time: 0s;
    }
}

.fade-enter-active, .fade-leave-active {
    transition: opacity var(--transition-time) var(--nimiq-ease);

    &.settings {
        // The address-overview is flex-row positioned next to the account-overview.
        // The settings view has a very different width than the account-overview,
        // So to not disturb the relative positioning of the address-overview during
        // the slide-right animation, the settings content must be positioned absolute.
        position: absolute;
        left: 0;
        top: 0;
    }

    &.backdrop { // Modals
        transition-duration: 0.4s;
    }
}

.fade-enter-active.account-overview,
.fade-enter-active.settings {
    transition-delay: calc(var(--transition-time) / 2);
}

.fade-enter,
.fade-leave-to {
    opacity: 0 !important;
}

.network {
    &.delay-leave-active {
        /* the network can only disappear once the other transitions are finished so add a delay */
        transition-delay: var(--transition-time);
    }
}

.groundfloor,
.address-overview {
    transition: transform var(--transition-time) var(--nimiq-ease);
}

.groundfloor {
    &.slide-right-enter,
    &.slide-right-leave-to {
        transform: translate3d(calc(100vw - var(--sidebar-width)), 0, 0);
    }
}

.address-overview {
    &.slide-right-enter,
    &.slide-right-leave-to {
        transform: translate3d(calc(100vw - var(--account-column-width) - var(--sidebar-width)), 0, 0);
    }

    .slide-right-enter &,
    .slide-right-leave-to & {
        transform: translate3d(calc(-1 * var(--account-column-width)), 0, 0);
    }
}
</style>

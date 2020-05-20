<template>
    <div id="app">
        <main :class="routeClass">
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
            <PreviewNoticeModal v-if="showPreviewNotice" emitClose @close="showPreviewNotice = false"/>
        </transition>
    </div><!-- #app -->
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';

import Sidebar from './components/layouts/Sidebar.vue';
import PreviewNoticeModal from './components/modals/PreviewNoticeModal.vue';
import router, { provideRouter, Columns } from './router';
import { TESTNET_ORIGIN } from './lib/Constants';

export default defineComponent({
    name: 'app',
    setup(props, context) {
        provideRouter(router);

        const showPreviewNotice = ref(window.location.origin === TESTNET_ORIGIN);

        const routeClass = ref('');

        watch(() => context.root.$route.meta, (meta) => {
            if (!meta) return;
            // Using a watcher, because the routeClass should only change when a route is visited
            // that may require a column navigation. When opening modals, we don't want to change
            // column.
            switch (meta.column) {
                case Columns.DYNAMIC:
                    switch (context.root.$route.path) {
                        case '/': routeClass.value = 'column-root'; break;
                        case '/account': routeClass.value = 'column-account'; break;
                        case '/transactions': routeClass.value = 'column-address'; break;
                        default: break;
                    }
                    break;
                case Columns.ACCOUNT: routeClass.value = 'column-account'; break;
                case Columns.ADDRESS: routeClass.value = 'column-address'; break;
                default: break;
            }
        });

        return {
            showPreviewNotice,
            routeClass,
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
    --sidebar-width: 23rem;
    --account-column-width: 60rem;
    --address-column-width: 99rem;

    @media (max-width: 1369px) {
        --account-column-width: 59rem;
    }

    @media (max-width: 1319px) {
        --account-column-width: 52rem;
        --address-column-width: 92rem;
    }

    @media (max-width: 1199px) {
        --account-column-width: 47rem;
    }

    @media (max-width: 500px) { // Full mobile breakpoint
        --account-column-width: 100vw;
        --address-column-width: 100vw;
    }

    @media (min-width: 1800px) {
        --account-column-width: 75rem; // 80.75rem for fullscreen design
        --address-column-width: 110rem; // 134.25rem for fullscreen design
    }

    @media (min-width: 2000px) {
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

        /deep/ .mobile-tap-area {
            z-index: 4;
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

    @media (max-width: 500px) { // Full mobile breakpoint
        main {
            width: calc(var(--sidebar-width) + 200vw);
            transition: transform var(--transition-time) var(--nimiq-ease);

            /deep/ .address-overview {
                min-width: unset;
            }

            .network {
                width: 100vw;
            }

            &.column-root {
                /deep/ .mobile-tap-area {
                    opacity: 1;
                    pointer-events: all;
                }
            }

            &.column-account {
                // Account column
                transform: translateX(calc(-1 * var(--sidebar-width)));
            }

            &.column-address {
                // Address column
                transform: translateX(calc(-1 * var(--sidebar-width) - 100vw));
            }
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

@media (max-width: 500px) { // Full mobile breakpoint
    :root {
        --transition-time: 0.5s;
    }
}

.identicon img,
.nq-icon {
    display: block;
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

@media (max-width: 500px) { // Full mobile breakpoint
    .groundfloor {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(100vw, 0, 0);
        }
    }

    .address-overview {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(0, 0, 0);
        }
    }
}
</style>

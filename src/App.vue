<template>
    <div id="app" :class="{'value-masked': amountsHidden}">
        <main :class="routeClass" ref="$main">
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

        <SwapNotification/>

        <UpdateNotification/>

        <div v-if="!hasAccounts" class="loader flex-row">
            <LoadingSpinner/>
        </div>
    </div><!-- #app -->
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted, Ref } from '@vue/composition-api';
import { LoadingSpinner } from '@nimiq/vue-components';

import Sidebar from './components/layouts/Sidebar.vue';
import SwapNotification from './components/swap/SwapNotification.vue';
import UpdateNotification from './components/UpdateNotification.vue';
import router, { provideRouter, Columns } from './router';
import { useAccountStore } from './stores/Account';
import { useSettingsStore } from './stores/Settings';
import { useWindowSize } from './composables/useWindowSize';
import { useSwipes } from './composables/useSwipes';

export default defineComponent({
    name: 'app',
    setup(props, context) {
        provideRouter(router);

        const routeClass = ref('');

        watch(() => context.root.$route.meta, (meta) => {
            if (!meta) return;
            // Using a watcher, because the routeClass should only change when a route is visited
            // that may require a column navigation. When opening modals, we don't want to change
            // column.
            switch (meta.column) {
                case Columns.DYNAMIC:
                    switch (context.root.$route.path) {
                        case '/': routeClass.value = 'column-account'; break;
                        case '/transactions': routeClass.value = 'column-address'; break;
                        default: break; // Don't change column
                    }
                    break;
                case Columns.ACCOUNT: routeClass.value = 'column-account'; break;
                case Columns.ADDRESS: routeClass.value = 'column-address'; break;
                default: break;
            }
        });

        watch(() => context.root.$route.query, (newQuery, oldQuery) => {
            if (!newQuery) return;
            if (newQuery.sidebar) {
                routeClass.value = 'column-sidebar';
            } else if (oldQuery && oldQuery.sidebar) {
                routeClass.value = 'column-account';
            }
        });

        const { accountInfos } = useAccountStore();
        // Convert result of computation to boolean, to not trigger rerender when number of accounts changes above 0.
        const hasAccounts = computed(() => Boolean(Object.keys(accountInfos.value).length));

        const { amountsHidden } = useSettingsStore();

        // Swiping

        const $main = ref<HTMLDivElement>(null);
        const { width } = useWindowSize();

        function updateSwipeRestPosition(
            velocityDistance: number,
            velocityTime: number,
            initialXPosition: number,
            currentXPosition: number,
        ) {
            if (velocityDistance && velocityTime) {
                const swipeFactor = 10;
                const velocity = (velocityDistance! / velocityTime!) * 1000 * swipeFactor; // px/s
                const remainingXDistance = Math.sqrt(Math.abs(velocity)) * (velocity / Math.abs(velocity));
                // console.log(`Travelled ${velocity}px/s, will travel ${remainingXDistance}px more`);
                currentXPosition += remainingXDistance;
            }

            const sidebarBarrier = -192 / 2;
            const transactionsBarrier = -(document.body.offsetWidth / 2 + 192);

            if (currentXPosition >= sidebarBarrier && (initialXPosition) < sidebarBarrier) {
                // Go to sidebar
                context.root.$router.push({ name: 'root', query: { sidebar: 'true' } });
            } else if (currentXPosition <= transactionsBarrier && (initialXPosition) > transactionsBarrier) {
                // Go to transactions
                context.root.$router.push('/transactions');
            } else if (
                (currentXPosition <= sidebarBarrier && currentXPosition >= transactionsBarrier)
                && (initialXPosition > sidebarBarrier || initialXPosition < transactionsBarrier)
            ) {
                // Go back to root (addresses)
                context.root.$router.back();
            }
        }

        const { attachSwipe, detachSwipe } = useSwipes($main as Ref<HTMLDivElement>, {
            onSwipeEnded: updateSwipeRestPosition,
            clampMovement: computed<[number, number]>(() => [-width.value - 192, 0]),
        });

        watch(width, (newWidth, oldWidth) => {
            if (!$main.value) return;

            if (newWidth <= 700 && oldWidth > 700) {
                attachSwipe();
            } else if (newWidth > 700) {
                detachSwipe();
            }
        }, { lazy: true });

        onMounted(() => {
            if (width.value <= 700) attachSwipe();
        });

        return {
            routeClass,
            hasAccounts,
            amountsHidden,
            $main,
        };
    },
    components: {
        Sidebar,
        SwapNotification,
        UpdateNotification,
        LoadingSpinner,
    },
});
</script>

<style scoped lang="scss">
@import './scss/mixins.scss';
#app {
    @include flex-full-height;
    @include ios-flex;
    overflow: hidden; // To prevent horizontal scrollbars during panel sliding
    touch-action: pan-y;

    /* Default: >= 1500px */
    --sidebar-width: 24rem;
    --account-column-width: 70rem;
    --address-column-width: 150rem;

    @media (max-width: 1499px) {
        --account-column-width: 65rem;
    }

    @media (max-width: 1409px) {
        --account-column-width: 59rem;
    }

    @media (max-width: 1319px) {
        --account-column-width: 52rem;
    }

    @media (max-width: 1199px) {
        --account-column-width: 47.5rem;
    }

    @media (max-width: 960px) { // Tablet breakpoint
        --account-column-width: 35.125rem;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        --account-column-width: 100vw;
        --address-column-width: 100vw;
    }

    @media (min-width: 1800px) {
        --account-column-width: 80.75rem;
    }

    @media (min-width: 2000px) {
        --account-column-width: 85rem;
    }

    main {
        @include flex-full-height;
        flex-direction: row;
        width: 100%;
        position: relative;

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

    .loader {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        justify-content: center;
        align-items: center;
        background: var(--nimiq-gray);
        z-index: 100;
    }

    @media (max-width: 1160px) { // Half mobile breakpoint
        main {
            width: calc(var(--sidebar-width) + 100vw);
            transition: transform var(--transition-time) var(--nimiq-ease);

            .network,
            .groundfloor {
                width: 100vw;
            }

            &.column-sidebar {
                /deep/ .mobile-tap-area {
                    opacity: 1;
                    pointer-events: all;
                }
            }

            &.column-account,
            &.column-address {
                // Account column
                transform: translateX(calc(-1 * var(--sidebar-width)));
            }
        }
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        main {
            width: calc(var(--sidebar-width) + 200vw);

            .groundfloor {
                width: 100%;
            }

            /deep/ .address-overview {
                min-width: unset;
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
body {
    overscroll-behavior-y: contain; // Disable pull-to-refresh
}

:root {
    --transition-time: 0.75s;
}

@media (max-width: 1160px) { /* Half mobile breakpoint */
    :root {
        --transition-time: 0.5s;
    }
}

.identicon img,
.nq-icon {
    display: block;
}

.fade-enter-active, .fade-leave-active {
    transition: opacity var(--transition-time) cubic-bezier(0.5, 0, 0.15, 1);

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
    transition: transform var(--transition-time) cubic-bezier(0.5, 0, 0.15, 1);
    will-change: transform;
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

@media (max-width: 1160px) { // Half mobile breakpoint
    .groundfloor {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(100vw, 0, 0);
        }
    }

    .address-overview {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(calc(100vw - var(--account-column-width)), 0, 0);
        }
    }
}

@media (max-width: 700px) { // Full mobile breakpoint

    .address-overview {
        &.slide-right-enter,
        &.slide-right-leave-to {
            transform: translate3d(0, 0, 0);
        }
    }
}

.value-masked [value-mask] {
    font-size: 0 !important;
}

.value-masked [value-mask]::after {
    content: '•••••';
    font-size: var(--size);
    font-weight: 900;
    letter-spacing: 0.125em;
    margin-right: -0.125em;

    // Move dots up a little, to be vertically centered
    position: relative;
    top: -0.09em;
}

// Overwrites for AccountBalance
.value-masked .account-balance > .fiat-amount > [value-mask] {
    line-height: 0;
}
.value-masked .account-balance > .fiat-amount > [value-mask]::after {
    letter-spacing: 0.375em;
    margin-right: -0.375em;
}
</style>

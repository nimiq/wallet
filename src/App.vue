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
import { defineComponent, ref, watch, computed, onMounted } from '@vue/composition-api';
import { LoadingSpinner } from '@nimiq/vue-components';

import Sidebar from './components/layouts/Sidebar.vue';
import SwapNotification from './components/swap/SwapNotification.vue';
import UpdateNotification from './components/UpdateNotification.vue';
import router, { provideRouter, Columns } from './router';
import { useAccountStore } from './stores/Account';
import { useSettingsStore } from './stores/Settings';
import { useWindowSize } from './composables/useWindowSize';

/* global WebKitCSSMatrix */

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

        // https://developers.google.com/web/fundamentals/design-and-ux/input/touch
        type Point = {x: number, y: number};
        let initialXPosition: number | null = null;
        let initialTouchPos: Point | null = null;
        let lastTouchPos: Point | null = null;
        let rafPending = false;
        const $main = ref<HTMLDivElement>(null);

        function getGesturePointFromEvent(evt: PointerEvent | TouchEvent) {
            if ('targetTouches' in evt) {
                // Prefer Touch Events
                const point: Point = {
                    x: evt.targetTouches[0].clientX,
                    y: evt.targetTouches[0].clientY,
                };
                return point;
            }

            // Either Mouse event or Pointer Event
            const point: Point = {
                x: evt.clientX,
                y: evt.clientY,
            };
            return point;
        }

        function getXPosition(element: HTMLDivElement): number {
            return new (DOMMatrix || WebKitCSSMatrix)(getComputedStyle(element).transform).m41;
        }

        // Handle the start of gestures
        function handleGestureStart(evt: PointerEvent | TouchEvent) {
            evt.preventDefault();

            if ('touches' in evt && evt.touches.length > 1) return;

            initialTouchPos = getGesturePointFromEvent(evt);
            initialXPosition = getXPosition($main.value!);

            $main.value!.style.transition = 'initial';
        }

        function handleGestureMove(evt: PointerEvent | TouchEvent) {
            evt.preventDefault();

            if (!initialTouchPos) return;

            lastTouchPos = getGesturePointFromEvent(evt);

            if (rafPending) return;

            rafPending = true;
            window.requestAnimationFrame(onAnimFrame);
        }

        function handleGestureEnd(evt: PointerEvent | TouchEvent | MouseEvent) {
            evt.preventDefault();

            if ('touches' in evt && evt.touches.length > 0) return;

            rafPending = false;

            updateSwipeRestPosition();

            initialXPosition = null;
            initialTouchPos = null;
            lastTouchPos = null;
        }

        function onAnimFrame() {
            if (!rafPending || !initialTouchPos || !lastTouchPos || !initialXPosition) return;

            const differenceInX = initialTouchPos.x - lastTouchPos.x;
            const maxOffset = document.body.offsetWidth + 192;
            const newXPosition = Math.min(0, Math.max(initialXPosition - differenceInX, -maxOffset));
            $main.value!.style.transform = `translateX(${newXPosition}px)`;

            rafPending = false;
        }

        function updateSwipeRestPosition() {
            if (initialXPosition !== null) {
                const currentXPosition = getXPosition($main.value!);

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

            $main.value!.style.transition = '';
            $main.value!.style.transform = '';
        }

        function addEventListeners() {
            const target = $main.value!;

            // Check if pointer events are supported.
            if (window.PointerEvent) {
                // Add Pointer Event Listener
                target.addEventListener('pointerdown', handleGestureStart, true);
                target.addEventListener('pointermove', handleGestureMove, true);
                target.addEventListener('pointerup', handleGestureEnd, true);
                target.addEventListener('pointercancel', handleGestureEnd, true);
            } else {
                // Add Touch Listener
                target.addEventListener('touchstart', handleGestureStart, true);
                target.addEventListener('touchmove', handleGestureMove, true);
                target.addEventListener('touchend', handleGestureEnd, true);
                target.addEventListener('touchcancel', handleGestureEnd, true);
            }
        }

        function removeEventListeners() {
            const target = $main.value!;

            // Check if pointer events are supported.
            if (window.PointerEvent) {
                // Add Pointer Event Listener
                target.removeEventListener('pointerdown', handleGestureStart, true);
                target.removeEventListener('pointermove', handleGestureMove, true);
                target.removeEventListener('pointerup', handleGestureEnd, true);
                target.removeEventListener('pointercancel', handleGestureEnd, true);
            } else {
                // Add Touch Listener
                target.removeEventListener('touchstart', handleGestureStart, true);
                target.removeEventListener('touchmove', handleGestureMove, true);
                target.removeEventListener('touchend', handleGestureEnd, true);
                target.removeEventListener('touchcancel', handleGestureEnd, true);
            }
        }

        const { width } = useWindowSize();

        watch(width, (newWidth, oldWidth) => {
            if (!$main.value) return;

            if (newWidth <= 700 && oldWidth > 700) {
                addEventListeners();
            } else if (newWidth > 700) {
                removeEventListeners();
            }
        }, { lazy: false });

        onMounted(() => {
            if (width.value <= 700) addEventListeners();
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

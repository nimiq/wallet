<template>
    <div class="modal backdrop flex-column" v-pointerdown="checkTouchStart" @click.self="onBackdropClick">
        <div class="wrapper flex-column" @click.self="onBackdropClick" ref="main$">
            <SmallPage
                class="main"
                :class="{ 'smallen': showOverlay, 'swipe-padding': showSwipeHandle && swipePadding }"
            >
                <div v-if="showSwipeHandle" class="swipe-handle flex-row" ref="handle$">
                    <div class="swipe-bar"></div>
                </div>
                <slot/>
                <CloseButton class="top-right" :class="{'inverse': closeButtonInverse}" @click="close"/>
                <transition name="fade">
                    <div v-if="showOverlay" class="cover"></div>
                </transition>
            </SmallPage>

            <transition name="overlay">
                <SmallPage v-if="showOverlay" class="overlay">
                    <slot name="overlay"/>
                    <CloseButton class="top-right" :class="{'inverse': closeButtonInverse}" @click="close"/>
                </SmallPage>
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, Ref, ref, watch } from '@vue/composition-api';
import { SmallPage, CloseButton } from '@nimiq/vue-components';
import { useRouter } from '@/router';
import { nextTick } from '@/lib/nextTick';
import { useWindowSize } from '../../composables/useWindowSize';
import { useSwipes } from '../../composables/useSwipes';
import { useSettingsStore } from '../../stores/Settings';
import { pointerdown } from '../../directives/PointerEvents';

export function enableModalTransition() {
    document.body.classList.remove('modal-transition-disabled');
}

export function disableNextModalTransition() {
    document.body.classList.add('modal-transition-disabled');
    // the modal transitions are enabled again in onMounted in the next modal component instance
}

const Modal = defineComponent({
    props: {
        emitClose: {
            type: Boolean,
            default: false,
        },
        showOverlay: {
            type: Boolean,
            default: false,
        },
        closeButtonInverse: {
            type: Boolean,
            default: false,
        },
        swipeToClose: {
            type: Boolean,
            default: true,
        },
        swipePadding: {
            type: Boolean,
            default: true,
        },
    },
    setup(props, context) {
        const router = useRouter();

        function close() {
            if (props.showOverlay) {
                context.emit('close-overlay');
                return;
            }

            if (props.emitClose) {
                context.emit('close');
            } else {
                forceClose();
            }
        }

        async function forceClose() {
            // Ensures that we close all the modals that we navigated through, so flows that opens multiple modals in
            // different steps are closed one after the other.
            // For example: choose a sender via AddressSelectorModal -> open qr scanner from SendModal -> after scan in
            // ScanQrModal return to SendModal -> abort the action in SendModal

            while (router.currentRoute.matched.find((routeRecord) => 'modal' in routeRecord.components
                || 'persistent-modal' in routeRecord.components
                || Object.values(routeRecord.components).some((component) => /modal/i.test(
                    'name' in component ? component.name as string : '')))
            ) {
                router.back();

                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => {
                    window.addEventListener('popstate', resolve, { once: true });
                });
            }
        }

        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
            }
        };

        document.addEventListener('keydown', onEscape);

        onUnmounted(() => {
            document.removeEventListener('keydown', onEscape);
        });

        // Swiping
        const main$ = ref<HTMLDivElement>(null);
        const handle$ = ref<HTMLDivElement>(null);
        const showSwipeHandle = ref(false);

        async function updateSwipeRestPosition(
            velocityDistance: number,
            velocityTime: number,
            initialYPosition: number,
            currentYPosition: number,
        ) {
            if (velocityDistance && velocityTime) {
                const swipeFactor = 10;
                const velocity = (velocityDistance / velocityTime) * 1000 * swipeFactor; // px/s
                const remainingYDistance = Math.sqrt(Math.abs(velocity)) * (velocity / Math.abs(velocity));
                currentYPosition += remainingYDistance;
            }

            const closeBarrier = 160; // 20rem = 160px

            if (currentYPosition >= closeBarrier && initialYPosition < closeBarrier) {
                // Close modal
                close();
                await nextTick();
            }
        }

        if (props.swipeToClose) {
            const { isMobile, height } = useWindowSize();
            const { swipingEnabled } = useSettingsStore();

            const { attachSwipe, detachSwipe } = useSwipes(main$ as Ref<HTMLDivElement>, {
                onSwipeEnded: updateSwipeRestPosition,
                clampMovement: computed<[number, number]>(() => [0, height.value]),
                vertical: true,
                handle: handle$ as Ref<HTMLDivElement>,
            });

            watch(isMobile, (isMobileNow, wasMobile) => {
                if (!main$.value) return;

                if (isMobileNow && !wasMobile && swipingEnabled.value === 1) {
                    showSwipeHandle.value = true;
                    nextTick(attachSwipe);
                } else if (!isMobileNow && showSwipeHandle.value) {
                    detachSwipe();
                    showSwipeHandle.value = false;
                }
            }, { lazy: true });

            if (isMobile.value && swipingEnabled.value === 1) {
                showSwipeHandle.value = true;
                onMounted(attachSwipe);
            }
        }

        // Backdrop click handling
        let touchStartedOnBackdrop = false;

        function checkTouchStart(e: Event) {
            touchStartedOnBackdrop = !!e.target && (e.target as HTMLDivElement).matches('.backdrop, .wrapper');
        }

        function onBackdropClick() {
            if (!touchStartedOnBackdrop) return;
            close();
        }

        onMounted(() => {
            setTimeout(() => {
                enableModalTransition();
            }, 100);
        });

        return {
            forceClose, // exposed for use from other components

            close,
            main$,
            handle$,
            showSwipeHandle,
            checkTouchStart,
            onBackdropClick,
        };
    },
    directives: {
        pointerdown,
    },
    components: {
        SmallPage,
        CloseButton,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type Modal = InstanceType<typeof Modal>;
export default Modal;
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";
@import '../../scss/functions.scss';

.backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 5;
    width: 100%;
    height: 100%;
    background: nimiq-blue(0.6);
    align-items: center;
    justify-content: center;

    .small-page {
        margin: 0;
        width: 52.5rem; /* 420px */
        max-width: 100vw;
        max-height: 100%;
    }
}

.wrapper {
    position: relative;
    max-height: 96%;
    will-change: transform, opacity;
}

.small-page.main {
    transition: transform var(--transition-time) var(--nimiq-ease);
    transform-origin: center bottom;
    overscroll-behavior: contain; // Disable scroll-chaining to the app

    height: auto;
    min-height: unquote("min(70.5rem, 96vh)"); // Uses unquote() to prevent SASS from falsely parsing the min() function

    &.smallen {
        transform: scale(0.942857143) translateY(1.5rem);
    }
}

.cover {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 5;
    background: nimiq-blue(0.5);
    border-radius: 1.25rem;
}

.overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    will-change: transform;
    overscroll-behavior: contain; // Disable scroll-chaining to the app
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .backdrop {
        justify-content: flex-end;
    }

    .wrapper {
        position: fixed; // Must be fixed so the bottom is not cut off by iOS Safari's bottom bar
        bottom: 0;
        height: 96%; // Must be a fixed height value (not max-height) to force children to limit their height
        justify-content: flex-end;
    }

    .small-page,
    .cover {
        border-radius: 1.25rem 1.25rem 0 0;

        overflow-y: auto;

        ::v-deep .page-body {
            overflow-y: unset;
        }
    }

    .small-page.main {
        transform-origin: center top;
        position: relative;

        &.smallen {
            transform: scale(0.942857143) translateY(-1.5rem);
        }

        &.swipe-padding {
            padding-top: 0.5rem;
        }
    }

    .swipe-handle {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: 4rem;
        touch-action: none; // To let Javascript handle touch events
        justify-content: center;
        z-index: 1; // To be above .page-header

        .swipe-bar {
            width: 5rem;
            height: 0.5rem;
            border-radius: 1rem;
            margin-top: 1rem;
            background: var(--text-14);
        }
    }

    .close-button {
        z-index: 2; // To be above .swipe-handle
    }
}
</style>

<style lang="scss">
@import "../../scss/variables.scss";

:root {
    --modal-transition-time: 0.45s;
    --overlay-transition-time: 0.65s;
}

.modal-transition-disabled {
    --modal-transition-time: 0;
}

.wrapper {
    transition:
        opacity calc(0.55 * var(--modal-transition-time)) cubic-bezier(0.4, 0, 0.2, 1),
        transform var(--modal-transition-time) var(--nimiq-ease);
}

.modal-enter-active, .modal-leave-active {
    transition: background-color var(--modal-transition-time) cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-leave-active, .modal-leave-to {
    pointer-events: none;
}

.modal-enter, .modal-leave-to {
    background-color: nimiq-blue(0) !important;

    .wrapper {
        opacity: 0 !important;
        transform: translate3D(0, 2rem, 0) scale(0.99);
    }
}

.overlay-enter-active {
    transition: transform var(--overlay-transition-time) cubic-bezier(.3, 1, 0.2, 1);
}

.overlay-leave-active {
    transition: transform var(--overlay-transition-time) cubic-bezier(0.3, 0, 0, 1);
}

.overlay-enter, .overlay-leave-to {
    /**
     * 100% is the height of the overlay
     * 100vh is the height of the viewport
     *
     * To adapt the animation distance to the screen height (because we don't want the overlay to only
     * animate part of the way on larger screens, or ultra-fast on smaller screens), we calculate the
     * distance between the top of the overlay to the top of the viewport [(100vh - 100%) / 2] and add
     * the height of the overlay to it [+ 100%]. Then we just turn it around into a negative distance
     * [-1 *] so it animates from and to the top, and we add a little extra [1.1 = +10%] so the easing
     * doesn't stop at the top of the viewport.
     */
    transform: translate3D(0, calc(-1.1 * ((100vh - 100%) / 2 + 100%)), 0);
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .modal-enter, .modal-leave-to {
        .wrapper {
            opacity: 1 !important;
            transform: translate3D(0, 100%, 0);
        }
    }

    .overlay-enter,
    .overlay-leave-to {
        /**
         * 100% is the height of the overlay
         */
        transform: translate3D(0, 100%, 0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .modal-enter, .modal-leave-to {
        .wrapper {
            opacity: 0 !important;
            transform: none;
        }
    }

    /* Instead of translating the overlay, simply fade it in */
    .overlay-enter-active, .overlay-leave-active {
        transition: opacity var(--overlay-transition-time) var(--nimiq-ease);
    }

    .overlay-enter, .overlay-leave-to {
        opacity: 0;
    }
}
</style>

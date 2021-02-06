<template>
    <div class="modal backdrop flex-column" @mousedown.self="close" @touchstart.self="close">
        <div class="wrapper flex-column" @mousedown.self="close" @touchstart.self="close">
            <SmallPage class="main" :class="{'smallen': showOverlay}">
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
import { defineComponent, onUnmounted } from '@vue/composition-api';
import { SmallPage, CloseButton } from '@nimiq/vue-components';

export default defineComponent({
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
    },
    setup(props, context) {
        function close() {
            if (props.showOverlay) {
                context.emit('close-overlay');
                return;
            }

            if (props.emitClose) {
                context.emit('close');
            } else {
                context.root.$router.back();
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

        return {
            close,
        };
    },
    components: {
        SmallPage,
        CloseButton,
    },
});
</script>

<style lang="scss" scoped>
.backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 5;
    width: 100%;
    height: 100%;
    background: rgba(31, 35, 72, 0.6);
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
}

.main {
    transition: transform var(--transition-time) var(--nimiq-ease);
    transform-origin: center bottom;
    overscroll-behavior: contain; // Disable scroll-chaining to the app

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
    background: rgba(31, 35, 72, 0.5);
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

@media (max-width: 700px) { // Full mobile breakpoint
    .backdrop {
        justify-content: flex-end;
    }

    .wrapper {
        position: fixed; // Must be fixed so the bottom is not cut off by iOS Safari's bottom bar
        bottom: 0;
        height: 96%; // Must be a fixed heigth value (not max-height) to force children to limit their height
        justify-content: flex-end;
    }

    .small-page,
    .cover {
        border-radius: 1.25rem 1.25rem 0 0;
    }

    .main {
        transform-origin: center top;
        position: relative;

        &.smallen {
            transform: scale(0.942857143) translateY(-1.5rem);
        }
    }
}
</style>

<style lang="scss">
:root {
    --modal-transition-time: 0.45s;
    --overlay-transition-time: 0.65s;
}

.modal-enter-active, .modal-leave-active {
    transition: background-color var(--modal-transition-time) cubic-bezier(0.4, 0, 0.2, 1);

    .wrapper {
        transition:
            opacity calc(0.55 * var(--modal-transition-time)) cubic-bezier(0.4, 0, 0.2, 1),
            transform var(--modal-transition-time) var(--nimiq-ease);
    }
}

.modal-leave-active, .modal-leave-to {
    pointer-events: none;
}

.modal-enter, .modal-leave-to {
    background-color: rgba(31, 35, 72, 0) !important;

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
     * animate part of the way on larger screens, or ultra-fast on smaller screens), we calculcate the
     * distance between the top of the overlay to the top of the viewport [(100vh - 100%) / 2] and add
     * the heigh of the overlay to it [+ 100%]. Then we just turn it around into a negative distance
     * [-1 *] so it animates from and to the top, and we add a little extra [1.1 = +10%] so the easing
     * doesn't stop at the top of the viewport.
     */
    transform: translate3D(0, calc(-1.1 * ((100vh - 100%) / 2 + 100%)), 0);
}

@media (max-width: 700px) { // Full mobile breakpoint
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

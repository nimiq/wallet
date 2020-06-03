<template>
    <div class="modal backdrop flex-column" @click="close">
        <div class="wrapper" @click.stop>
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
    background: rgba(31, 35, 72, 0.5);
    border-radius: 1rem;
}

.overlay {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .backdrop {
        justify-content: flex-end;
    }

    .small-page,
    .cover {
        border-radius: 2.5rem 2.5rem 0 0;
    }

    .main {
        transform-origin: center top;

        &.smallen {
            transform: scale(0.942857143) translateY(-1.5rem);
        }
    }
}
</style>

<style lang="scss">

.modal-enter-active, .modal-leave-active {
    transition: background-color 0.45s cubic-bezier(0.4,0,0.2,1);

    /deep/ .nq-card {
        transition: opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.45s var(--nimiq-ease);
    }
}

.modal-leave-active, .modal-leave-to {
    pointer-events: none;
}

.modal-enter, .modal-leave-to {
    background-color: rgba(31, 35, 72, 0) !important;

    /deep/ .nq-card {
        opacity: 0 !important;
        transform: translate3D(0,16px,0) scale(0.99);
    }
}

.overlay-enter-active, .overlay-leave-active {
    transition: transform 0.75s cubic-bezier(0.4,0,0,1);
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
    transform: translateY(calc(-1.1 * ((100vh - 100%) / 2 + 100%)));
}

@media (max-width: 700px) { // Full mobile breakpoint
    .modal-enter-active, .modal-leave-active {
        transition:
            background-color var(--transition-time) var(--nimiq-ease),
            // Need to 'animate' opacity to ensure modal stays visible during leave transition
            opacity 0s;
    }

    .modal-leave-active {
        // Delay opacity transition during leave transition to ensure modal stays visible
        transition-delay: 0s, var(--transition-time);
    }

    .modal-enter, .modal-leave-to {
        background-color: rgba(31, 35, 72, 0) !important;
    }

    .modal-enter-active .wrapper,
    .modal-leave-active .wrapper {
        transition: transform var(--transition-time) var(--nimiq-ease);
    }

    .modal-enter .wrapper,
    .modal-leave-to .wrapper {
        transform: translateY(100%);
    }

    .overlay-enter,
    .overlay-leave-to {
        /**
         * 100% is the height of the overlay
         */
        transform: translateY(100%);
    }
}
</style>

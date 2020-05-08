<template>
    <div class="modal backdrop" @click="close">
        <div class="wrapper" @click.stop>
            <SmallPage class="main" :class="{'smallen': showOverlay}">
                <slot/>
                <CloseButton class="top-right" @click="close"/>
            </SmallPage>

            <transition name="slide-top">
                <SmallPage v-if="showOverlay" class="overlay">
                    <slot name="overlay"/>
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
    },
    setup(props, context) {
        function close() {
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
    background: rgba(31, 35, 72, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;

    --movement-duration: 0.5s;

    .wrapper {
        position: relative;

        .small-page {
            margin: 0;
            width: 52.5rem; /* 420px */
        }
    }

    .main {
        transition:
            transform var(--movement-duration) var(--nimiq-ease),
            filter var(--movement-duration) var(--nimiq-ease);
        transform-origin: center bottom;

        &.smallen {
            transform: scale(0.942857143) translateY(1.5rem);
            filter: brightness(0.6);
        }
    }

    .overlay {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
    }
}

.slide-top-enter-active, .slide-top-leave-active {
    transition: transform var(--movement-duration) var(--nimiq-ease);
}

.slide-top-enter,
.slide-top-leave-to {
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
</style>

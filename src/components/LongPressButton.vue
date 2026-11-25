<template>
    <button
        class="long-press-button nq-button"
        :class="color"
        @mousedown.left.prevent="isPressed = true; /* also prevent focus. mouseup is registered on document */"
        @touchstart.prevent="isPressed = true; /* also prevent context menu on long press */"
        @keydown.enter.space.prevent="isPressed = true; /* also prevent triggering clicks */"
        @touchend="isPressed = false"
        @keyup.enter.space="isPressed = false"
        @blur="isPressed = false /* if focus moves away, release the button */"
        @click.prevent.stop="$event.stopImmediatePropagation(); /* don't trigger handlers */"
        @submit.prevent.stop="$event.stopImmediatePropagation(); /* don't trigger handlers and default behavior */"
    >
        <span class="mix-blend-mode-mask">
            <transition name="transition-indicator">
                <div v-if="isPressed" class="indicator" :style="`--transition-time: ${duration}ms`" />
            </transition>
            <!-- Do not show/hide label, prompt and subline via v-if and instead always keep them in the DOM to avoid
            the button changing its size when switching between the texts. -->
            <label :class="{ show: !showKeepPressingPrompt, center: isPressed && $slots.subline }"><slot /></label>
            <label :class="{ show: showKeepPressingPrompt, center: isPressed && $slots.subline }">{{
                $t('Keep pressing…')
            }}</label>
            <span v-if="$slots.subline" class="subline" :class="{ show: !isPressed }"><slot name="subline" /></span>
        </span>
    </button>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';

export default defineComponent({
    props: {
        duration: {
            type: Number,
            default: 3000, // ms
        },
        color: {
            type: String,
            default: 'light-blue',
        },
    },
    emits: ['long-press'],
    setup(props, context) {
        const isPressed = ref(false);
        const showKeepPressingPrompt = ref(false);
        let keepPressingTimeout = -1;
        let longPressTimeout = -1;

        // Register mouseup on document instead of on the button to detect it even if the mouse moved away. For touchend
        // and keyup, listening on the button suffices.
        onMounted(() => {
            document.addEventListener('mouseup', onMouseup);
        });
        onUnmounted(() => {
            document.removeEventListener('mouseup', onMouseup);
        });

        function onMouseup() {
            isPressed.value = false;
        }

        watch(isPressed, (newIsPressed) => {
            if (newIsPressed) {
                keepPressingTimeout = window.setTimeout(
                    () => (showKeepPressingPrompt.value = true),
                    props.duration * 0.4,
                );
                longPressTimeout = window.setTimeout(() => context.emit('long-press'), props.duration);
            } else {
                window.clearTimeout(keepPressingTimeout);
                window.clearTimeout(longPressTimeout);
                showKeepPressingPrompt.value = false;
            }
        });

        return {
            isPressed,
            showKeepPressingPrompt,
        };
    },
});
</script>

<style lang="scss" scoped>
.long-press-button {
    --label-height: 2.5rem; // variable that can be overwritten if custom content has a different height
    --subline-height: 2.5rem; // variable that can be overwritten if custom content has a different height
    --transition-time: 3s; // default value; the actual effective value is set via duration prop
    --release-transiton-time: min(0.3s, var(--transition-time)); // short transition time when button released

    contain: layout style; // not paint because focus outline overflows
    padding: 0; // make the .mix-blend-mode-mask cover the whole button to be able to add paint containment on it
}

.mix-blend-mode-mask {
    contain: layout paint style;
    display: flex;
    height: 100%;
    padding: 0 6.5rem;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    // We achieve the color switching effect of the labels within the indicator area by two nested mix-blend-modes.
    // The indicator and labels combine to a black and white mask in the .mix-blend-mode-mask of which only the white
    // parts are rendered over the button via the lighten mix-blend-mode. Notably, the text within the indicator area
    // is mixed to black, such that the button color shines through the text.
    mix-blend-mode: lighten;
}

.indicator {
    contain: layout paint style;
    position: absolute;
    width: calc(100% - 1.5rem);
    max-height: calc(100% - 1.5rem);
    border-radius: 999px; // just needs to be at least the indicator height
    overflow: hidden;
    background: white;
    mix-blend-mode: difference; // subtract text to make it black in the .mix-blend-mode-mask over the indicator
    transition: width var(--transition-time) ease-out;

    &.transition-indicator-enter,
    &.transition-indicator-enter-from,
    &.transition-indicator-leave-to {
        width: 0;
    }

    &.transition-indicator-leave-active {
        transition-duration: var(--release-transiton-time);
    }

    // css hack to ensure the indicator has the same height as width until max-height is reached
    &::after {
        contain: size layout paint style;
        content: '';
        display: block;
        padding-top: 100%;
    }
}

label,
.subline {
    contain: style; // not layout or paint because these would cause a new stacking context
    white-space: nowrap;
    // Transition color and margin instead of opacity and transform as those would create a new stacking context
    // (https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context)
    // which would prevent it from mixing with mix-blend-mode.
    transition-property: color, margin;
    transition-timing-function: var(--nimiq-ease);
}

label:not(.show),
.subline:not(.show) {
    color: rgba(255, 255, 255, 0);
}

label {
    --center-offset: calc(var(--subline-height) / 2 - 1px); // -1px because it looks just a bit better centered
    color: white;
    transition-duration: var(--release-transiton-time); // quick transition when button released

    &.center {
        transition-duration: 0.5s, 1s; // somewhat quick fade between labels and slow centering on button press
    }

    &:nth-of-type(1).center {
        margin-top: var(--center-offset); // only need to do this for the first label, the second will move along
    }

    &:nth-of-type(2) {
        // place second label on top of first for fading between then
        --extra-margin: calc((var(--label-height) - 2.5rem) / 2); // split height difference to --label-height in 2
        margin-top: calc(-1 * var(--label-height) + var(--extra-margin));
        margin-bottom: var(--extra-margin);
    }

    &:nth-of-type(2).center {
        // pull subline up to keep it at the original position
        margin-bottom: calc(-1 * var(--center-offset) + var(--extra-margin));
    }
}

.subline {
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: normal;
    text-transform: none;
    color: rgba(255, 255, 255, 0.7);
    transition-duration: 1s;

    &.show {
        transition-duration: var(--release-transiton-time); // quick transition when button released
    }
}
</style>

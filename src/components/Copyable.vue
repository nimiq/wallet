<template>
    <div class="copyable" :class="{ copied }" @click="copy" @keydown="onKeyDown" tabindex="0" ref="root$">
        <div class="background"></div>
        <slot></slot>
        <div class="tooltip" ref="tooltip$">{{ $t('Copied') }}</div>
    </div>
</template>

<script lang="ts">
import { Clipboard } from '@nimiq/utils';
import { defineComponent, ref } from 'vue';

const DISPLAY_TIME = 800;

/**
 * Copyable can be used to make a click on one or more elements copy content to the Clipboard with visual feedback.
 * By default, the children's contents are copied to the Clipboard. Alternatively, a specific text to be copied can be
 * provided via the text prop.
 */
const Copyable = defineComponent({
    props: {
        /**
         * A specific text to be copied to the clipboard on click.
         */
        text: String,
    },
    setup(props, context) {
        const root$ = ref<HTMLDivElement | null>(null);
        const tooltip$ = ref<HTMLDivElement | null>(null);

        const copied = ref(false);
        let copiedResetTimeout = -1;

        function copy() {
            let { text } = props;
            if (!text) {
                const copiedLabel = tooltip$.value!.textContent;
                text = root$.value!.innerText.replace(new RegExp(`\\s*${copiedLabel}$`), '');
            }
            Clipboard.copy(text);

            window.clearTimeout(copiedResetTimeout);
            copied.value = true;
            copiedResetTimeout = window.setTimeout(() => {
                copied.value = false;
            }, DISPLAY_TIME);

            context.emit('copy', text);
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === ' ' /* Space */ || event.key === 'Enter') {
                copy();
            }
        }

        return {
            root$,
            tooltip$,
            copied,
            copy,
            onKeyDown,
        };
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type Copyable = InstanceType<typeof Copyable>;
export default Copyable;
</script>

<style lang="scss" scoped>
.copyable {
    position: relative;
    padding: 1.5rem;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.3s var(--nimiq-ease);

    &:hover,
    &:focus,
    &.copied {
        color: var(--nimiq-light-blue) !important;
        outline: none;

        .background {
            opacity: 0.07;
        }
    }
}

.background {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-image: var(--nimiq-light-blue-bg);
    border-radius: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s var(--nimiq-ease);
}

.tooltip {
    pointer-events: none;
    font-size: 1.75rem;
    padding: 0.75rem 1rem;
    background: var(--nimiq-light-blue-bg);
    position: absolute;
    top: -5rem;
    left: 50%;
    margin-left: -3.75rem; // half width of tooltip
    border-radius: 0.5rem;
    color: white;
    font-weight: 600;
    line-height: 1.1;
    box-shadow:
        0px 2px 2.5px rgba(31, 35, 72, 0.02),
        0px 7px 8.5px rgba(31, 35, 72, 0.04),
        0px 18px 38px rgba(31, 35, 72, 0.07);

    // Animated styles
    transform: translate3d(0, 1rem, 0);
    opacity: 0;

    transition:
        transform 0.3s var(--nimiq-ease),
        opacity 0.3s var(--nimiq-ease);
    transition-delay: 0.2s;

    &::after {
        content: '';
        display: block;
        position: absolute;
        width: 2.25rem;
        height: 2rem;
        left: calc(50% - 1.125rem);
        mask-image: url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
        z-index: 1000; // move above tooltip-box's box-shadow
        background: #1a6ad2;
        transform: rotate(180deg) translateY(-0.75rem);
    }
}

.copyable.copied .tooltip {
    transition-delay: 0s;
    pointer-events: all;
    opacity: 1;
    transform: translate3d(0, 0, 0);
}
</style>

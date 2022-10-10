import type { DirectiveOptions } from 'vue';

/**
 * Adds a pointerdown event handler with fallback to mousedown if not supported.
 */
export const pointerdown: DirectiveOptions = {
    bind(el, binding) {
        if (window.PointerEvent) {
            el.addEventListener('pointerdown', binding.value);
        } else {
            el.addEventListener('mousedown', binding.value);
        }
    },
    unbind(el, binding) {
        if (window.PointerEvent) {
            el.removeEventListener('pointerdown', binding.value);
        } else {
            el.removeEventListener('mousedown', binding.value);
        }
    },
};

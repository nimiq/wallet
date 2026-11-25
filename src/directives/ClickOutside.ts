import type { DirectiveOptions } from 'vue';

/**
 * Calls the bound function on clicks (touchstart on touch devices) outside the element, and when the focus moves into
 * an iframe outside the element. Replaces the click-outside directive of the v-click-outside package, which only
 * supports Vue 2, for the function form that we use.
 */

const HANDLERS_PROPERTY = '__click-outside';
const IS_TOUCH = 'ontouchstart' in window;

type Handler = { target: EventTarget; event: string; listener: (event: Event) => void };
type ElementWithHandlers = HTMLElement & { [HANDLERS_PROPERTY]?: Handler[] };

export const clickOutside: DirectiveOptions = {
    bind(el: ElementWithHandlers, { value: callback }) {
        if (typeof callback !== 'function') throw new Error('v-click-outside: Binding value must be a function');

        const handlers: Handler[] = [
            {
                target: document.documentElement,
                event: IS_TOUCH ? 'touchstart' : 'click',
                listener: (event) => {
                    if (event.composedPath().includes(el)) return;
                    callback(event);
                },
            },
            {
                // Clicks into iframes do not reach the document, but blur the window.
                target: window,
                event: 'blur',
                listener: (event) => {
                    // The iframe becomes the active element only in the next event loop on Firefox.
                    setTimeout(() => {
                        const { activeElement } = document;
                        if (activeElement && activeElement.tagName === 'IFRAME' && !el.contains(activeElement)) {
                            callback(event);
                        }
                    }, 0);
                },
            },
        ];
        el[HANDLERS_PROPERTY] = handlers;

        // Add the listeners asynchronously, such that the click that rendered the element does not trigger them.
        for (const { target, event, listener } of handlers) {
            setTimeout(() => {
                if (el[HANDLERS_PROPERTY] !== handlers) return; // unbound in the meantime
                target.addEventListener(event, listener);
            }, 0);
        }
    },
    unbind(el: ElementWithHandlers) {
        for (const { target, event, listener } of el[HANDLERS_PROPERTY] || []) {
            target.removeEventListener(event, listener);
        }
        delete el[HANDLERS_PROPERTY];
    },
};

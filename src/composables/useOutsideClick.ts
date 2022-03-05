import { useEventListener } from './useEventListener';

// Polyfill
function microTask(cb: () => void) {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(cb);
    } else {
        Promise.resolve()
            .then(cb)
            .catch((e) =>
                setTimeout(() => {
                    throw e;
                }),
            );
    }
}

export function useOutsideClick(
    selectors: string[],
    cb: (event: MouseEvent | PointerEvent, target: HTMLElement) => void,
) {
    let called = false;
    function handle(event: MouseEvent | PointerEvent) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (called) return;
        called = true;
        microTask(() => {
            called = false;
        });

        const target = event.target as HTMLElement;

        // Ignore if the target doesn't exist in the DOM anymore
        if (!target.ownerDocument.documentElement.contains(target)) return;

        // Ignore if the target exists in one of the containers
        for (const container of selectors.map((selector) => document.querySelector(selector))) {
            if (container?.contains(target)) return;
        }

        cb(event, target);
    }

    useEventListener(window, 'pointerdown', handle, true);
    useEventListener(window, 'mousedown', handle, true);
}

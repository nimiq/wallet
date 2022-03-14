import { onUnmounted, Ref, watch } from '@vue/composition-api';

export function useElementResize(
    target: Ref<HTMLElement | null>,
    callback: () => void,
) {
    const isSupported = window && 'ResizeObserver' in window;

    if (!isSupported) {
        // This is just a fallback for browsers that don't support ResizeObserver
        window.addEventListener('resize', () => callback());
        onUnmounted(() => window.removeEventListener('resize', () => callback));
    }

    let observer: ResizeObserver | undefined;
    const unobserve = () => {
        if (observer) {
            observer.disconnect();
            observer = undefined;
        }
    };

    const stopWatch = watch(
        target,
        (el) => {
            unobserve();

            if (window && el && el) {
                observer = new window.ResizeObserver(callback);
                observer!.observe(el);
            }
        },
        { flush: 'post' },
    );

    onUnmounted(() => () => {
        unobserve();
        stopWatch();
    });
}

import { onBeforeUnmount, onMounted } from '@vue/composition-api';

export function useEventListener(
    target: EventTarget,
    event: string,
    handler: (e: any) => any,
    options?: AddEventListenerOptions | boolean,
) {
    onMounted(() => target.addEventListener(event, handler, options));
    onBeforeUnmount(() => target.removeEventListener(event, handler));
}

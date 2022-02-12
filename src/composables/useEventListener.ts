import { onBeforeUnmount, onMounted } from '@vue/composition-api';

export function useEventListener(
    target: EventTarget,
    event: string,
    handler: (e: any) => any,
) {
    onMounted(() => target.addEventListener(event, handler));
    onBeforeUnmount(() => target.removeEventListener(event, handler));
}

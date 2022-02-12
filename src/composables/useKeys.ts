import { Ref } from '@vue/composition-api';
import { useEventListener } from './useEventListener';

type validKeys = 'ArrowRight' | 'ArrowLeft' | 'Escape'

interface KeyEvent {
    key: validKeys;
    handler: () => any;
    options?: { ignoreIf: Ref<boolean> };
}

export function useKeys(keyEvents: KeyEvent[]) {
    useEventListener(window, 'keydown', (e: KeyboardEvent) => {
        const keyEvent = keyEvents.find((key) => key.key === e.key);
        if (!keyEvent || keyEvent.options?.ignoreIf.value) return;
        e.preventDefault();
        keyEvent.handler();
    });
}

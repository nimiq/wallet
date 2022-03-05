import { Ref } from '@vue/composition-api';
import { useEventListener } from './useEventListener';

type validKeys = `Arrow${'Right' | 'Left' | 'Up' | 'Down'}` | 'Enter' | 'Escape'

interface KeyEvent {
    key: validKeys;
    handler: () => any;
    options?: { ignoreIf?: Ref<boolean>, onlyIf?: Ref<boolean> };
}

export function useKeys(keyEvents: KeyEvent[]) {
    useEventListener(window, 'keydown', (e: KeyboardEvent) => {
        const keyEvent = keyEvents.find((key) => key.key === e.key);
        if (!keyEvent || keyEvent.options?.ignoreIf?.value || keyEvent.options?.onlyIf?.value === false) return;
        e.preventDefault();
        e.stopPropagation();
        keyEvent.handler();
    }, true);
}

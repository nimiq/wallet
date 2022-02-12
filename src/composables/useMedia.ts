import { Ref, ref } from '@vue/composition-api';
import { useEventListener } from './useEventListener';

export function useMedia(query: string): Readonly<Ref<boolean>> {
    const mediaQuery = window.matchMedia(query);
    const matches = ref(mediaQuery.matches);
    useEventListener(mediaQuery, 'change', (e) => {
        matches.value = e.matches;
    });
    return matches;
}

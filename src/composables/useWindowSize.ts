import { computed, Ref } from '@vue/composition-api';
import { useMedia } from './useMedia';

export type ScreenTypes = Pick<ReturnType<typeof useWindowSize>, 'isSmallScreen' | 'isMediumScreen' | 'isLargeScreen'>

export function useWindowSize() {
    return {
        width: computed(() => window.innerWidth) as Readonly<Ref<number>>,
        height: computed(() => window.innerHeight) as Readonly<Ref<number>>,
        isSmallScreen: useMedia('(max-width: 700px)'),
        isMediumScreen: useMedia('(min-width: 700px) and (max-width: 1160px)'),
        isLargeScreen: useMedia('(min-width: 1160px)'),
    };
}

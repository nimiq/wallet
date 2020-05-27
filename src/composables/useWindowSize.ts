import { ref, onMounted, onUnmounted, Ref } from '@vue/composition-api';

let numberOfListeners = 0;

// FIXME: In Vue 2, composition-api methods cannot be used before the plugin is activated.
//        When switching to Vue 3, the width and height variables can be directly instantiated
//        as refs.
let width: Ref<number> | null = null;
let height: Ref<number> | null = null;

function listener() {
    width!.value = window.outerWidth;
    height!.value = window.outerHeight;
}

export function useWindowSize() {
    // First-time setup
    width = width || ref(0);
    height = height || ref(0);

    onMounted(() => {
        if (numberOfListeners === 0) {
            window.addEventListener('resize', listener);
            listener();
        }
        numberOfListeners += 1;
    });

    onUnmounted(() => {
        numberOfListeners -= 1;

        if (numberOfListeners === 0) {
            window.removeEventListener('resize', listener);
        }
    });

    return {
        width,
        height,
    };
}

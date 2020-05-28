import { ref, onMounted, onUnmounted, Ref } from '@vue/composition-api';

let numberOfListeners = 0;

// FIXME: In Vue 2, composition-api methods cannot be used before the plugin is activated.
//        When switching to Vue 3, the width and height variables can be directly instantiated
//        as refs.
let width: Ref<number> | null = null;
let height: Ref<number> | null = null;

function listener() {
    width!.value = window.innerWidth;
    height!.value = window.innerHeight;
}

export function useWindowSize() {
    // First-time setup
    if (!width || !height) {
        width = ref(0);
        height = ref(0);
        listener();
    }

    onMounted(() => {
        if (numberOfListeners === 0) {
            window.addEventListener('resize', listener);
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

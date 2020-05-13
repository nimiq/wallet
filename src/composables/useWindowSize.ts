import { ref, onMounted, onUnmounted } from '@vue/composition-api';

export function useWindowSize() {
    const width = ref(0);
    const height = ref(0);

    function listener() {
        width.value = window.outerWidth;
        height.value = window.outerHeight;
    }

    onMounted(() => {
        window.addEventListener('resize', listener);
        listener();
    });

    onUnmounted(() => {
        window.removeEventListener('resize', listener);
    });

    return {
        width,
        height,
    };
}

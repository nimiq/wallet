import { computed, onBeforeUnmount, onMounted, reactive, Ref } from '@vue/composition-api';

export function usePull2Refresh(scroller: Ref<{$el: HTMLDivElement} | null>, onRefresh: () => void) {
    const P2R = reactive({
        start: null as number | null,
        current: null as number | null,
    });

    function startP2R(event: TouchEvent) {
        if (!scroller.value || scroller.value.$el.scrollTop > 0) return;
        P2R.start = event.touches[0].clientY;
        (event.target as HTMLElement).addEventListener('touchmove', moveP2R);
    }

    function moveP2R(event: TouchEvent) {
        if (!P2R.start) return;
        P2R.current = event.touches[0].clientY;
        const distance = P2R.current - P2R.start;
        if (distance > window.innerHeight / 3) {
            // console.log('REFRESH!'); // eslint-disable-line no-console
            onRefresh();
            cancelP2R(event);
        }
    }

    function cancelP2R(event: TouchEvent) {
        P2R.start = null;
        P2R.current = null;
        (event.target as HTMLElement).removeEventListener('touchmove', moveP2R);
        // console.log('Pull canceled'); // eslint-disable-line no-console
    }

    const pulledDistance = computed(() => {
        if (!P2R.start || !P2R.current) return 0;
        const distance = P2R.current - P2R.start;
        return Math.max(0, distance);
    });

    onMounted(() => {
        if (!scroller.value) return;
        scroller.value.$el.addEventListener('touchstart', startP2R);
        scroller.value.$el.addEventListener('touchend', cancelP2R);
        scroller.value.$el.addEventListener('touchcancel', cancelP2R);
    });

    onBeforeUnmount(() => {
        if (!scroller.value) return;
        scroller.value.$el.removeEventListener('touchstart', startP2R);
        scroller.value.$el.removeEventListener('touchend', cancelP2R);
        scroller.value.$el.removeEventListener('touchcancel', cancelP2R);
    });

    return {
        pulledDistance,
    };
}

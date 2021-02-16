<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { CreateElement, VNode } from 'vue';

export default defineComponent({
    render(createElement: CreateElement) {
        return createElement('div', {
            class: 'message-transition',
            style: this.messageHeight ? { '--message-height': `${this.messageHeight}px` } : '',
        }, [
            createElement('transition', {
                props: {
                    name: 'fadeY',
                },
                on: {
                    enter: this.onEnter,
                },
            }, [
                createElement('div', {
                    class: ['message', 'flex-row'],
                    key: this.getKey(this.$slots.default[0]),
                },
                this.$slots.default),
            ]),
        ]);
    },
    setup() {
        const messageHeight = ref<number | null>(null);

        function onEnter(el: HTMLElement) {
            messageHeight.value = el.offsetHeight;
        }

        function getKey(el: VNode): string {
            if (!el.children) return `${el.tag || ''}${el.data?.staticClass || ''}${el.text || ''}`;
            return el.children.map((child: VNode) => getKey(child)).join();
        }

        return {
            messageHeight,
            onEnter,
            getKey,
        };
    },
});
</script>

<style lang="scss" scoped>
.message-transition {
    --message-height: auto;

    position: relative;
    height: var(--message-height);
    transition: {
        property: height;
        duration: 500ms;
        timing-function: cubic-bezier(0.5, 0, 0.15, 1);
    }
}

.message {
    justify-content: center;
    align-items: center;
    text-align: center;
}

.fadeY-enter-active, .fadeY-leave-active {
    will-change: opacity, transform;
    transition: {
        property: opacity, transform;
        duration: 500ms;
        timing-function: cubic-bezier(0.5, 0, 0.15, 1);
    }
}

.fadeY-leave-active {
    position: absolute;
    width: 100%;
}

.fadeY-enter-active {
    transition-delay: 50ms;
}

.fadeY-leave,
.fadeY-enter-to {
    transform: translateY(0);
}

.fadeY-enter {
    opacity: 0;
    transform: translateY(.5rem);
}

.fadeY-leave-to {
    opacity: 0;
    transform: translateY(-.5rem);
}
</style>

<template>
    <div class="message-transition"
        :style="isTransitioning && { '--message-height': `${messageHeight || 0}px` }"
    ><transition name="fadeY"
            @before-enter="onBeforeEnter"
            @before-leave="onBeforeLeave"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @after-leave="onAfterLeave"
        ><div
            :key="getKey($slots.default && $slots.default.length > 0 && $slots.default[0])"
            :class="{ 'reverse': isReverse }"
        ><slot></slot></div>
    </transition></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { VNode } from 'vue';
import { nextTick } from '@/lib/nextTick';

export default defineComponent({
    props: {
        reverse: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const isReverse = ref(false);
        const messageHeight = ref<number | null>(null);
        const isTransitioning = ref(false);

        onMounted(() => {
            isReverse.value = props.reverse;
        });

        function getKey(el?: VNode): string {
            if (!el) return '';
            if (!el.children) return `${el.tag || ''}${el.data?.staticClass || ''}${el.text || ''}`;
            return el.children.map((child: VNode) => getKey(child)).join();
        }

        function onBeforeEnter() {
            isTransitioning.value = true;
        }

        function onBeforeLeave(el: HTMLElement) {
            messageHeight.value = el.offsetHeight;
            isTransitioning.value = true;
        }

        async function onEnter(el: HTMLElement) {
            await nextTick();
            messageHeight.value = el.offsetHeight;
        }

        async function onAfterLeave() {
            await nextTick();
            messageHeight.value = null;
            isReverse.value = props.reverse;
            isTransitioning.value = false;
        }

        function onAfterEnter() {
            isTransitioning.value = false;
        }

        return {
            isReverse,
            isTransitioning,
            messageHeight,

            getKey,
            onBeforeEnter,
            onBeforeLeave,
            onEnter,
            onAfterLeave,
            onAfterEnter,
        };
    },
});
</script>

<style lang="scss" scoped>
.message-transition {
    --message-height: auto;
    --message-transition-duration: 500ms;
    --message-transition-timing-function: cubic-bezier(0.5, 0, 0.15, 1);

    position: relative;
    height: var(--message-height);
    display: flex;
    flex-direction: column;
    justify-content: center;

    transition: {
        property: height;
        duration: var(--message-transition-duration);
        timing-function: var(--message-transition-timing-function);
    }

    & > .fadeY-enter-active ~ .fadeY-enter-active {
        display: none;
    }
    & > .fadeY-leave-active ~ .fadeY-leave-active {
        display: none;
    }
}

.fadeY-enter-active,
.fadeY-leave-active {
    will-change: opacity, transform;
    transition: {
        property: opacity, transform;
        duration: var(--message-transition-duration);
        timing-function: var(--message-transition-timing-function);
    }
}

.fadeY-leave-active {
    position: absolute;
    z-index: 2;
    width: 100%;
}

.fadeY-enter-active {
    z-index: 2;
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

.reverse {
    &.fadeY-enter { transform: translateY(-.5rem) }
    &.fadeY-leave-to { transform: translateY(.5rem) }
}
</style>

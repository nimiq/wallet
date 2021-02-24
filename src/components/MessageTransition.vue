<template>
    <div class="message-transition"
        :style="messageHeight && { '--message-height': `${messageHeight}px` }"
    ><transition name="fadeY"
            @enter="onEnter"
            @before-leave="onBeforeLeave"
            @after-enter="onAfterLeave"
        ><div class="message" :key="getKey($slots.default[0])" :class="{ 'reverse': isReverse }">
                <slot></slot>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { VNode } from 'vue';

export default defineComponent({
    props: {
        reverse: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const isReverse = ref(false);
        const messageHeight = ref<number | null>(null);

        onMounted(() => {
            isReverse.value = props.reverse;
        });

        function getKey(el?: VNode): string {
            if (!el) return '';
            if (!el.children) return `${el.tag || ''}${el.data?.staticClass || ''}${el.text || ''}`;
            return el.children.map((child: VNode) => getKey(child)).join();
        }

        function onBeforeLeave(el: HTMLElement) {
            messageHeight.value = el.offsetHeight;
        }

        async function onEnter(el: HTMLElement) {
            await context.root.$nextTick();
            messageHeight.value = el.offsetHeight;
        }

        async function onAfterLeave() {
            await context.root.$nextTick();
            messageHeight.value = null;
            isReverse.value = props.reverse;
        }

        return {
            isReverse,
            messageHeight,

            getKey,
            onEnter,
            onBeforeLeave,
            onAfterLeave,
        };
    },
});
</script>

<style lang="scss" scoped>
.message-transition {
    --message-height: auto;

    position: relative;
    height: var(--message-height);
    display: flex;
    flex-direction: column;
    justify-content: center;

    transition: {
        property: height;
        duration: 500ms;
        timing-function: cubic-bezier(0.5, 0, 0.15, 1);
    }
}

.fadeY-enter-active,
.fadeY-leave-active {
    will-change: opacity, transform;
    transition: {
        property: opacity, transform;
        duration: 500ms;
        timing-function: cubic-bezier(0.5, 0, 0.15, 1);
    }
}

.fadeY-leave-active {
    position: absolute;
    z-index: 2;
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

.message.reverse {
    &.fadeY-enter { transform: translateY(-.5rem) }
    &.fadeY-leave-to { transform: translateY(.5rem) }
}
</style>

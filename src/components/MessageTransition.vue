<template>
    <div class="message-transition" :style="messageHeight && { '--message-height': `${messageHeight}px` }">
        <transition name="fadeY"
            @enter="(el) => messageHeight = el.offsetHeight"
            @after-enter="() => messageHeight = undefined"
        >
            <div class="message flex-row" :key="messageKey()"><slot></slot></div>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
    setup(props, context) {
        const messageHeight = ref<number | null>(null);

        function messageKey() {
            const vnodes = context.slots.default();

            if (vnodes && vnodes.length > 0) {
                return JSON.stringify(vnodes[0].data as HTMLElement);
            }
            return '';
        }

        return { messageHeight, messageKey };
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

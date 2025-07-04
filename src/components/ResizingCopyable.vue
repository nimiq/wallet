<template>
    <Copyable
        class="resizing-copyable"
        v-on="$listeners"
        :style="{ fontSize: `calc(var(--body-size) * ${addressFontSizeScaleFactor})` }"
        :text="text"
        ref="copyable$"
    >
        <slot></slot>
        <div class="width-finder" ref="widthFinder$">{{ text }}</div>
    </Copyable>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { Copyable } from '@nimiq/vue-components';

export default defineComponent({
    props: {
        text: String,
    },
    setup(props) {
        const copyable$ = ref<Copyable | null>(null);
        const widthFinder$ = ref<HTMLDivElement | null>(null);
        const addressFontSizeScaleFactor = ref(1);

        async function updateAddressFontSizeScaleFactor() {
            if (!copyable$.value || !widthFinder$.value) return;

            const style = window.getComputedStyle(copyable$.value.$el.children[1]);
            const leftPadding = parseInt(style.getPropertyValue('padding-left'), 10);
            const rightPadding = parseInt(style.getPropertyValue('padding-right'), 10);

            const width = widthFinder$.value.clientWidth;
            const maxWidth = copyable$.value.$el.clientWidth - leftPadding - rightPadding;

            addressFontSizeScaleFactor.value = Math.min(maxWidth / width, 1);
        }

        onMounted(() => {
            updateAddressFontSizeScaleFactor();
            window.addEventListener('resize', updateAddressFontSizeScaleFactor);
        });
        watch(() => props.text, updateAddressFontSizeScaleFactor);
        onUnmounted(() => {
            window.removeEventListener('resize', updateAddressFontSizeScaleFactor);
        });

        return {
            copyable$,
            widthFinder$,
            addressFontSizeScaleFactor,
        };
    },
    components: {
        Copyable,
    },
});
</script>

<style lang="scss" scoped>
.resizing-copyable {
    --padding: 1.5rem;

    width: 100%;
    border-radius: 5px;
    text-align: center;
    font-size: var(--body-size);
    font-family: 'Fira Mono', monospace;
    background-color: var(--nimiq-highlight-bg);
    font-weight: 500;
    color: var(--text-100);
    height: calc(var(--body-size) + 0.5rem + (var(--padding) * 2));
    padding: 0;
    white-space: nowrap;

    transition: {
        property: background-color, color, font-size;
        duration: var(--short-transition-duration);
        timing-function: var(--nimiq-ease);
    };

    &:hover,
    &:focus {
        background-color: transparent;
    }

    &:hover ::v-deep .background {
        opacity: 0.1;
    }

    .width-finder {
        position: absolute;
        color: transparent;
        pointer-events: none;
        user-select: none;
        font-size: var(--body-size);
    }
}
</style>

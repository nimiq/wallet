<template>
    <!-- eslint-disable max-len -->
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="speed-gauge">
        <path d="M12 0a12 12 0 110 24 12 12 0 010-24zM4.67 18.8a15.84 15.84 0 0114.66 0 10 10 0 10-14.66 0z"/> <!-- housing -->
        <path d="M5.5 11.25H4a.75.75 0 100 1.5h1.5a.75.75 0 100-1.5z"/> <!-- 1/5 -->
        <path d="M6.97 5.91a.75.75 0 10-1.06 1.06l1.06 1.06a.75.75 0 101.06-1.06L6.97 5.91z"/> <!-- 2/5 -->
        <path d="M12 6.25a.75.75 0 01-.75-.75V4a.75.75 0 111.5 0v1.5a.75.75 0 01-.75.75z"/> <!-- 3/5 -->
        <path d="M17.03 5.91a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06z"/> <!-- 4/5 -->
        <path d="M18.5 11.25H20a.75.75 0 110 1.5h-1.5a.75.75 0 110-1.5z"/> <!-- 5/5 -->
        <g transform="translate(0 -1)">
            <path d="M21.02 13.07a.5.5 0 00-.38-.49c-.78-.2-7.64-1.93-8.7-1.94a2.39 2.39 0 00-2.4 2.38 2.42 2.42 0 002.37 2.4c1.07 0 7.95-1.67 8.73-1.86a.5.5 0 00.38-.49z" class="needle-cover" :style="`transform: rotate(${rotation}deg)`"/>
            <path d="M21.02 13.07a.5.5 0 00-.38-.49c-.78-.2-7.64-1.93-8.7-1.94a2.39 2.39 0 00-2.4 2.38 2.42 2.42 0 002.37 2.4c1.07 0 7.95-1.67 8.73-1.86a.5.5 0 00.38-.49z" class="needle" :style="`transform: rotate(${rotation}deg)`"/>
        </g>
    </svg>
    <!-- eslint-enable max-len -->
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
    props: {
        speed: {
            type: Number,
            default: 0,
        },
    },
    setup(props) {
        const rotation = computed(() => (Math.min(100, Math.max(0, props.speed)) / 100 - 1) * 180);

        return {
            rotation,
        };
    },
});
</script>

<style lang="scss" scoped>
    .needle,
    .needle-cover {
        // fill: var(--nimiq-red);
        transform-origin: 50% 54.1666667%;
        transition: transform 0.3s var(--nimiq-ease);
    }

    .needle-cover {
        fill: white;
    }
</style>

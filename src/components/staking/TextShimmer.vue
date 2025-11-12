<template>
    <span class="text-shimmer"><slot /></span>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    name: 'TextShimmer',
});
</script>

<style scoped lang="scss">
.text-shimmer {
    background: linear-gradient(
        110deg,
        currentColor 0%,
        currentColor 30%,
        rgba(255, 255, 255, 0.1) 50%,
        currentColor 70%,
        currentColor 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 2000ms linear infinite;
}

@keyframes shimmer {
    0% {
        background-position: 150% 0;
    }
    55% {
        background-position: 150% 0;
    }
    100% {
        background-position: -50% 0;
    }
}
</style>

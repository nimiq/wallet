<template>
    <svg height="48" width="54" viewBox="0 0 54 48" color="inherit" class="loading-spinner">
        <path
            id="big-hex"
            d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
            stroke="currentColor"
            stroke-width="3"
            fill="none"
            stroke-linecap="round"
            opacity="0.4"
            stroke-dasharray="92.5 60"
        />
        <path
            id="small-hex"
            d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
            stroke="currentColor"
            stroke-width="3"
            fill="none"
            stroke-linecap="round"
            stroke-dasharray="47.5 105"
        />
    </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({});
</script>

<style lang="scss" scoped>
// SVG loading animation
// Hexagon circumference: 152.5

#big-hex {
    stroke-dashoffset: -40.5;
    animation: big-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

#small-hex {
    stroke-dashoffset: 13;
    animation: small-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

@keyframes small-hex {
    0% {
        stroke-dashoffset: 13;
    }
    17% {
        stroke-dashoffset: 38.42;
    }
    33% {
        stroke-dashoffset: 63.84;
    }
    50% {
        stroke-dashoffset: 89.25;
    }
    67% {
        stroke-dashoffset: 114.66;
    }
    83% {
        stroke-dashoffset: 140.08;
    }
    100% {
        stroke-dashoffset: 165.5;
    }
}

@keyframes big-hex {
    0% {
        stroke-dashoffset: -40.5;
    }
    17% {
        stroke-dashoffset: -15.08;
    }
    33% {
        stroke-dashoffset: 10.33;
    }
    50% {
        stroke-dashoffset: 35.75;
    }
    67% {
        stroke-dashoffset: 61.17;
    }
    83% {
        stroke-dashoffset: 86.58;
    }
    100% {
        stroke-dashoffset: 112;
    }
}
</style>

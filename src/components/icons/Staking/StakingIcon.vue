<template>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140"
        :class="{
            pulsing: pulsing && !disabled,
            'full-size': fullSize,
        }"
        class="nq-icon staking-icon">
        <path d="M70 22h0a48 48 0 0148 48v0a48 48 0 01-48 48h0a48 48 0 01-48-48v0a48 48 0 0148-48z" opacity=".6" fill="none" stroke="#21bca5" stroke-width="3.02"/>
        <path d="M70 12h0a58 58 0 0158 58h0a58 58 0 01-58 58h0a58 58 0 01-58-58h0a58 58 0 0158-58z" opacity=".4" fill="none" stroke="#21bca5" stroke-width="3.02"/>
        <radialGradient id="a" cx="70" cy="70" r="69.26" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#41a38e"/>
            <stop offset="1" stop-color="#21bca5"/>
        </radialGradient>
        <path d="M70 2.25h0A67.75 67.75 0 01137.75 70v0A67.75 67.75 0 0170 137.75h0A67.75 67.75 0 012.25 70v0A67.75 67.75 0 0170 2.25z" opacity=".2" fill="none" stroke="url(#a)" stroke-width="3.02"/>
        <radialGradient id="b" cx="-791.61" cy="458.74" r="1" gradientTransform="matrix(-83.5341 0 0 83.5341 -66014.57 -38208.91)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#41a38e"/>
            <stop offset="1" stop-color="#21bca5"/>
        </radialGradient>
        <path d="M70 28.23a41.76 41.76 0 110 83.52 41.76 41.76 0 110-83.52z" :fill="!disabled ? 'url(#b)' : 'rgba(131, 131, 131, 0.07)'"/>
        <path d="M70.71 69.1v21.56m18.71-26.11c0 12.4-6.31 18.89-18.71 18.89 0-17.56 5.28-18.89 18.71-18.89zM54.18 53.98c0 13.33 4.13 20.07 16.53 20.07 0-13.43-1.03-20.07-16.53-20.07z" fill="none"
            :stroke="!disabled ? '#fff' : '#b5b6c1'" stroke-width="4.0316" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        pulsing: {
            type: Boolean,
            required: false,
            default: false,
        },
        disabled: {
            type: Boolean,
            required: false,
            default: false,
        },
        fullSize: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
});
</script>

<style lang="scss" scoped>
svg {
    font-size: 0;

    path:nth-child(1), path:nth-child(2), path:nth-child(4) {
        opacity: 0;
    }

    path:nth-child(1) { stroke-opacity: .8 }
    path:nth-child(2) { stroke-opacity: .6 }
    path:nth-child(4) { stroke-opacity: .4 }

    &.pulsing {
        path:nth-child(1), path:nth-child(2), path:nth-child(4) {
            animation: fastwave 1s ease alternate infinite;
        }

        $delay: 200ms;
        @for $i from 1 through 3 {
            path:nth-child(#{if($i == 3, 4, $i)}) {
                animation-delay: $delay * $i;
            }
        }
    }

    &.full-size {
        --size: 150%;
        width: var(--size);
        height: var(--size);
        margin-top: calc((var(--size) - 100%) / -2);
        margin-left: calc((var(--size) - 100%) / -2);
    }
}

@keyframes fastwave {
    0%      { opacity: 1 }
    50%     { opacity: .15 }
    100%    { opacity: 0 }
}
</style>

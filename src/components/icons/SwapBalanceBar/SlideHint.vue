<template>
    <div class="slide-hint flex-row" :class="direction">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 7" v-for="index in 3" :key="index">
            <path
                d="M5.096 2.722a.7.7 0 010 1.174L1.081 6.504A.7.7 0 010 5.917V.7A.7.7 0 011.081.114l4.015 2.608z"
            />
        </svg>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        direction: {
            type: String,
            default: 'right',
            validator: (direction: string) => ['right', 'left'].includes(direction),
        },
    },
});
</script>

<style lang="scss" scoped>

.slide-hint {
    color: white;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);

    &.right {
        left: 2.375rem;
    }

    &.left {
        transform: translateY(-50%) rotateY(180deg);
        right: 2.375rem;
    }
}

svg {
    height: 0.875rem;
    width: auto;
    transform: translateX(0);

    &:not(:first-child) {
        margin-left: 0.5rem;
    }

    &:nth-child(1) {
        opacity: .5;
    }

    &:nth-child(2) {
        opacity: .35;
    }

    &:nth-child(3) {
        opacity: .2;
    }

    @keyframes fade-n-translate {
        100% {
            opacity: 0;
            transform: translateX(0.75rem);
        }
    }

    animation-name: fade-n-translate;
    animation-duration: 1.5s;
    animation-iteration-count: infinite;

    @for $i from 0 through 2 {
        &:nth-child(#{$i + 1}) {
            animation-delay: #{$i * 100}ms;
        }
    }
}

svg path {
    fill: currentColor;
}

</style>

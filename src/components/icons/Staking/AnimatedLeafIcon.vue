<template functional>
    <svg class="nq-icon animated-leaf-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
        fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
        :class="{ 'one-leaf': props.nleaf === 1, 'two-leaves': props.nleaf === 2, 'three-leaves': props.nleaf === 3 }"
        :style="{ '--transition-duration': props.duration + 'ms' }">
        <line x1="7.75" y1="8.75" x2="7.75" y2="13.25"/>
        <path class="first-leaf" d="
            M 12.25,7.75
            C 12.25,10.70 , 10.70,12.25 , 07.75,12.25
            C 07.75,08.07 , 09.05,07.75 , 12.25,07.75
            Z"/>
        <path class="second-leaf" d="
            M 7.75,11.24
            C 7.75,08.11 , 7.21,06.77 , 3.75,06.77
            C 3.75,09.87 , 4.93,11.24 , 7.75,11.24
            Z
        "/>
        <path class="third-leaf" d="
            M 07.75,9.00
            C 06.36,5.15 , 07.00,4.36 , 09.50,3.00
            C 10.83,5.64 , 10.39,7.67 , 07.75,9.00
            Z
        "/>
    </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        nleaf: {
            type: Number as () => 1 | 2 | 3,
            validator: (value: number) => [1, 2, 3].includes(value),
            default: 1,
        },
        duration: { // in milliseconds
            type: Number,
            default: 800,
            validator: (value: number) => value > 0,
        },
    },
});
</script>

<style lang="scss" scoped>

.animated-leaf-icon {
    font-size: 2rem;
    --transition-duration: 800ms;
}

.second-leaf,
.third-leaf {
    transition: {
        property: d, stroke-dashoffset, stroke-opacity;
        duration: var(--transition-duration);
    };

    stroke-dasharray: 21;
    stroke-dashoffset: 22;
    stroke-opacity: 0;
}

@mixin visible {
    stroke-dashoffset: 0;
    stroke-opacity: 1;
}

.two-leaves { .second-leaf { @include visible } }
.three-leaves { .second-leaf, .third-leaf { @include visible } }

</style>

<template>
    <svg class="nq-icon animated-leaf-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"
        stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" fill="none"
        :class="{ 'one-leaf': nleaf === 1, 'two-leaves': nleaf === 2, 'three-leaves': nleaf === 3 }"
        :style="{ '--transition-duration': duration + 'ms' }">
        <path class="stem" :d="stem"/>
        <path class="first-leaf" :d="firstLeaf"/>
        <path class="second-leaf" :d="secondLeaf"/>
        <path class="third-leaf" :d="thirdLeaf"/>
    </svg>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';

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
    setup(props) {
        const states = [
            {
                stem: `
                    M 9.75 16.25
                    v 0
                `,
                firstLeaf: `
                    M 15.75 7.25
                    c 00.000 03.938 -02.063 06.000 -06.000 06.000 00.000 -05.578 01.734 -06.000 06.000 -06.000
                    Z
                `,
                secondLeaf: `
                    M 9.75 16.25
                    c 00.000 -04.750 -00.501 -06.750 -02.000 -10.000 01.499 03.250 02.000 05.250 02.000 09.990
                `,
                thirdLeaf: `
                    M 10 9.75
                    c 00.000 00.082 -00.074 00.695 -00.147 00.752 00.00 -00.096 00.053 -00.690 00.147 -00.752
                    Z
                `,
            },
            {
                stem: `
                    M 10.75 17.25
                    v -5
                `,
                firstLeaf: `
                    M 17.25 7.75
                    c 00.000 04.266 -02.234 06.500 -06.500 06.500 00.000 -06.043 01.879 -06.500 06.500 -06.500
                    Z
                `,
                secondLeaf: `
                    M 10.75 12.25
                    c -00.002 -04.326 -00.358 -06.500 -05.500 -06.500 00.000 03.634 00.785 06.480 05.490 06.500
                `,
                thirdLeaf: `
                    M 11 9.75
                    c 00.000 00.082 -00.074 00.695 -00.147 00.752 00.000 -00.096 00.053 -00.690 00.147 -00.752
                    Z
                `,
            },
            {
                stem: `
                    M 10.75 19.25
                    v -5
                `,
                firstLeaf: `
                    M 17.75 9.75
                    c 00.000 04.266 -02.052 07.000 -07.000 07.000 00.000 -06.267 01.653 -07.000 07.000 -07.000
                    Z
                `,
                secondLeaf: `
                    M 10.75 14.25
                    c 00.000 -04.326 -01.358 -07.500 -06.500 -07.500 00.000 03.650 00.209 07.500 06.490 07.500
                `,
                thirdLeaf: `
                    M 14.135 2.002
                    c 02.219 04.050 01.127 07.462 -03.282 09.500 -02.307 -05.897 -00.892 -07.408 03.282 -09.500
                    Z
                `,
            },
        ];

        const stem = ref(states[1].stem);
        const firstLeaf = ref(states[1].firstLeaf);
        const secondLeaf = ref(states[1].secondLeaf);
        const thirdLeaf = ref(states[1].thirdLeaf);

        watch(() => props.nleaf, (value) => {
            stem.value = states[value - 1].stem;
            firstLeaf.value = states[value - 1].firstLeaf;
            secondLeaf.value = states[value - 1].secondLeaf;
            thirdLeaf.value = states[value - 1].thirdLeaf;
        });

        return {
            stem,
            firstLeaf,
            secondLeaf,
            thirdLeaf,
        };
    },
});
</script>

<style lang="scss" scoped>

.animated-leaf-icon {
    font-size: 2rem;
    --transition-duration: 800ms;
}

.stem,
.first-leaf,
.second-leaf,
.third-leaf {
    transition: {
        property: d, stroke-dashoffset, stroke-opacity;
        duration: var(--transition-duration);
    };

    // stroke-dasharray: 21;
    // stroke-dashoffset: 22;
    // stroke-opacity: 0;
}

// @mixin visible {
//     stroke-dashoffset: 0;
//     stroke-opacity: 1;
// }

// .two-leaves { .second-leaf { @include visible } }
// .three-leaves { .second-leaf, .third-leaf { @include visible } }

</style>

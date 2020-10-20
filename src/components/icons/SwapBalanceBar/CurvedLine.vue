<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        :style="{ width: `${localWidth}px`, height: `${height}px` }"
        :viewBox="`0 0 ${localWidth} ${height}`"
    >
        <path
            stroke="#1F2348"
            stroke-width="1.5"
            opacity=".24"
            :d="d"
        />
    </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';

export default defineComponent({
    props: {
        width: {
            type: Number,
            required: true,
            default: 100,
        },
        height: {
            type: Number,
            default: 50,
        },
        direction: {
            type: String,
            default: 'right',
            validator: (direction: string) => ['right', 'left'].includes(direction),
        },
    },
    setup: (props/* ,  context */) => {
        const minWidth = 2.5;
        const localWidth = computed(() => {
            if (props.width <= minWidth) {
                return minWidth;
            }

            return Math.round(props.width);
        });
        const angleSize = 12;
        const y = computed(() =>
            Math.max(3,
                Math.min(10,
                    angleSize - (localWidth.value / 10),
                ),
            ),
        );
        const x = computed(() =>
            Math.max(0,
                Math.min(12,
                    angleSize - (localWidth.value / 10),
                ),
            ),
        );

        const d = computed(() => {
            if (props.direction === 'right') {
                return `
                    M 1,1
                    v 1
                    s
                        0,${angleSize - y.value}
                        ${angleSize - x.value},${angleSize}
                    S
                        ${localWidth.value - (((angleSize - x.value) * 2) + 1)},
                            ${props.height - (angleSize + y.value + 3)}
                        ${localWidth.value - (angleSize + 1) + x.value},
                            ${props.height - (angleSize + 3)}
                    s
                        ${angleSize - x.value},${angleSize}
                        ${angleSize - x.value},${angleSize}
                    v 1
                `;
            }

            return `
                M ${localWidth.value - 1},1
                v 1
                s
                    0,${angleSize - y.value}
                    -${angleSize - x.value},${angleSize}
                S
                    ${((angleSize - x.value) * 2) + 1},
                        ${props.height - (angleSize + y.value + 3)}
                    ${(angleSize + 1) - x.value},
                        ${props.height - (angleSize + 3)}
                s
                    -${angleSize - x.value},${angleSize}
                    -${angleSize - x.value},${angleSize}
                v 1
            `;
        });

        return {
            localWidth,
            d,
        };
    },
});
</script>

<style lang="scss" scoped>

svg
svg path {
    // overflow: visible;
}

</style>

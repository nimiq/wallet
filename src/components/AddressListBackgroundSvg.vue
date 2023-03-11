<template>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" :viewBox="`0 0 ${width} ${height}`"
        :height="height" :width="width"
        v-bind="$attrs" v-on="$listeners"
        class="address-list-background-svg"
        :class="{ resizing }"
    >
        <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" :d="`M10 0 ${path} Z`" />
    </svg>
</template>
<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from '@vue/composition-api';

export default defineComponent({
    props: {
        width: {
            type: Number,
            default: 200,
        },
        height: {
            type: Number,
            default: 125,
        },
        cutouts: {
            /**
             * support only max 1 cutout per side except for the bottom which can have 2
             * @example
             * // a single centered & closed cutout at the bottom
             * { bottom: [false] }
             * // a single left-aligned & opened cutout at the bottom
             * { bottom: [true, null] }
             * // 2 cutouts at the bottom, the first one is opened, the second one closed
             * { bottom: [true, false] }
             * // etc...
             */
            type: Object as () => Record<'left' | 'bottom' | 'top' | 'right', Array<boolean | null>>,
        },
    },
    setup(props) {
        const isMobile = () => (window.innerWidth > 700);

        const GRID_GAP = 2 * 8; // 2rem
        const CORNER_SIZE = 10;
        const OPENED_CUTOUT_SIZE = 47.2;
        const DESKTOP_CLOSED_CUTOUT_SIZE = 26.8;
        const MOBILE_CLOSED_CUTOUT_SIZE = 39.2;
        const CLOSED_CUTOUT_SIZE = () => isMobile() ? DESKTOP_CLOSED_CUTOUT_SIZE : MOBILE_CLOSED_CUTOUT_SIZE;

        const cutouts = {
            left: {
                get closed() {
                    return isMobile() ? this._closed : this._mobileClosed;
                },
                _closed: `
                    c 0 -2.8 1.4 -5.4 2.7 -8
                    a 12 12 0 0 0 0 -10.8
                    c -1.3 -2.6 -2.7 -5.2 -2.7 -8
                `,
                opened: `
                    c 0 -3.9 2.4 -7.3 5.2 -10
                    a 19 19 0 0 0 0 -27.2
                    c -2.8 -2.7 -5.2 -6.1 -5.2 -10
                `,
                _mobileClosed: `
                    c 0 -3.5 2.1 -6.7 4.4 -9.5
                    a 16 16 0 0 0 0 -20.2
                    c -2.4 -2.9 -4.4 -6 -4.4 -9.5
                `,
            },
            bottom: {
                get closed() {
                    return isMobile() ? this._closed : this._mobileClosed;
                },
                _closed: `
                    c -2.8 0 -5.4 -1.4 -8 -2.7
                    a 12 12 0 0 0 -10.8 0
                    c -2.6 1.3 -5.2 2.7 -8 2.7
                `,
                opened: `
                    c -3.9 0 -7.3 -2.4 -10 -5.2
                    a 19 19 0 0 0 -27.2 0
                    c -2.7 2.8 -6.1 5.2 -10 5.2
                `,
                _mobileClosed: `
                    c -3.5 0 -6.7 -2.1 -9.5 -4.4
                    a 16 16 0 0 0 -20.2 0
                    c -2.9 2.4 -6 4.4 -9.5 4.4
                `,
            },
            top: {
                get closed() {
                    return isMobile() ? this._closed : this._mobileClosed;
                },
                _closed: `
                    c 2.8 0 5.4 1.4 8 2.7
                    a 12 12 0 0 0 10.8 0
                    c 2.6 -1.3 5.2 -2.7 8 -2.7
                `,
                opened: `
                    c 3.9 0 7.3 2.4 10 5.2
                    a 19 19 0 0 0 27.2 0
                    c 2.7 -2.8 6.1 -5.2 10 -5.2
                `,
                _mobileClosed: `
                    c 3.5 0 6.7 2.1 9.5 4.4
                    a 16 16 0 0 0 20.2 0
                    c 2.9 -2.4 6 -4.4 9.5 -4.4
                `,
            },
            right: {
                get closed() {
                    return isMobile() ? this._closed : this._mobileClosed;
                },
                _closed: `
                    c 0 2.8 -1.4 5.4 -2.7 8
                    a 12 12 0 0 0 0 10.8
                    c 1.3 2.6 2.7 5.2 2.7 8
                `,
                opened: `
                    c 0 3.9 -2.4 7.3 -5.2 10
                    a 19 19 0 0 0 0 27.2
                    c 2.8 2.7 5.2 6.1 5.2 10
                `,
                _mobileClosed: `
                    c 0 3.5 -2.1 6.7 -4.4 9.5
                    a 15.9 15.9 0 0 0 0 20
                    c 2.4 2.9 4.4 6 4.4 9.5
                `,
            },
        };

        const sides = computed(() => ({
            top: `h${props.width - (CORNER_SIZE * 2)}`,
            right: `v${props.height - (CORNER_SIZE * 2)}`,
            bottom: `h-${props.width - (CORNER_SIZE * 2)}`,
            left: `v-${props.height - (CORNER_SIZE * 2)}`,
        }));

        const corners = {
            'top-right': 'a10 10 0 0 1 10 10',
            'bottom-right': 'a10 10 0 0 1-10 10',
            'bottom-left': 'a10 10 0 0 1-10-10',
            'top-left': 'a10 10 0 0 1 10 -10',
        };

        // starting from the top left corner, clockwise
        const path = computed(() => {
            if (!props.cutouts) {
                return sides.value.top
                    + corners['top-right']
                    + sides.value.right
                    + corners['bottom-right']
                    + sides.value.bottom
                    + corners['bottom-left']
                    + sides.value.left
                    + corners['top-left'];
            }

            let ret = '';

            // TOP SIDE
            if (!props.cutouts.top || props.cutouts.top.length > 1) {
                ret += sides.value.top;
            } else {
                const topCutout = props.cutouts.top;
                const diff = (OPENED_CUTOUT_SIZE - CLOSED_CUTOUT_SIZE()) / 2;
                const spacing = ((props.width - ((CORNER_SIZE * 2) + CLOSED_CUTOUT_SIZE()))) / 2;

                ret += `h${spacing - (topCutout[0] ? diff : 0)}`;
                ret += topCutout[0] ? cutouts.top.opened : cutouts.top.closed;
                ret += `h${spacing - (topCutout[0] ? diff : 0)}`;
            }

            // TOP RIGHT CORNER
            ret += corners['top-right'];

            // RIGHT SIDE
            if (!props.cutouts.right || props.cutouts.right.length > 1) {
                ret += sides.value.right;
            } else {
                const rightCutout = props.cutouts.right;
                const diff = (OPENED_CUTOUT_SIZE - CLOSED_CUTOUT_SIZE()) / 2;
                const spacing = ((props.height - ((CORNER_SIZE * 2) + CLOSED_CUTOUT_SIZE()))) / 2;

                ret += `v${spacing - (rightCutout[0] ? diff : 0)}`;
                ret += rightCutout[0] ? cutouts.right.opened : cutouts.right.closed;
                ret += `v${spacing - (rightCutout[0] ? diff : 0)}`;
            }

            // BOTTOM RIGHT CORNER
            ret += corners['bottom-right'];

            // BOTTOM SIDE
            if (!props.cutouts.bottom || props.cutouts.bottom.length > 2) {
                ret += sides.value.bottom;
            } else {
                const bottomCutout = props.cutouts.bottom;
                const diff = (OPENED_CUTOUT_SIZE - CLOSED_CUTOUT_SIZE()) / 2;

                if (bottomCutout.length === 1) { // 1 cutout
                    const spacing = ((props.width - ((CORNER_SIZE * 2) + CLOSED_CUTOUT_SIZE()))) / 2;

                    ret += `h-${spacing - (bottomCutout[0] ? diff : 0)}`;
                    ret += bottomCutout[0] ? cutouts.bottom.opened : cutouts.bottom.closed;
                    ret += `h-${spacing - (bottomCutout[0] ? diff : 0)}`;
                } else if (bottomCutout.length === 2) { // 2 cutouts
                    const spacing = ((props.width - ((CORNER_SIZE * 2) + (CLOSED_CUTOUT_SIZE() * 2) + GRID_GAP))) / 4;

                    if (typeof bottomCutout[1] === 'boolean') {
                        ret += `h-${spacing - CORNER_SIZE / 2 - (bottomCutout[1] ? diff : 0)}`;
                        ret += bottomCutout[1] === true ? cutouts.bottom.opened : cutouts.bottom.closed;
                        ret += `h-${spacing + CORNER_SIZE / 2 - (bottomCutout[1] ? diff : 0)}`;
                    } else {
                        ret += `h-${spacing * 2 + CLOSED_CUTOUT_SIZE()}`;
                    }

                    ret += `h-${GRID_GAP}`;

                    if (typeof bottomCutout[0] === 'boolean') {
                        ret += `h-${spacing + CORNER_SIZE / 2 - (bottomCutout[0] ? diff : 0)}`;
                        ret += bottomCutout[0] === true ? cutouts.bottom.opened : cutouts.bottom.closed;
                        ret += `h-${spacing - CORNER_SIZE / 2 - (bottomCutout[0] ? diff : 0)}`;
                    } else {
                        ret += `h-${spacing * 2 + CLOSED_CUTOUT_SIZE()}`;
                    }
                }
            }

            // BOTTOM LEFT CORNER
            ret += corners['bottom-left'];

            // LEFT SIDE
            if (!props.cutouts.left || props.cutouts.left.length > 1) {
                ret += sides.value.left;
            } else {
                const leftCutout = props.cutouts.left;
                const diff = (OPENED_CUTOUT_SIZE - CLOSED_CUTOUT_SIZE()) / 2;
                const spacing = ((props.height - ((CORNER_SIZE * 2) + CLOSED_CUTOUT_SIZE()))) / 2;

                ret += `v-${spacing - (leftCutout[0] ? diff : 0)}`;
                ret += leftCutout[0] ? cutouts.left.opened : cutouts.left.closed;
                ret += `v-${spacing - (leftCutout[0] ? diff : 0)}`;
            }

            // TOP LEFT CORNER
            ret += corners['top-left'];

            return ret;
        });

        // disable transitions on window resize
        const resizing = ref(false);
        let resizeTimeout: any = null;
        function onResize() {
            clearTimeout(resizeTimeout);
            resizing.value = true;
            resizeTimeout = setTimeout(() => {
                resizing.value = false;
            }, 100);
        }

        onMounted(() => {
            window.addEventListener('resize', onResize);
        });

        onUnmounted(() => {
            window.removeEventListener('resize', onResize);
        });

        return { path, resizing };
    },
});
</script>
<style lang="scss" scoped>
svg.address-list-background-svg {
    &.resizing path {
        transition: none !important;
    }
}
</style>

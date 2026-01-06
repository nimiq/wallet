<template functional>
    <svg :class="['shield-time-icon', props.variant]" xmlns="http://www.w3.org/2000/svg" width="18" height="19"
        fill="none" viewBox="0 0 18 19">
        <!-- eslint-disable max-len -->
        <path fill="url(#shield-time-gradient)" stroke="#3C375A" stroke-width=".75"
            d="M3.74 2.813h9.52c.478 0 .865.387.865.864v2.798c0 4.969-2.654 8.096-5.27 9.598a.712.712 0 0 1-.71 0c-2.616-1.502-5.27-4.63-5.27-9.598V3.677c0-.477.387-.865.864-.865Z"
            opacity=".7"/>
        <path class="stroke-main" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M10.125.75h3.26a2.927 2.927 0 0 1 2.928 2.927v2.798c0 1.705-.271 3.233-.733 4.588m-1.33 2.754a12.46 12.46 0 0 1-4.244 4.045 2.773 2.773 0 0 1-2.762 0A12.46 12.46 0 0 1 3 13.817"/>
        <path class="stroke-secondary" stroke-linecap="round" stroke-width="1.5"
            d="M6.938.813H3.676A2.927 2.927 0 0 0 .75 3.739v2.798c0 1.705.27 3.233.733 4.588"/>
        <!-- eslint-enable max-len -->
        <defs>
            <radialGradient id="shield-time-gradient" cx="0" cy="0" r="1"
                gradientTransform="matrix(6.74999 11.24996 -9.47366 5.6842 4 3.563)"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#fff"/>
                <stop offset="1" stop-color="#fff" stop-opacity=".62"/>
            </radialGradient>
        </defs>
    </svg>
</template>

<script lang="ts">
export default {
    name: 'ShieldTimeIcon',
    props: {
        variant: {
            type: String as () => 'orange' | 'green',
            default: 'orange',
            validator: (value: string) => ['orange', 'green'].includes(value),
        },
    },
};
</script>

<style lang="scss" scoped>
.shield-time-icon {
    &.orange {
        .stroke-main {
            stroke: #E9B213;
        }

        .stroke-secondary {
            stroke: #fff;
            opacity: 0.3;
        }
    }

    &.green {
        .stroke-main {
            stroke: #21BCA5;
        }

        .stroke-secondary {
            stroke: #21BCA5;
        }
    }
}
</style>

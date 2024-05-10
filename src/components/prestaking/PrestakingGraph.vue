<template>
    <div class="prestaking-graph">
        <div class="scroll-container">
            <div class="flex-grow"></div>
            <div
                v-for="i in firstActiveBarIndex" :key="`bar-filled-${i}`"
                class="bar nq-gold-bg opacity-30"
            ></div>
            <div
                v-for="i in 3" :key="`bar-active-${i}`"
                class="bar"
                :class="{
                    'nq-gold-bg': i <= numberOfActiveBarsFilled,
                    'pulsing': i <= numberOfActiveBarsFilled && !passive,
                    'bordered': i > numberOfActiveBarsFilled
                }"
            ></div>
            <div
                v-for="i in numberOfInactiveBars" :key="`bar-inactive-${i}`"
                class="bar nq-blue-bg"
                :class="{
                    'opacity-07': i <= numberOfInactiveBars - 6,
                    'opacity-06': i === numberOfInactiveBars - 5,
                    'opacity-05': i === numberOfInactiveBars - 4,
                    'opacity-04': i > numberOfInactiveBars - 4,
                }"
            ></div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        prestakeAmount: {
            type: Number,
            required: true,
        },
        accountBalance: {
            type: Number,
            required: true,
        },
        passive: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const numberOfBars = 50;

        // TODO: Compute from current total stake graph scale
        const firstActiveBarIndex = computed(() => 30);

        const numberOfActiveBarsFilled = computed(() => Math.ceil((props.prestakeAmount / props.accountBalance) * 3));
        const numberOfInactiveBars = computed(() => numberOfBars - firstActiveBarIndex.value + 1 - 3);

        return {
            numberOfBars,
            firstActiveBarIndex,
            numberOfInactiveBars,
            numberOfActiveBarsFilled,
        };
    },
});
</script>

<style lang="scss" scoped>
.prestaking-graph {
    height: 150px;
    overflow: hidden;
}

.scroll-container {
    height: 100%;
    display: flex;
    justify-content: space-between;
    gap: 3px;

    // Ensure bars are right-aligned (overflowing on the left)
    margin-right: -0.125rem;
    margin-left: -999rem;
}

.bar {
    width: 1rem;
    border-radius: 0.25rem;
    flex-shrink: 0;

    &.opacity-30 {
        opacity: 0.3;
    }

    &.opacity-07 {
        opacity: 0.07;
    }

    &.opacity-06 {
        opacity: 0.06;
    }

    &.opacity-05 {
        opacity: 0.05;
    }

    &.opacity-04 {
        opacity: 0.04;
    }

    &.pulsing {
        animation: pulse 1s infinite;
    }

    @keyframes pulse {
          0% { opacity: 1; }
         50% { opacity: 0.7; }
        100% { opacity: 1; }
    }

    &.bordered {
        box-sizing: border-box;
        border: 0.25rem solid var(--nimiq-gold);
        opacity: 0.4;
    }
}
</style>

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
                class="bar"
                :class="{
                    'opacity-07': i <= numberOfInactiveBars - 6,
                    'opacity-06': i === numberOfInactiveBars - 5,
                    'opacity-05': i === numberOfInactiveBars - 4,
                    'opacity-04': i > numberOfInactiveBars - 4,
                    'extra-margin': i === numberOfInactiveBars - 12,
                }"
            >
                <div v-if="i === numberOfInactiveBars - 12" class="bubble-container">
                    <div class="bubble nq-gold-bg">
                        {{ formatBubble(secondMark) }}
                    </div>
                    <div class="bubble-line"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        globalStake: {
            type: Number,
            required: true,
        },
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

        /**
         * The luna value between the two x-axis marks, which represents 20 bars.
         * This amount depends on the user's account balance, as the user should always
         * fill three bars when they stake their complete balance.
         */
        const valueBetweenMarks = computed(() => {
            const extrapolatedValue = (props.accountBalance / 3) * 20;
            // Round to one significant digit
            let roundedValue = Number(extrapolatedValue.toPrecision(1));
            if (roundedValue.toString(10)[0] === '1') {
                // Do not immediately jump to the next magnitute
                roundedValue = Number(extrapolatedValue.toPrecision(2));
            }
            return roundedValue;
        });

        const firstMark = computed(
            () => Math.trunc(props.globalStake / valueBetweenMarks.value) * valueBetweenMarks.value,
        );

        const secondMark = computed(() => firstMark.value + valueBetweenMarks.value);

        // TODO: Compute from current total stake graph scale
        const firstActiveBarIndex = computed(() => 30);

        const numberOfActiveBarsFilled = computed(() => Math.ceil((props.prestakeAmount / props.accountBalance) * 3));
        const numberOfInactiveBars = computed(() => numberOfBars - firstActiveBarIndex.value + 1 - 3);

        function formatBubble(value: number): string {
            return Intl.NumberFormat(navigator.language, {
                notation: 'compact',
                // maximumSignificantDigits: 4,
            }).format(value);
        }

        return {
            numberOfBars,
            firstActiveBarIndex,
            numberOfInactiveBars,
            numberOfActiveBarsFilled,
            firstMark,
            secondMark,
            formatBubble,
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

    padding-top: 3.5rem;

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
        background: rgba(31, 35, 72, 0.07);
    }

    &.opacity-06 {
        background: rgba(31, 35, 72, 0.06);
    }

    &.opacity-05 {
        background: rgba(31, 35, 72, 0.05);
    }

    &.opacity-04 {
        background: rgba(31, 35, 72, 0.04);
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

    &.extra-margin {
        margin-right: 0.625rem;
    }

    .bubble-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 10rem;
        margin-top: -3.5rem;
        margin-left: -3.5rem;
    }

    .bubble {
        position: relative;
        border-radius: 99rem;
        width: fit-content;
        padding: 0.25rem 1rem;
        font-size: var(--small-label-size);
        font-weight: bold;

        &::before {
            position: absolute;
            content: '';
            top: 100%;
            left: 50%;
            width: 0.75rem;
            height: 0.75rem;
            background: var(--nimiq-gold-darkened);
            transform: translate(-50%, -50%) rotate(45deg);
        }
    }

    .bubble-line {
        margin-top: 1.125rem;
        height: 20rem; // Overflow hidden by this component's root
        width: 0.25rem;
        background: linear-gradient(
            to bottom,
            var(--nimiq-gold),
            var(--nimiq-gold) 50%,
            white 50%,
            white
        );
        background-size: 100% 1rem;
    }
}
</style>

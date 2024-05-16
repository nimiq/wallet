<template>
    <div class="prestaking-graph">
        <div class="scroll-container">
            <div class="flex-grow"></div>
            <div
                v-for="i in PREFIX_BARS + firstActiveBarIndex" :key="`bar-filled-${i}`"
                class="bar"
            >
                <div class="bar-background gold-bg opacity-30"></div>
                <div v-if="i === PREFIX_BARS" class="bubble-container first">
                    <div class="bubble first-mark">
                        {{ formatBubble(firstMark, secondMark) }}
                    </div>
                </div>
            </div>
            <div
                v-for="i in 3" :key="`bar-active-${i}`"
                class="bar"
                :class="{
                    'extra-margin': numberOfInactiveBars < 12 && i === BARS_BETWEEN_MARKS - firstActiveBarIndex + 1,
                }"
            >
                <div class="bar-background" :class="{
                    'nq-gold-bg': i <= numberOfActiveBarsFilled,
                    'pulsing': i <= numberOfActiveBarsFilled && !passive,
                    'bordered': i > numberOfActiveBarsFilled
                }"></div>
                <div v-if="numberOfInactiveBars < 12 && i === BARS_BETWEEN_MARKS - firstActiveBarIndex + 1"
                    class="bubble-container second"
                >
                    <div class="bubble nq-gold-bg">
                        {{ formatBubble(secondMark, firstMark) }}
                    </div>
                    <div class="bubble-line"></div>
                </div>
            </div>
            <div
                v-for="i in numberOfInactiveBars" :key="`bar-inactive-${i}`"
                class="bar"
                :class="{
                    'extra-margin': i === numberOfInactiveBars - 11,
                }"
            >
                <div class="bar-background nq-blue-bg" :class="{
                    'opacity-07': i <= numberOfInactiveBars - 6,
                    'opacity-06': i === numberOfInactiveBars - 5,
                    'opacity-05': i === numberOfInactiveBars - 4,
                    'opacity-04': i > numberOfInactiveBars - 4,
                }"></div>
                <div v-if="i === numberOfInactiveBars - 11" class="bubble-container second">
                    <div class="bubble nq-gold-bg">
                        {{ formatBubble(secondMark, firstMark) }}
                    </div>
                    <div class="bubble-line"></div>
                </div>
            </div>
        </div>
        <div class="third-mark">
            {{ formatBubble(thirdMark, secondMark) }}
            <CaretRightSmallIcon />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { CaretRightSmallIcon } from '@nimiq/vue-components';
import { useSettingsStore } from '../../stores/Settings';

const PREFIX_BARS = 18;
const BARS_BETWEEN_MARKS = 20;
const SUFFIX_BARS = 12;

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
        /**
         * The luna value between the two x-axis marks, which represents 20 bars.
         * This amount depends on the user's account balance, as the user should always
         * fill three bars when they stake their complete balance.
         */
        const valueBetweenMarks = computed(() => {
            const extrapolatedValue = (props.accountBalance / 3) * 20;
            // Round to one significant digit
            let roundedValue = Number(extrapolatedValue.toPrecision(1));
            if (roundedValue.toString(10)[0] === '1' || roundedValue.toString(10)[0] === '2') {
                // Do not immediately jump to the next magnitute
                roundedValue = Number(extrapolatedValue.toPrecision(2));
            }
            return roundedValue;
        });

        const firstMark = computed(
            () => Math.trunc(props.globalStake / valueBetweenMarks.value) * valueBetweenMarks.value,
        );

        const secondMark = computed(() => firstMark.value + valueBetweenMarks.value);
        const thirdMark = computed(() => secondMark.value + valueBetweenMarks.value);

        const firstActiveBarIndex = computed(
            () => Math.floor(((props.globalStake - firstMark.value) / valueBetweenMarks.value) * 20),
        );

        const numberOfActiveBarsFilled = computed(() => Math.ceil((props.prestakeAmount / props.accountBalance) * 3));
        const numberOfInactiveBars = computed(
            () => SUFFIX_BARS + BARS_BETWEEN_MARKS - firstActiveBarIndex.value - 3,
        );

        function formatBubble(value: number, otherValue: number): string {
            let minimumSignificantDigits = 1;
            let valueFormatted: string;
            while (true) { // eslint-disable-line no-constant-condition
                const formatter = Intl.NumberFormat(useSettingsStore().language.value, {
                    notation: 'compact',
                    minimumSignificantDigits,
                });
                valueFormatted = formatter.format(value / 1e5);
                const otherValueFormatted = formatter.format(otherValue / 1e5);
                if (valueFormatted !== otherValueFormatted) {
                    break;
                } else {
                    minimumSignificantDigits++;
                }
            }
            return valueFormatted;
        }

        return {
            PREFIX_BARS,
            BARS_BETWEEN_MARKS,
            firstActiveBarIndex,
            numberOfInactiveBars,
            numberOfActiveBarsFilled,
            firstMark,
            secondMark,
            thirdMark,
            formatBubble,
        };
    },
    components: {
        CaretRightSmallIcon,
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
    flex-shrink: 0;
    position: relative;

    .bar-background {
        width: 100%;
        height: 100%;
        border-radius: 0.25rem;

        &.gold-bg {
            background: var(--nimiq-gold);
        }

        &.opacity-30 { opacity: 0.30; }
        &.opacity-07 { opacity: 0.07; }
        &.opacity-06 { opacity: 0.06; }
        &.opacity-05 { opacity: 0.05; }
        &.opacity-04 { opacity: 0.04; }

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

    &.extra-margin {
        margin-left: 0.625rem;
    }

    .bubble-container {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 10rem;
        margin-top: -3.5rem;

        &.first {
            margin-left: -3.875rem;
        }

        &.second {
            margin-left: -5.5rem;
        }
    }

    .bubble {
        position: relative;
        border-radius: 99rem;
        width: fit-content;
        padding: 0.25rem 1.125rem;
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

        &.first-mark {
            background: #F9E8B8; // Nimiq Gold with 30% opacity
            color: #B48600;

            &::before {
                background: #F9E8B8; // Nimiq Gold with 30% opacity
            }
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

.third-mark {
    position: absolute;
    right: 1.75rem;
    top: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    font-size: var(--small-label-size);
    line-height: 1;
    color: var(--text-40);
    font-weight: bold;

    svg {
        width: 1.25rem;
        height: 1.25rem;
    }
}
</style>

<template>
    <Tooltip
        ref="tooltip$"
        class="timer"
        v-bind="{
            preferredPosition: 'bottom right',
            theme:
                theme === TimerThemes.INVERSE || theme === TimerThemes.WHITE
                    ? TooltipThemes.INVERSE
                    : TooltipThemes.NORMAL,
            ...tooltipProps,
            styles: {
                width: '18.25rem',
                pointerEvents: 'none',
                ...(tooltipProps ? tooltipProps.styles : undefined),
            },
        }"
        @show="detailsShown = true"
        @hide="detailsShown = false"
        :class="{
            'time-shown': detailsShown || alwaysShowTime,
            'little-time-left': progress >= 0.75,
            'inverse-theme': theme === TimerThemes.INVERSE,
            'white-theme': theme === TimerThemes.WHITE,
        }"
    >
        <template #trigger>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26">
                <circle
                    class="time-circle"
                    cx="50%"
                    cy="50%"
                    :r="radius.currentValue"
                    :stroke-dasharray="`${timeCircleInfo.length} ${timeCircleInfo.gap}`"
                    :stroke-dashoffset="timeCircleInfo.offset"
                    :stroke-width="timeCircleInfo.strokeWidth"
                ></circle>
                <circle
                    class="filler-circle"
                    cx="50%"
                    cy="50%"
                    :r="radius.currentValue"
                    :stroke-dasharray="`${fillerCircleInfo.length} ${fillerCircleInfo.gap}`"
                    :stroke-dashoffset="fillerCircleInfo.offset"
                    :stroke-width="fillerCircleInfo.strokeWidth"
                ></circle>

                <transition name="transition-fade">
                    <g v-if="!detailsShown && !alwaysShowTime" class="info-exclamation-icon">
                        <rect x="12" y="9" width="2" height="2" rx="1" />
                        <rect x="12" y="12.5" width="2" height="4.5" rx="1" />
                    </g>
                    <text v-else class="countdown" x="50%" y="50%">
                        {{ toSimplifiedTime(timeLeft, false, maxUnit) }}
                    </text>
                </transition>
            </svg>
        </template>
        <template #default>
            <i18n path="This offer expires in {timer}.">
                <template v-slot:timer>{{ toSimplifiedTime(timeLeft, true, maxUnit) }}</template>
            </i18n>
        </template>
    </Tooltip>
</template>

<script lang="ts">
import { Tweenable } from '@nimiq/utils';
import { computed, defineComponent, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from '@/lib/useI18n';
import Tooltip, { TooltipThemes } from './Tooltip.vue';

export enum TimerThemes {
    NORMAL = 'normal',
    INVERSE = 'inverse',
    WHITE = 'white',
}

interface CircleInfo {
    length: number;
    lengthWithLineCaps: number;
    gap: number;
    offset: number;
    strokeWidth: number;
}

const REM_FACTOR = 8; // size of 1rem
const BASE_SIZE = 3.25 * REM_FACTOR;
const BASE_RADIUS = REM_FACTOR;
const RADIUS_GROWTH_FACTOR = 1.5;

const TIME_STEPS = [
    { unit: 'minute', factor: 60 },
    { unit: 'hour', factor: 60 },
    { unit: 'day', factor: 24 },
];

const Timer = defineComponent({
    props: {
        startTime: Number,
        endTime: Number,
        alwaysShowTime: {
            type: Boolean,
            default: true,
        },
        theme: {
            type: String as () => TimerThemes,
            default: TimerThemes.NORMAL,
            validator: (value: unknown) => Object.values(TimerThemes).includes(value as TimerThemes),
        },
        strokeWidth: {
            type: Number,
            default: 2,
        },
        tooltipProps: Object as () => { styles?: Partial<CSSStyleDeclaration>; [prop: string]: unknown },
        maxUnit: {
            type: String,
            required: false,
            validator: (value: unknown) =>
                [undefined, 'second', 'minute', 'hour', 'day'].includes(value as string | undefined),
        },
    },
    setup(props, context) {
        const { $t } = useI18n();

        const tooltip$ = ref<Tooltip | null>(null);

        const timeOffset = ref(0);
        const sampledTime = ref(0);
        const detailsShown = ref(false);
        // While the radius r of the circle and the values stroke-dasharray, stroke-dashoffset and stroke-width that
        // depend on the radius can be transitioned via css, the behavior on value update during an ongoing transition
        // is not consistent (e.g. time update while animating on user hover or quick hover and unhover). Therefore
        // animate via JS.
        const radius = reactive(
            new Tweenable(
                detailsShown.value || props.alwaysShowTime ? BASE_RADIUS * RADIUS_GROWTH_FACTOR : BASE_RADIUS,
            ),
        );
        const fullCircleLength = ref(2 * Math.PI * radius.currentValue);
        let timeoutId = -1;
        let updateTimeoutId = -1;
        let requestAnimationFrameId = -1;
        let size = BASE_SIZE;

        onMounted(() => {
            const $el = tooltip$.value!.$el as HTMLElement;
            requestAnimationFrame(() => (size = $el.offsetWidth)); // in rAF to avoid forced reflow
            window.addEventListener('resize', onResize);
        });

        onUnmounted(() => {
            clearTimeout(timeoutId);
            clearTimeout(updateTimeoutId);
            cancelAnimationFrame(requestAnimationFrameId);
            window.removeEventListener('resize', onResize);
        });

        const totalTime = computed(() => {
            if (props.startTime === undefined || props.endTime === undefined) return 0;
            return Math.max(0, props.endTime - props.startTime);
        });

        const timeLeft = computed(() => {
            if (props.startTime === undefined || props.endTime === undefined) return 0;
            return Math.max(0, Math.min(totalTime.value, props.endTime - sampledTime.value));
        });

        const progress = computed(() => {
            if (props.startTime === undefined || props.endTime === undefined || totalTime.value === 0) return 0;
            return 1 - timeLeft.value / totalTime.value;
        });

        const timeCircleInfo = computed<CircleInfo>(() => {
            // Have a max length to make it more recognizable that this is a timer by never rendering a full circle.
            // The rounded stroke ending rendered with radius strokeWidth/2 does not count towards the stroke length,
            // therefore to get the desired gap of 1.5 strokeWidths, we use 2.5 strokeWidths.
            const maxLength = fullCircleLength.value - 2.5 * props.strokeWidth;
            const length = Math.min(maxLength, (1 - progress.value) * fullCircleLength.value);
            const lengthWithLineCaps = length + props.strokeWidth; // add line caps with strokeWidth/2 radius
            const gap = fullCircleLength.value - length;
            // The path grows clockwise starting on the right side. Offset by 90 degrees and gap to let path start with
            // gap and end on top.
            const offset = fullCircleLength.value / 4 - gap;
            return { length, lengthWithLineCaps, gap, offset, strokeWidth: props.strokeWidth };
        });

        const fillerCircleInfo = computed<CircleInfo>(() => {
            // Filler circle should be rendered in the gap left by the time circle with a margin of strokeWidth. If
            // there is not enough space, compensate by reducing the filler circle stroke width.
            const availableSpace =
                fullCircleLength.value - timeCircleInfo.value.lengthWithLineCaps - 2 * props.strokeWidth;
            const lengthWithLineCaps = Math.max(0, availableSpace);
            const strokeWidth = Math.min(props.strokeWidth, lengthWithLineCaps);
            const length = Math.max(0, lengthWithLineCaps - strokeWidth); // subtract rounded line caps
            const gap = fullCircleLength.value - length;
            const offset =
                fullCircleLength.value / 4 // rotate by 90 degrees
                - props.strokeWidth / 2 // skip rounded line cap of time circle
                - props.strokeWidth // margin
                - strokeWidth / 2; // account for our own line cap
            return { length, lengthWithLineCaps, gap, offset, strokeWidth };
        });

        function toSimplifiedTime(millis: number, includeUnit?: true, maxUnit?: string): string;
        function toSimplifiedTime(millis: number, includeUnit: false, maxUnit?: string): number;
        function toSimplifiedTime(millis: number, includeUnit: boolean = true, maxUnit?: string): number | string {
            // find appropriate unit, starting with second
            let resultTime = millis / 1000;
            let resultUnit = 'second';
            for (const { unit, factor } of TIME_STEPS) {
                if (resultTime / factor < 1 || resultUnit === maxUnit) break;
                resultTime /= factor;
                resultUnit = unit;
            }

            resultTime = Math.floor(resultTime);
            if (!includeUnit) return resultTime;

            const i18nTime: Record<string, string> = {
                get second() {
                    return $t('second') as string;
                },
                get seconds() {
                    return $t('seconds') as string;
                },
                get minute() {
                    return $t('minute') as string;
                },
                get minutes() {
                    return $t('minutes') as string;
                },
                get hour() {
                    return $t('hour') as string;
                },
                get hours() {
                    return $t('hours') as string;
                },
                get day() {
                    return $t('day') as string;
                },
                get days() {
                    return $t('days') as string;
                },
            };

            resultUnit = i18nTime[`${resultUnit}${resultTime !== 1 ? 's' : ''}`];
            return `${resultTime} ${resultUnit}`;
        }

        function synchronize(referenceTime: number) {
            timeOffset.value = referenceTime - Date.now();
        }

        function calculateUpdateInterval(): number {
            // Not a computed prop to avoid unnecessary updates when not needed.
            const scaleFactor = size / BASE_SIZE;
            const circleLengthPixels = fullCircleLength.value * scaleFactor;
            const steps = circleLengthPixels * 3; // update every .33 pixel change for smooth transitions
            const minInterval = 1000 / 60; // up to 60 fps
            // Constrain interval such that we don't skip time steps in the countdown for the respective time unit.
            const timeLeftValue = timeLeft.value;
            const totalTimeValue = totalTime.value;
            const updatesPerTimeStep = 2; // multiple updates per time step to avoid skipping a step by a delayed interval
            let timeStep = 1000; // starting with seconds
            let maxInterval = timeStep / updatesPerTimeStep;
            for (const { factor } of TIME_STEPS) {
                const nextTimeStep = timeStep * factor;
                const nextMaxInterval = nextTimeStep / updatesPerTimeStep;
                const nextInterval = Math.min(nextMaxInterval, Math.max(minInterval, totalTimeValue / steps));
                if ((timeLeftValue - nextInterval) / nextTimeStep < 1) {
                    // If the time left after nextInterval can't be expressed in nextTimeStep as a value >=1, stop. We
                    // check for the time after the next interval to avoid jumping for example from 70s (displayed as 1
                    // minute) directly to 50s if the interval is 20s. Note that the behavior here resembles the one in
                    // toSimplifiedTime.
                    if (timeLeftValue / nextTimeStep > 1) {
                        // If the value before the interval is still >1 in the next time unit still allow a larger jump
                        // than at the smaller time unit but set the maxInterval such that we jump no further than where
                        // the switch to the smaller unit happens, for example jump from 70s to 60s if the interval is
                        // 20s.
                        maxInterval = timeLeftValue - nextTimeStep;
                    }
                    break;
                }
                timeStep = nextTimeStep;
                maxInterval = nextMaxInterval;
            }

            return Math.min(maxInterval, Math.max(minInterval, totalTime.value / steps));
        }

        function setRadius() {
            radius.tweenTo(
                detailsShown.value || props.alwaysShowTime ? RADIUS_GROWTH_FACTOR * BASE_RADIUS : BASE_RADIUS,
                300,
            );
            rerender();
        }

        function setTimer() {
            sampledTime.value = Date.now() + timeOffset.value;
            clearTimeout(timeoutId);
            if (props.startTime && props.endTime) {
                timeoutId = window.setTimeout(
                    () => context.emit('end', props.endTime),
                    props.endTime - sampledTime.value,
                );
                rerender();
            }
        }

        function rerender() {
            sampledTime.value = Date.now() + timeOffset.value;
            fullCircleLength.value = 2 * Math.PI * radius.currentValue;

            if (timeLeft.value === 0 && radius.finished) return;

            clearTimeout(updateTimeoutId);
            cancelAnimationFrame(requestAnimationFrameId);

            if (!radius.finished) {
                // animate radius with high frame rate
                requestAnimationFrameId = requestAnimationFrame(() => rerender());
            } else {
                // update with low frame rate
                updateTimeoutId = window.setTimeout(() => rerender(), calculateUpdateInterval());
            }
        }

        function onResize() {
            size = (tooltip$.value!.$el as HTMLElement).offsetWidth;
        }

        watch(detailsShown, setRadius, { immediate: true });
        watch(() => props.alwaysShowTime, setRadius);

        watch(() => props.startTime, setTimer, { immediate: true });
        watch(() => props.endTime, setTimer);
        watch(timeOffset, setTimer);

        return {
            TimerThemes,
            TooltipThemes,
            tooltip$,
            detailsShown,
            radius,
            timeLeft,
            progress,
            timeCircleInfo,
            fillerCircleInfo,
            toSimplifiedTime,
            synchronize,
        };
    },
    components: {
        Tooltip,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type Timer = InstanceType<typeof Timer>;
export default Timer;
</script>

<style lang="scss" scoped>
.timer {
    width: 3.25rem;
    position: relative;
}

// for setting height automatically depending on width
.timer::before {
    content: '';
    padding-top: 100%;
    display: block;
}

.tooltip :deep(.trigger),
svg {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
}

svg {
    fill: none;
    stroke-linecap: round;
}

circle {
    stroke: var(--nimiq-blue);
    transition:
        stroke 0.3s var(--nimiq-ease),
        opacity 0.3s var(--nimiq-ease);
}

.inverse-theme circle,
.white-theme circle {
    stroke: white;
}

.filler-circle {
    opacity: 0.2;
}

.time-circle {
    opacity: 0.3;
}

.time-shown .time-circle {
    stroke: var(--nimiq-light-blue);
    opacity: 1;
}

.inverse-theme.time-shown:not(.little-time-left) .time-circle {
    stroke: var(--nimiq-light-blue-on-dark, var(--nimiq-light-blue));
}

.white-theme.time-shown:not(.little-time-left) .time-circle {
    stroke: rgba(255, 255, 255, 0.4);
}

// .inverse-theme.time-shown .filler-circle,
// .white-theme.time-shown .filler-circle {
//     opacity: 0;
// }

.little-time-left .time-circle {
    stroke: var(--nimiq-orange);
    opacity: 1;
}

.info-exclamation-icon {
    fill: var(--nimiq-blue);
    opacity: 0.4;
    transform-origin: center;
    transition:
        fill 0.3s var(--nimiq-ease),
        opacity 0.3s var(--nimiq-ease),
        transform 0.3s var(--nimiq-ease);
}

.inverse-theme .info-exclamation-icon,
.white-theme .info-exclamation-icon {
    fill: white;
}

.little-time-left .info-exclamation-icon {
    fill: var(--nimiq-orange);
    opacity: 1;
    transform: rotate(180deg); // turn info icon into an exclamation mark
}

.countdown {
    font-size: 12px; // relative to svg viewBox
    font-weight: bold;
    text-anchor: middle;
    dominant-baseline: central;
    fill: var(--nimiq-light-blue);
    transition: fill 0.3s var(--nimiq-ease);
}

.inverse-theme .countdown {
    fill: var(--nimiq-light-blue-on-dark, var(--nimiq-light-blue));
}

.white-theme .countdown {
    fill: rgba(255, 255, 255, 0.6);
}

.little-time-left .countdown {
    fill: var(--nimiq-orange);
}

.transition-fade-enter-active,
.transition-fade-leave-active {
    transition: opacity 0.3s var(--nimiq-ease);
}

.transition-fade-enter,
.transition-fade-leave-to {
    opacity: 0 !important;
}
</style>

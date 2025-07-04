<template>
    <div class="amount-slider slider-container" ref="$container" :class="{ animate: animate }">
        <div class="slider-body">
            <div class="slider-background">
                <div class="background-one" ref="$backgroundLinesLeft" />
                <div class="background-two" ref="$backgroundMiddlePlant" />
                <div class="background-three" ref="$backgroundLinesRight" />
                <div class="background-four" ref="$backgroundRightPlant" />
                <div class="scalar-amount left">
                    0 NIM
                </div>

                <div class="scalar-amount right">
                    <Amount :amount="availableAmount" :currency="CryptoCurrency.NIM"/>
                </div>
            </div>
            <div class="slider-gradation">
                <div class="scalar-amount-text" ref="$stakedNIMText"
                    @click="$stakedNIMAmount.focus()"
                >
                    <input class="nq-input"
                        type="text"
                        ref="$stakedNIMAmount"
                        @input="onInput"
                        @blur="updateAmount"
                        @keydown.enter="$event.target.blur()"
                        @keydown.up="handleArrowKeys('up', $event)"
                        @keydown.down="handleArrowKeys('down', $event)"
                        :style="`width: ${inputAmountWidth}px;`"
                    />
                    <div class="right-suffix">
                        NIM
                    </div>
                </div>
                <div class="percent-amount-text" ref="$percentText">
                    {{ Math.floor(currentPercentage) }}%
                </div>
                <VerticalLineIcon v-for="(x, index) in Array(11)" :key="index" class="bottom-indicator"
                    :style="`left: calc(2rem + 2px + (100% - 4rem - 4px) * (${index} / 10) - 1px)`" />
                <div v-if="alreadyStaked" class="stake-dot-indicator" ref="$dotIndicator" />
            </div>
            <div class="slider-controls" ref="$slide" @click="onMove($event);">
                <div class="slider-controls-wrapper">
                    <div class="slider-progress-bar" ref="$progressBar" />
                    <div class="slider-knob"
                        ref="$knob"
                        @touchstart="atClick"
                        @mousedown="atClick">
                        <!-- The percentages below should also match in StakingPreview.vue -->
                        <AnimatedLeafIcon
                            :duration="1000"
                            :nleaf="
                                currentPercentage < 50 ? 1
                                : currentPercentage < 75 ? 2
                                : 3" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { CryptoCurrency } from '@nimiq/utils';

import { useAddressStore } from '../../stores/Address';

import VerticalLineIcon from '../icons/Staking/VerticalLineIcon.vue';
import AnimatedLeafIcon from '../icons/Staking/AnimatedLeafIcon.vue';
import Amount from '../Amount.vue';
import { formatNumber } from '../../lib/NumberFormatting';
import { MIN_STAKE } from '../../lib/Constants';

const getSVGNode = (n:string, attrs:Record<string, string> = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', n);
    Object.entries(attrs).forEach((entry) => {
        e.setAttributeNS(null, entry[0], entry[1]);
    });
    return e;
};

const encodedSVG = (element:SVGElement) => {
    const serializedSVG = new XMLSerializer().serializeToString(element);
    const base64Data = window.btoa(serializedSVG);
    return `data:image/svg+xml;base64,${base64Data}`;
};

const buildSVG = (nodes:Array<Array<any>> = [], encoded = true) => {
    const svg = getSVGNode('svg');
    for (const attr of nodes) svg.appendChild(getSVGNode(attr[0] as string, attr[1] as Record<string, string>));
    return encoded ? encodedSVG(svg) : svg;
};

type Point = {
    x: number,
    y: number,
} | null

const extractEventPosition = (e: MouseEvent | TouchEvent):Point | null => {
    if (e.type === 'touchstart' || e.type === 'touchmove') {
        e = e as TouchEvent;
        if (e.touches.length > 1) return null;
        const t = e.touches[0];

        return {
            x: t.pageX,
            y: t.pageY,
        };
    }

    e = e as MouseEvent;
    return {
        x: e.pageX,
        y: e.pageY,
    };
};

const snapToValidPercentage = (percent: number, availableAmount: number): number => {
    const amount = (percent / 100) * availableAmount;
    if (amount > 0 && amount < MIN_STAKE) {
        // Snap to MIN_STAKE percentage
        return (MIN_STAKE / availableAmount) * 100;
    }
    return amount <= MIN_STAKE / 2 ? 0 : percent;
};

export default defineComponent({
    props: {
        stakedAmount: {
            type: Number,
            required: true,
        },
    },
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();

        const alreadyStakedAmount = computed(() => props.stakedAmount);
        const currentAmount = ref(alreadyStakedAmount.value);
        const availableAmount = computed(() => (activeAddressInfo.value?.balance || 0) + props.stakedAmount);
        const currentPercentage = computed(() => (100 * currentAmount.value) / availableAmount.value);
        const alreadyStakedPercentage = ref(currentPercentage.value);
        const alreadyStaked = ref(alreadyStakedAmount.value > 0);
        const currentFormattedAmount = computed(() => {
            if (currentAmount.value === availableAmount.value && currentAmount.value % 1e5 !== 0) {
                return (currentAmount.value / 1e5).toFixed(5); // Display with decimals
            }
            return (currentAmount.value / 1e5).toFixed(0); // Display without decimals
        });

        const getPointAtPercent = (percent: number): number => {
            // Snap the percentage to valid values
            const snappedPercent = snapToValidPercentage(percent, availableAmount.value);
            return Math.max(2, (snappedPercent / 100.0) * (sliderBox.width - knobBox.width));
        };

        const estimateTextWidth = (text: string, defaultSize: number, options:Record<string, number> = { ' ': 3 }) => {
            let result = 0;
            let special = 0;

            Object.keys(options).forEach((key) => {
                const found = text.split(key).length;
                result += options[key] * found;
                special += found;
            });
            result += Math.max(2, (text.length - special)) * defaultSize;
            return result;
        };

        const inputAmountWidth = ref(estimateTextWidth(currentFormattedAmount.value, 9) + 69);

        function updateInputWidth(value?: string) {
            inputAmountWidth.value = estimateTextWidth(
                value || $stakedNIMAmount.value?.value || '0',
                9,
            ) + 69;
        }

        function onInput(event: Event) {
            const input = event.target as HTMLInputElement;
            const rawValue = input.value.replace(/[^\d.]/g, ''); // Remove all non-digit and non-decimal characters
            const parsedValue = parseFloat(rawValue) || 0;

            // Enforce max value
            const maxValue = availableAmount.value / 1e5;
            const newValue = Math.min(maxValue, parsedValue);

            // Format the value but preserve cursor position
            const cursorPosition = input.selectionStart;
            const oldLength = input.value.length;

            // Only format if there's a valid number
            if (!Number.isNaN(newValue)) {
                input.value = formatNumber(newValue);

                // Adjust cursor position based on added formatting characters
                const newLength = input.value.length;
                const lengthDiff = newLength - oldLength;
                if (cursorPosition !== null) {
                    input.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
                }
            }

            updateInputWidth(input.value);
        }

        let containerBox:DOMRect;
        let sliderBox:DOMRect;
        let knobBox:DOMRect;
        let amountBox:DOMRect;
        let pivotPoint: Point;

        const $container = ref<HTMLElement | null>(null);
        const $knob = ref<HTMLElement | null>(null);
        const $slide = ref<HTMLElement | null>(null);
        const $backgroundLinesLeft = ref<HTMLElement | null>(null);
        const $backgroundMiddlePlant = ref<HTMLElement | null>(null);
        const $backgroundLinesRight = ref<HTMLElement | null>(null);
        const $backgroundRightPlant = ref<HTMLElement | null>(null);
        const $progressBar = ref<HTMLElement | null>(null);
        const $percentText = ref<HTMLElement | null>(null);
        const $stakedNIMText = ref<HTMLElement | null>(null);
        const $stakedNIMAmount = ref<HTMLInputElement | null>(null);
        const $dotIndicator = ref<HTMLElement | null>(null);

        const atClick = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();

            pivotPoint = extractEventPosition(e);
            if (!pivotPoint) return;
            pivotPoint.x -= $knob.value!.getBoundingClientRect().x;
            if (e.type === 'touchstart') {
                window.addEventListener('touchmove', onMove);
                window.addEventListener('touchend', atEndTouch);
            } else {
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', atEndMouse);
            }
        };

        const animate = ref(false);
        let firstRender = true;
        let timeoutID: number;

        const updateAmount = async (e: MouseEvent | TouchEvent | { target: HTMLInputElement }) => {
            const target = e.target as HTMLInputElement;
            const rawValue = target.value.replace(/[^\d.]/g, ''); // Remove formatting for calculation
            let valueNim = (parseFloat(rawValue) || 0) * 1e5;

            // Enforce MIN_STAKE threshold
            if (valueNim > 0 && valueNim < MIN_STAKE) {
                valueNim = MIN_STAKE;
            }

            if (!firstRender) {
                window.clearTimeout(timeoutID);
                animate.value = true;
                await nextTick();
            }

            const amount = Math.max(0, Math.min(availableAmount.value, valueNim));
            const percent = (100 * amount) / availableAmount.value;
            currentAmount.value = amount;

            const offsetX = getPointAtPercent(percent);
            updatePosition(offsetX);
            updateInputWidth(formatNumber(amount / 1e5));
            context.emit('amount-staked', currentAmount.value);

            if (!firstRender) {
                timeoutID = window.setTimeout(() => {
                    animate.value = false;
                }, 1000);
            } else {
                firstRender = false;
            }
        };

        const atEndTouch = () => {
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', atEndTouch);
            context.emit('amount-chosen', 0);
        };

        const atEndMouse = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', atEndMouse);
            context.emit('amount-chosen', 0);
        };

        const updatePosition = (offsetX: number) => {
            amountBox = $stakedNIMAmount.value!.getBoundingClientRect();
            $knob.value!.style.left = `${offsetX}px`;
            if (currentPercentage.value <= 0) {
                $progressBar.value!.style.width = '40px';
            } else {
                $progressBar.value!.style.width = `${offsetX + knobBox.width + 2}px`;
            }
            $percentText.value!.style.left = `${offsetX - (knobBox.width / 2.0) + 20}px`;
            offsetX -= (inputAmountWidth.value / 2.0) - (knobBox.width / 2.0);
            const maxXPos = containerBox.width - amountBox.width;
            if (offsetX <= 0) {
                $stakedNIMText.value!.style.right = `${containerBox.width - amountBox.width}px`;
            } else if (offsetX < maxXPos) {
                $stakedNIMText.value!.style.right = `${containerBox.width - offsetX - amountBox.width}px`;
            } else {
                $stakedNIMText.value!.style.right = '0px';
            }
            $stakedNIMAmount.value!.value = formatNumber(parseFloat(currentFormattedAmount.value));
            updateInputWidth();
            context.emit('amount-chosen', 0);
        };

        const onMove = (e: MouseEvent | TouchEvent, skipSignals = false) => {
            const position = extractEventPosition(e);
            if (!position || !pivotPoint) return;

            position.x += $container.value?.closest('.small-page')?.scrollLeft || 0;

            const percent = Math.min(100, Math.max(0,
                (100 * (position.x - pivotPoint.x - sliderBox.x)) / (sliderBox.width - knobBox.width),
            ));

            // Use the snapped percentage for visual position
            const snappedPercent = snapToValidPercentage(percent, availableAmount.value);
            const offsetX = getPointAtPercent(snappedPercent);
            let newAmount;

            if (percent === 100) {
                newAmount = availableAmount.value;
            } else {
                newAmount = Math.floor(((percent / 100) * availableAmount.value) / 1e5) * 1e5;
                // Enforce MIN_STAKE threshold
                if (newAmount > 0 && newAmount < MIN_STAKE) {
                    newAmount = MIN_STAKE;
                }
                newAmount = Math.max(newAmount, 0);
            }

            currentAmount.value = newAmount;

            if (!skipSignals) {
                context.emit('amount-staked', currentAmount.value);
            }
            updatePosition(offsetX);
        };

        const fillBackground = (lo: number, hi: number) => {
            const map = [
                [0, 46.2, $backgroundLinesLeft, 5.9, 9.5],
                [46.2, 54.95, $backgroundMiddlePlant],
                [54.95, 90.89, $backgroundLinesRight],
                [90.89, 100, $backgroundRightPlant],
            ];
            let start = NaN;
            let end = NaN;
            for (let i = 0; i < map.length; i++) {
                if (Number.isNaN(start) && lo >= (map[i][0] as number)) {
                    start = i;
                }
                if (hi <= (map[i][1] as number)) {
                    end = i;
                    break;
                }
            }

            let startOffset = 0;
            let endOffset = 0;

            for (let i = end; i >= start; i--) {
                const startPoint = (map[i].length >= 4) ? map[i][3] : map[i][0];
                startOffset = getPointAtPercent(startPoint as number);

                if (i === end) {
                    endOffset = getPointAtPercent(Math.min(map[i][1] as number, hi))
                        - getPointAtPercent(startPoint as number);
                } else {
                    endOffset = (map[i][2] as Ref<HTMLElement>).value.getBoundingClientRect().width;
                }

                if (startOffset >= endOffset) {
                    startOffset = 0;
                }

                if (map[i].length >= 4) {
                    startOffset = getPointAtPercent(map[i][3] as number);
                    endOffset += startOffset + (map[i][4] as number);
                }

                const svg = buildSVG(
                    [['rect', {
                        x: '0px',
                        y: '0px',
                        width: `${endOffset - startOffset}px`,
                        height: '3.5rem',
                        fill: '#21BCA5',
                    }]],
                ) as string;
                (
                    (map[i][2] as Ref<HTMLElement>).value.style as { [key: string]: any }
                )['background-image'] = `url(${svg})`;
            }
        };

        function updateBoundingBoxes() {
            containerBox = $container.value!.getBoundingClientRect();
            sliderBox = $slide.value!.getBoundingClientRect();
            knobBox = $knob.value!.getBoundingClientRect();
            amountBox = $stakedNIMAmount.value!.getBoundingClientRect();
            updatePosition(getPointAtPercent(currentPercentage.value));
            pivotPoint = { x: 0, y: knobBox.y } as Point;
        }

        onMounted(() => {
            firstRender = true;
            updateBoundingBoxes();
            window.addEventListener('resize', updateBoundingBoxes);

            if ($stakedNIMAmount.value) updateAmount({ target: $stakedNIMAmount.value });

            if (alreadyStaked.value) {
                $dotIndicator.value!.style.left = `${getPointAtPercent(alreadyStakedPercentage.value)
                        + (knobBox.width / 2) - 2}px`;
                fillBackground(0, alreadyStakedPercentage.value);
            }
        });

        onBeforeUnmount(() => {
            firstRender = true;
            window.removeEventListener('resize', updateBoundingBoxes);
        });

        function handleArrowKeys(direction: 'up' | 'down', event: KeyboardEvent) {
            event.preventDefault();
            const input = event.target as HTMLInputElement;
            const rawValue = input.value.replace(/[^\d.]/g, '');
            const currentValue = parseFloat(rawValue) || 0;
            const currentValueLuna = currentValue * 1e5;

            // Increment/decrement by:
            // 10000 if ctrl/cmd + shift is held
            // 1000 if ctrl/cmd is held
            // 100 if alt/option is held
            // 10 if shift is held
            // 1 otherwise
            const step = (event.ctrlKey || event.metaKey) && event.shiftKey ? 10000
                : (event.ctrlKey || event.metaKey) ? 1000
                    : event.altKey ? 100
                        : event.shiftKey ? 10
                            : 1;

            let newValue: number;

            // Handle special cases for MIN_STAKE snapping
            if (direction === 'up' && currentValueLuna < MIN_STAKE) {
                // When going up from below MIN_STAKE, jump directly to MIN_STAKE
                newValue = MIN_STAKE / 1e5;
            } else if (direction === 'down' && currentValueLuna <= MIN_STAKE && currentValueLuna > 0) {
                // When going down from MIN_STAKE or below, jump directly to 0
                newValue = 0;
            } else {
                // Normal increment/decrement
                newValue = direction === 'up' ? currentValue + step : currentValue - step;

                // Enforce bounds
                const maxValue = availableAmount.value / 1e5;
                newValue = Math.min(Math.max(0, newValue), maxValue);

                // Snap to MIN_STAKE if we're close to it
                const newValueLuna = newValue * 1e5;
                if (newValueLuna > 0 && newValueLuna < MIN_STAKE) {
                    newValue = direction === 'up' ? MIN_STAKE / 1e5 : 0;
                }
            }

            input.value = formatNumber(newValue);
            updateAmount({ target: input });
        }

        return {
            CryptoCurrency,

            atClick,
            onMove,
            currentPercentage,
            currentAmount,
            alreadyStaked,
            updateAmount,
            availableAmount,
            currentFormattedAmount,
            inputAmountWidth,
            $container,
            $knob,
            $slide,
            $percentText,
            $stakedNIMText,
            $stakedNIMAmount,
            $backgroundLinesLeft,
            $backgroundMiddlePlant,
            $backgroundLinesRight,
            $backgroundRightPlant,
            $progressBar,
            $dotIndicator,
            buildSVG,
            animate,
            onInput,
            handleArrowKeys,
        };
    },
    components: {
        VerticalLineIcon,
        AnimatedLeafIcon,
        Amount,
    },
});
</script>
<style lang="scss" scoped>
@import '../../scss/variables.scss';

.slider-container {
    padding-top: 2.5rem;
    height: 12rem;

    .slider-body {
        position: relative;
        height: 5rem;
        background-color: #f2f2f4;
        border-radius: 2.5rem;

        .nq-input {
            background-color: #fff;
            padding: 0.75rem 1.75rem;
            font-weight: bold;

            /* Hiding input's arrows (due to type=number) */
            /* Chrome, Safari, Edge, Opera */
            &::-webkit-outer-spin-button,
            &::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }

            /* Firefox */
            -moz-appearance: textfield;
        }

        .slider-background {
            position: absolute;
            left: 0;
            top: 0;
            display: flex;
            width: 100%;
            padding-top: 0.75rem;
            padding-left: 4rem;

            div {
                background-color: #9e9faf; /** TODO: Replace by nimiq-blue with alpha */
                height: 3.5rem;
            }

            .background-one, .background-three {
                flex-grow: 1;

                mask-image: url('../../assets/staking/vertical-line.svg');
                mask-size: .5rem;
                mask-repeat: repeat-x;
                mask-position: center;
            }

            .background-two, .background-four {
                width: 3.5rem;
                margin-right: 0.375rem;

                mask-image: url('../../assets/staking/staking.svg');
                mask-repeat: no-repeat;
                mask-position: center;
            }

            .background-four {
                mask-image: url('../../assets/staking/three-leaf-staking.svg');
            }
        }

        .scalar-amount {
            font-weight: bold;
            font-size: 1.75rem;
            line-height: 100%;

            text-align: right;
            color: var(--nimiq-blue);
            opacity: 0.3;

            &.left, &.right {
                position: absolute;
                left: 0;
                top: -3.5rem;
                background-color: transparent;
            }

            &.right {
                left: unset;
                right: 0;
            }
        }

        .slider-gradation {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: calc(100% + 2rem);

            .scalar-amount-text {
                display: flex;
                position: absolute;
                justify-content: center;
                align-items: center;

                top: -4.5rem;
                font-size: 2rem;
                font-weight: bold;

                .right-suffix {
                    position: absolute;
                    right: 1.75rem;
                    background: white; // fallback to hide input[type=number]'s arrows
                }
            }

            .percent-amount-text {
                position: absolute;
                display: flex;
                justify-content: center;
                width: 5rem;
                bottom: -0.5rem;
                color: var(--nimiq-green);
                font-size: 1.625rem;
                font-weight: 700;
                letter-spacing: .0625rem;
                z-index: 1;
                background: white;
            }

            .bottom-indicator {
                display: inline-block;
                position: absolute;
                bottom: 0;
                height: 1rem;
            }

            .stake-dot-indicator {
                position: absolute;
                bottom: 0.25rem;
                background-color: var(--nimiq-green);
                width: .5rem;
                height: .5rem;
                border-radius: 50%;
                box-shadow: 0 0 1rem 1rem white;
            }
        }

        .slider-controls {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;

            .slider-controls-wrapper {
                position: relative;
                width: 100%;
                height: 100%;

                .slider-progress-bar {
                    position: absolute;
                    left: 0;
                    top: 0;
                    background: radial-gradient(100% 100% at 100% 100%, #41A38E 0%, #21BCA5 100%);
                    height: 100%;
                    border-radius: 3rem;
                }

                .slider-knob {
                    display: flex;
                    position: absolute;
                    cursor: pointer;
                    left: 0;
                    top: 0;
                    align-items: center;
                    margin-top: 0.25rem;
                    width: 4.5rem;
                    height: 4.5rem;
                    background-color: #fff;
                    border-radius: 50%;
                    box-shadow: 0rem .5rem 2rem rgba(0, 0, 0, 0.1),
                                0rem .1875rem .375rem rgba(0, 0, 0, 0.08),
                                0rem 0.03rem .25rem rgba(0, 0, 0, 0.06);

                    &:active { cursor: grab }

                    & ::v-deep svg {
                        font-size: 3.5rem;
                        margin-left: 0.5rem;

                        line, path {
                            stroke-width: 1;
                        }
                    }
                }
            }
        }
    }
}

.amount-slider.animate * {
    transition: all 1000ms;
}
</style>

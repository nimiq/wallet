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
                    {{ availableFormattedAmount }} NIM
                </div>
            </div>
            <div class="slider-gradation">
                <div
                    class="scalar-amount-text"
                    ref="$prestakedNIMText"
                    @click="$prestakedNIMAmount.focus()">
                    <input class="nq-input"
                        type="number"
                        ref="$prestakedNIMAmount"
                        @input="onInput"
                        @blur="updateAmount"
                        @keypress.enter="$event.target.blur()"
                        :style="`width: ${inputAmountWidth}px;`"
                    />
                    <div class="right-suffix">
                        NIM
                    </div>
                </div>
                <div class="percent-amount-text" ref="$percentText">
                    {{ Math.round(currentPercentage) }}%
                </div>
                <VerticalLineIcon v-for="(x, index) in Array(11)" :key="index" class="bottom-indicator"
                    :style="`left: calc(2rem + 2px + (100% - 4rem - 4px) * (${index} / 10) - 1px)`" />
                <div v-if="alreadyPrestaked" class="prestake-dot-indicator" ref="$dotIndicator" />
            </div>
            <div class="slider-controls" ref="$slide" @click="onMove($event, true);">
                <div class="slider-controls-wrapper">
                    <div class="slider-progress-bar" ref="$progressBar" />
                    <div class="slider-knob"
                        ref="$knob"
                        @touchstart="atClick"
                        @mousedown="atClick">
                        <!-- The percentages below should also match in PrestakingPreview.vue -->
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
import { Ref, defineComponent, ref, computed, onMounted, onBeforeUnmount } from '@vue/composition-api';
import { useAddressStore } from '../../stores/Address';
import { MIN_PRESTAKE } from '../../lib/Constants';

import VerticalLineIcon from '../icons/Prestaking/VerticalLineIcon.vue';
import AnimatedLeafIcon from '../icons/Prestaking/AnimatedLeafIcon.vue';

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

export default defineComponent({
    props: {
        prestakedAmount: {
            type: Number,
            required: true,
        },
    },
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();

        const alreadyPrestakedAmount = computed(() => props.prestakedAmount);
        const currentAmount = ref(alreadyPrestakedAmount.value);
        const availableAmount = computed(() => (activeAddressInfo.value?.balance || 0) + props.prestakedAmount);
        const currentPercentage = computed(() => (100 * currentAmount.value) / availableAmount.value);
        const alreadyPrestakedPercentage = ref(currentPercentage.value);
        const alreadyPrestaked = ref(alreadyPrestakedAmount.value > 0);
        const currentFormattedAmount = computed(() => {
            if (currentAmount.value === availableAmount.value && currentAmount.value % 1e5 !== 0) {
                return (currentAmount.value / 1e5).toFixed(5); // Display with decimals
            }
            return (currentAmount.value / 1e5).toFixed(0); // Display without decimals
        });
        const availableFormattedAmount = computed(() => Math.floor(availableAmount.value / 1e5).toString());

        const getPointAtPercent = (percent: number): number =>
            Math.max(2, (percent / 100.0) * (sliderBox.width - knobBox.width));

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
                value || $prestakedNIMAmount.value?.value || (MIN_PRESTAKE / 1e5).toString(),
                9,
            ) + 69;
        }

        function enforceMaxValue() {
            /* Enforce max value */
            const maxValue = availableAmount.value / 1e5;
            const newValue = $prestakedNIMAmount.value?.value
                ? Math.min(
                    maxValue,
                    parseInt($prestakedNIMAmount.value?.value, 10),
                ) : false;

            // TODO: Should we take decimals into account? like 10000.0123 NIM instead of 1000?
            if (newValue) {
                $prestakedNIMAmount.value!.value = Math.floor(newValue).toString();
            }
        }

        function onInput() {
            enforceMaxValue();
            updateInputWidth();
        }

        let containerBox:DOMRect;
        let sliderBox:DOMRect;
        let knobBox:DOMRect;
        let amountBox:DOMRect;
        let pivotPoint: Point;

        const $container = ref<HTMLElement>(null);
        const $knob = ref<HTMLElement>(null);
        const $slide = ref<HTMLElement>(null);
        const $backgroundLinesLeft = ref<HTMLElement>(null);
        const $backgroundMiddlePlant = ref<HTMLElement>(null);
        const $backgroundLinesRight = ref<HTMLElement>(null);
        const $backgroundRightPlant = ref<HTMLElement>(null);
        const $progressBar = ref<HTMLElement>(null);
        const $percentText = ref<HTMLElement>(null);
        const $prestakedNIMText = ref<HTMLElement>(null);
        const $prestakedNIMAmount = ref<HTMLInputElement>(null);
        const $dotIndicator = ref<HTMLElement>(null);

        const minimumPrestakePercent = computed(() => availableAmount.value < MIN_PRESTAKE
            ? Infinity // Makes it impossible to move the mouse above half the `minimumPrestakePercent`
            : (MIN_PRESTAKE / availableAmount.value) * 100);

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

            let valueNim = (parseInt(target.value.replace(/[^\d.]/g, ''), 10) || 0) * 1e5;

            if (!firstRender && valueNim > currentAmount.value) {
                window.clearTimeout(timeoutID);
                animate.value = true;
                await context.root.$nextTick();
            }

            // Ensure the entered amount does not fall below the minimum prestake or already prestaked amount
            valueNim = Math.max(valueNim, MIN_PRESTAKE, alreadyPrestakedAmount.value);
            const amount = Math.max(
                0,
                Math.min(availableAmount.value, valueNim),
            );
            const percent = (100 * amount) / availableAmount.value;
            currentAmount.value = amount;

            const offsetX = getPointAtPercent(percent);
            updatePosition(offsetX);
            updateInputWidth((amount / 1e5).toString());
            context.emit('amount-prestaked', currentAmount.value);

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
            amountBox = $prestakedNIMAmount.value!.getBoundingClientRect();
            $knob.value!.style.left = `${offsetX}px`;
            if (currentPercentage.value <= 0) {
                $progressBar.value!.style.width = '0';
            } else {
                $progressBar.value!.style.width = `${offsetX + knobBox.width + 2}px`;
            }
            $percentText.value!.style.left = `${offsetX - (knobBox.width / 2.0) + 8}px`;
            offsetX -= (inputAmountWidth.value / 2.0) - (knobBox.width / 2.0);
            const maxXPos = containerBox.width - amountBox.width;
            if (offsetX <= 0) {
                $prestakedNIMText.value!.style.right = `${containerBox.width - amountBox.width}px`;
            } else if (offsetX < maxXPos) {
                $prestakedNIMText.value!.style.right = `${containerBox.width - offsetX - amountBox.width}px`;
            } else {
                $prestakedNIMText.value!.style.right = '0px';
            }
            $prestakedNIMAmount.value!.value = currentFormattedAmount.value;
            updateInputWidth();
            context.emit('amount-chosen', 0);
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const onMove = (e: MouseEvent | TouchEvent, execute = false, skipSignals = false) => {
            const position = extractEventPosition(e);
            if (!position || !pivotPoint) return;

            position.x += $container.value?.closest('.small-page')?.scrollLeft || 0;

            let percent = Math.min(100, Math.max(0,
                (100 * (position.x - pivotPoint.x - sliderBox.x)) / (sliderBox.width - knobBox.width),
            ));
            // Ensure the slider does not go below the minimum prestake percentage
            percent = Math.max(minimumPrestakePercent.value, alreadyPrestakedPercentage.value, percent);

            const offsetX = getPointAtPercent(percent);
            let newAmount;

            if (percent === 100) {
                // Set the current amount to the full available amount with decimals
                newAmount = availableAmount.value;
            } else {
                // Calculate new amount from slider's position, ensuring it's not below minimum prestake
                newAmount = Math.floor(((percent / 100) * availableAmount.value) / 1e5) * 1e5;
                // Prevent reducing below MIN_PRESTAKE or already prestaked amount
                newAmount = Math.max(newAmount, MIN_PRESTAKE, alreadyPrestakedAmount.value);
            }

            currentAmount.value = newAmount;

            if (!skipSignals) {
                context.emit('amount-prestaked', currentAmount.value);
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
                if (Number.isNaN(start) && lo >= map[i][0]) {
                    start = i;
                }
                if (hi <= map[i][1]) {
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
            amountBox = $prestakedNIMAmount.value!.getBoundingClientRect();
            updatePosition(getPointAtPercent(currentPercentage.value));
            pivotPoint = { x: 0, y: knobBox.y } as Point;
        }

        onMounted(() => {
            firstRender = true;
            updateBoundingBoxes();
            window.addEventListener('resize', updateBoundingBoxes);

            if ($prestakedNIMAmount.value) updateAmount({ target: $prestakedNIMAmount.value });

            if (alreadyPrestaked.value) {
                $dotIndicator.value!.style.left = `${getPointAtPercent(alreadyPrestakedPercentage.value)
                        + (knobBox.width / 2) - 2}px`;
                fillBackground(0, alreadyPrestakedPercentage.value);
            }
        });

        onBeforeUnmount(() => {
            firstRender = true;
            window.removeEventListener('resize', updateBoundingBoxes);
        });

        return {
            atClick,
            onMove,
            currentPercentage,
            currentAmount,
            alreadyPrestaked,
            updateAmount,
            availableFormattedAmount,
            currentFormattedAmount,
            inputAmountWidth,
            $container,
            $knob,
            $slide,
            $percentText,
            $prestakedNIMText,
            $prestakedNIMAmount,
            $backgroundLinesLeft,
            $backgroundMiddlePlant,
            $backgroundLinesRight,
            $backgroundRightPlant,
            $progressBar,
            $dotIndicator,
            buildSVG,
            animate,
            onInput,
        };
    },
    components: {
        VerticalLineIcon,
        AnimatedLeafIcon,
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

                mask-image: url('../../assets/prestaking/vertical-line.svg');
                mask-size: .5rem;
                mask-repeat: repeat-x;
                mask-position: center;
            }

            .background-two, .background-four {
                width: 3.5rem;
                margin-right: 0.375rem;

                mask-image: url('../../assets/prestaking/prestaking.svg');
                mask-repeat: no-repeat;
                mask-position: center;
            }

            .background-four {
                mask-image: url('../../assets/prestaking/three-leaf-staking.svg');
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
                width: 7rem;
                bottom: -0.5rem;
                color: var(--nimiq-gold);
                font-size: 1.625rem;
                font-weight: 700;
                letter-spacing: .0625rem;
                z-index: 1;
            }

            .bottom-indicator {
                display: inline-block;
                position: absolute;
                bottom: 0;
                height: 1rem;
            }

            .prestake-dot-indicator {
                position: absolute;
                bottom: 0.25rem;
                background-color: var(--nimiq-green);
                width: .5rem;
                height: .5rem;
                border-radius: 50%;
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
                    background: radial-gradient(100% 100% at 100% 100%, #EC991C 0%, var(--nimiq-gold) 100%); // Figma
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

<template>
    <div class="amount-slider slider-container" ref="$container">
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
                    ref="$stakedNIMText"
                    @click="$stakedNIMAmount.focus()">
                    <input class="nq-input"
                        ref="$stakedNIMAmount"
                        @input="updateAmount"
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
                <div v-if="alreadyStaked" class="stake-dot-indicator" ref="$dotIndicator" />
            </div>
            <div class="slider-controls" ref="$slide" @click="onMove($event, true);">
                <div class="slider-controls-wrapper">
                    <div class="slider-progress-bar" ref="$progressBar" />
                    <div class="slider-knob"
                        ref="$knob"
                        @touchstart="atClick"
                        @mousedown="atClick">
                        <OneLeafStakingIcon v-if="currentPercentage < 50" />
                        <StakingIcon v-else-if="currentPercentage < 75" />
                        <ThreeLeafStakingIcon v-else />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, computed, onMounted, onBeforeUnmount } from '@vue/composition-api';
import { useAddressStore } from '../../stores/Address';
import { MIN_STAKE } from '../../lib/Constants';

import StakingIcon from '../icons/Staking/StakingIcon.vue';
import OneLeafStakingIcon from '../icons/Staking/OneLeafStakingIcon.vue';
import ThreeLeafStakingIcon from '../icons/Staking/ThreeLeafStakingIcon.vue';
import VerticalLineIcon from '../icons/Staking/VerticalLineIcon.vue';

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
        stakedAmount: {
            type: Number,
            required: true,
        },
    },
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();

        const alreadyStakedAmount = ref(props.stakedAmount);
        const currentAmount = ref(alreadyStakedAmount.value);
        const availableAmount = computed(() => (activeAddressInfo.value?.balance || 0) + props.stakedAmount);
        const currentPercentage = computed(() => (100 * currentAmount.value) / availableAmount.value);
        const alreadyStakedPercentage = ref(currentPercentage.value);
        const alreadyStaked = ref(alreadyStakedAmount.value > 0);
        const currentFormattedAmount = computed(() => Math.round(currentAmount.value / 1e5).toString());
        const availableFormattedAmount = computed(() => Math.round(availableAmount.value / 1e5).toString());

        const getPointAtPercent = (percent: number): number =>
            (percent / 100.0) * (sliderBox.width - knobBox.width);

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

        const inputAmountWidth = computed(() => estimateTextWidth(currentFormattedAmount.value, 9) + 69);

        let containerBox:DOMRect;
        let sliderBox:DOMRect;
        let knobBox:DOMRect;
        let amountBox:DOMRect;
        let pivotPoint: Point;
        let startSelection = 0;
        let endSelection = 0;

        const $container = ref<HTMLElement>(null);
        const $knob = ref<HTMLElement>(null);
        const $slide = ref<HTMLElement>(null);
        const $backgroundLinesLeft = ref<HTMLElement>(null);
        const $backgroundMiddlePlant = ref<HTMLElement>(null);
        const $backgroundLinesRight = ref<HTMLElement>(null);
        const $backgroundRightPlant = ref<HTMLElement>(null);
        const $progressBar = ref<HTMLElement>(null);
        const $percentText = ref<HTMLElement>(null);
        const $stakedNIMText = ref<HTMLElement>(null);
        const $stakedNIMAmount = ref<HTMLInputElement>(null);
        const $dotIndicator = ref<HTMLElement>(null);

        const minimumStakePercent = computed(() => availableAmount.value < MIN_STAKE
            ? Infinity // Makes it impossible to move the mouse above half the `minimumStakePercent`
            : (MIN_STAKE / availableAmount.value) * 100);

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

        const updateAmount = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLInputElement;

            startSelection = target.selectionStart as number;
            endSelection = target.selectionEnd as number;

            const valueNim = (parseInt(target.value.replace(/[^\d.]/g, ''), 10) || 0) * 1e5;
            const amount = Math.max(
                0,
                Math.min(availableAmount.value, valueNim),
            );
            const percent = (100 * amount) / availableAmount.value;
            currentAmount.value = amount;

            const offsetX = getPointAtPercent(percent);
            updatePosition(offsetX);
            setTimeout(() => {
                target.setSelectionRange(startSelection, endSelection);
            }, 0);
            context.emit('amount-staked', currentAmount.value);
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
                $progressBar.value!.style.width = '0';
            } else {
                $progressBar.value!.style.width = `${offsetX + knobBox.width + 2}px`;
            }
            $percentText.value!.style.left = `${offsetX - (knobBox.width / 2.0) + 8}px`;
            offsetX -= (inputAmountWidth.value / 2.0) - (knobBox.width / 2.0);
            const maxXPos = containerBox.width - amountBox.width;
            if (offsetX <= 0) {
                $stakedNIMText.value!.style.left = '0px';
            } else if (offsetX < maxXPos) {
                $stakedNIMText.value!.style.left = `${offsetX}px`;
            } else {
                $stakedNIMText.value!.style.left = `${maxXPos}px`;
            }
            $stakedNIMAmount.value!.value = currentFormattedAmount.value;
            context.emit('amount-chosen', 0);
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const onMove = (e: MouseEvent | TouchEvent, execute = false, skipSignals = false) => {
            // if (execute !== true) return;
            const position = extractEventPosition(e);
            if (!position || !pivotPoint) return;

            position.x += $container.value?.closest('.small-page')?.scrollLeft || 0;

            let percent = Math.min(100, Math.max(0,
                (100 * (position.x - pivotPoint.x - sliderBox.x)) / (sliderBox.width - knobBox.width),
            ));
            if (percent < minimumStakePercent.value / 2) {
                percent = 0;
            } else {
                percent = Math.max(minimumStakePercent.value, percent);
            }

            const offsetX = getPointAtPercent(percent);
            currentAmount.value = Math.floor(
                ((percent / 100) * availableAmount.value) / 1e5,
            ) * 1e5;

            if (alreadyStaked.value) {
                if (percent < alreadyStakedPercentage.value) {
                    if (!skipSignals) {
                        context.emit('amount-unstaked', alreadyStakedAmount.value - currentAmount.value);
                    }
                } else if (!skipSignals) {
                    context.emit('amount-unstaked', 0);
                }
            }
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
            amountBox = $stakedNIMAmount.value!.getBoundingClientRect();
            updatePosition(getPointAtPercent(currentPercentage.value));
            pivotPoint = { x: 0, y: knobBox.y } as Point;
        }

        onMounted(() => {
            updateBoundingBoxes();
            window.addEventListener('resize', updateBoundingBoxes);

            if (alreadyStaked.value) {
                $dotIndicator.value!.style.left = `${getPointAtPercent(alreadyStakedPercentage.value)
                        + (knobBox.width / 2) - 2}px`;
                fillBackground(0, alreadyStakedPercentage.value);
            }
        });

        onBeforeUnmount(() => {
            window.removeEventListener('resize', updateBoundingBoxes);
        });

        return {
            atClick,
            onMove,
            currentPercentage,
            currentAmount,
            alreadyStaked,
            updateAmount,
            availableFormattedAmount,
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
        };
    },
    components: {
        StakingIcon,
        OneLeafStakingIcon,
        ThreeLeafStakingIcon,
        VerticalLineIcon,
    },
});
</script>

<style lang="scss" scoped>
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
                }
            }

            .percent-amount-text {
                position: absolute;
                display: flex;
                justify-content: center;
                width: 7rem;
                bottom: -0.5rem;
                color: var(--nimiq-green);
                font-size: 1.625rem;
                font-weight: 700;
                letter-spacing: .0625rem;
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

                    svg {
                        width: 3.5rem;
                        height: 3.5rem;
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

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
}

@media (max-width: 700px) { // Full mobile breakpoint
}
</style>

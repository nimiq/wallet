<template>
    <div class="slider-container" ref="$container">
        <div class="slider-body">
            <div class="slider-background">
                <div class="background-one" ref="$backgroundOne" />
                <div class="background-two" ref="$backgroundTwo" />
                <div class="background-three" ref="$backgroundThree" />
                <div class="background-four" ref="$backgroundFour" />
            </div>
            <div class="slider-gradation">
                <div class="scalar-amount-text" ref="$stakedNIMText">
                <!--
                    <Amount ref="$stakedNIMAmount"
                        :decimals="DISPLAYED_DECIMALS"
                        :amount="currentAmount"
                        :currency="STAKING_CURRENCY"
                        :currencyDecimals="NIM_DECIMALS" />
                -->
                    <input class="nq-input"
                        :style="`width: ${currentFormattedAmount.value / 100.0}px!important;`"
                        ref="$stakedNIMAmount"
                        :value="currentFormattedAmount" />
                </div>
                <div class="percent-amount-text" ref="$percentText">
                    {{ Math.round(currentPercentage) }}%
                </div>
                <div v-for="(x, index) in Array(11)" :key="index" class="bottom-indicator"
                    :style="`left: ${2 + (4.875 * index)}rem`">
                    <VerticalLineIcon />
                </div>
                <div v-if="alreadyStaked" class="stake-dot-indicator" ref="$dotIndicator" />
            </div>
            <div class="slider-controls" ref="$slide">
                <div class="slider-controls-wrapper">
                    <div class="slider-progress-bar" ref="$progressBar" />
                    <div class="slider-knob"
                        ref="$knob"
                        @touchstart="atClick"
                        @mousedown="atClick">
                        <OneLeafStakingIcon v-if="stakePercentage.value < 50" />
                        <StakingIcon v-else-if="stakePercentage.value < 75" />
                        <ThreeLeafStakingIcon v-else />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Ref, defineComponent, ref, computed, onMounted } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { calculateDisplayedDecimals, formatSpaceyNumber } from '../../lib/NumberFormatting';

import StakingIcon from '../icons/Staking/StakingIcon.vue';
import OneLeafStakingIcon from '../icons/Staking/OneLeafStakingIcon.vue';
import ThreeLeafStakingIcon from '../icons/Staking/ThreeLeafStakingIcon.vue';
import VerticalLineIcon from '../icons/Staking/VerticalLineIcon.vue';

import { CryptoCurrency, NIM_DECIMALS, NIM_MAGNITUDE } from '../../lib/Constants';

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

const extractInfo = (e: MouseEvent | TouchEvent):Point => {
    if (e.type === 'touchstart') {
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
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();

        const readonly = ref(false);
        const active = ref(false);
        const alreadyStakedAmount = ref(props.stakedAmount);
        const currentAmount = ref(alreadyStakedAmount.value);
        const availableAmount = ref(activeAddressInfo.value?.balance);
        const currentPercentage = ref((100 * currentAmount.value) / availableAmount.value!);
        const alreadyStakedPercentage = ref(currentPercentage.value);
        const alreadyStaked = ref(alreadyStakedAmount.value > 0);
        const currentFormattedAmount = computed(() => formatSpaceyNumber(currentAmount.value, NIM_MAGNITUDE));

        const stakePercentage = computed(() => currentPercentage);
        let containerBox:DOMRect;
        let sliderBox:DOMRect;
        let knobBox:DOMRect;
        let amountBox:DOMRect;
        let pivotPoint:Point = null;

        const $container = ref<HTMLElement>(null);
        const $knob = ref<HTMLElement>(null);
        const $slide = ref<HTMLElement>(null);
        const $backgroundOne = ref<HTMLElement>(null);
        const $backgroundTwo = ref<HTMLElement>(null);
        const $backgroundThree = ref<HTMLElement>(null);
        const $backgroundFour = ref<HTMLElement>(null);
        const $progressBar = ref<HTMLElement>(null);
        const $percentText = ref<HTMLElement>(null);
        const $stakedNIMText = ref<HTMLElement>(null);
        const $stakedNIMAmount = ref<Vue>(null);
        const $dotIndicator = ref<HTMLElement>(null);

        const atClick = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();

            if (!active.value) {
                active.value = true;
                pivotPoint = extractInfo(e);
                pivotPoint!.x -= $knob.value!.getBoundingClientRect().x;
                window.addEventListener('mousemove', atMove);
                window.addEventListener('touchmove', atMove);
                window.addEventListener('mouseup', atEnd, { once: true });
                window.addEventListener('touchend', atEnd, { once: true });
            }
        };

        const atEnd = () => {
            active.value = false;
            window.removeEventListener('mousemove', atMove);
            window.removeEventListener('touchmove', atMove);
            context.emit('amount-chosen', 0);
        };

        const getPointAtPercent = (percent: number): number =>
            (percent / 100.0) * (sliderBox.width - knobBox.width);

        const updatePosition = (offsetX: number) => {
            amountBox = $stakedNIMAmount.value!.$el.getBoundingClientRect();
            $knob.value!.style.left = `${offsetX}px`;
            if (currentPercentage.value! < 0.1) {
                $progressBar.value!.style.width = '0';
            } else {
                $progressBar.value!.style.width = `${offsetX + knobBox.width + 2}px`;
            }
            $percentText.value!.style.left = `${offsetX + 2}px`;
            $stakedNIMText.value!.style.width = `${amountBox.width + 16}px`;
            offsetX -= (amountBox.width / 2.0) - (knobBox.width / 2.0);
            const minXPos = (-3 * (knobBox.width / 2.0)) + 24;
            if (offsetX < minXPos) {
                $stakedNIMText.value!.style.left = `${minXPos}px`;
            } else if (containerBox.width > offsetX + amountBox.width + 52) {
                $stakedNIMText.value!.style.left = `${offsetX + 2}px`;
            } else {
                $stakedNIMText.value!.style.left = `${containerBox.width - (amountBox.width + 52)}px`;
            }
        };

        const atMove = (e: MouseEvent | TouchEvent) => {
            if (active.value === true) {
                const position = extractInfo(e);

                const percent = Math.min(100, Math.max(0,
                    (100 * (position!.x - pivotPoint!.x - sliderBox.x)) / (sliderBox.width - knobBox.width),
                ));
                currentPercentage.value = percent;
                currentAmount.value = (percent / 100) * availableAmount.value!;

                if (alreadyStaked.value === true) {
                    if (percent < alreadyStakedPercentage.value) {
                        context.emit('amount-unstaked', alreadyStakedAmount.value - currentAmount.value);
                    } else {
                        context.emit('amount-unstaked', 0);
                    }
                }
                context.emit('amount-staked', currentAmount.value);
                const offsetX = getPointAtPercent(percent);
                updatePosition(offsetX);
            }
        };

        const fillBackground = (lo: number, hi: number) => {
            const map = [
                [0, 47, $backgroundOne],
                [47, 51, $backgroundTwo],
                [51, 96, $backgroundThree],
                [96, 100, $backgroundFour],
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
                if (i === start) {
                    startOffset = getPointAtPercent(Math.max(map[i][0] as number, lo))
                        - getPointAtPercent(map[i][0] as number);
                } else {
                    startOffset = 0;
                }
                if (i === end) {
                    endOffset = getPointAtPercent(Math.min(map[i][1] as number, hi))
                        - getPointAtPercent(map[i][0] as number);
                } else {
                    endOffset = (map[i][2] as Ref<HTMLElement>).value!.getBoundingClientRect().width;
                }
                if (startOffset >= endOffset) {
                    (
                        (map[i][2] as Ref<HTMLElement>).value!.style as { [key: string]: any }
                    )['background-image'] = null;
                } else {
                    const svg = buildSVG(
                        [['rect', {
                            x: `${startOffset}px`,
                            y: '0px',
                            width: `${endOffset - startOffset}px`,
                            height: '3.5rem',
                            fill: '#21BCA5',
                        }]],
                    ) as string;
                    (
                        (map[i][2] as Ref<HTMLElement>).value!.style as { [key: string]: any }
                    )['background-image'] = `url(${svg})`;
                }
            }
        };

        onMounted(() => {
            containerBox = $container.value!.getBoundingClientRect();
            sliderBox = $slide.value!.getBoundingClientRect();
            knobBox = $knob.value!.getBoundingClientRect();
            amountBox = $stakedNIMAmount.value!.$el.getBoundingClientRect();
            updatePosition(getPointAtPercent(currentPercentage.value!));
            $dotIndicator.value!.style.left = `${getPointAtPercent(alreadyStakedPercentage.value!)
                + (knobBox.width / 2) - 8}px`;

            if (alreadyStaked.value) {
                fillBackground(0, alreadyStakedPercentage.value);
            }
        });
        return {
            NIM_DECIMALS,
            STAKING_CURRENCY: CryptoCurrency.NIM,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(availableAmount.value!, CryptoCurrency.NIM),
            active,
            readonly,
            atClick,
            atMove,
            currentPercentage,
            stakePercentage,
            currentAmount,
            alreadyStaked,
            currentFormattedAmount,
            $container,
            $knob,
            $slide,
            $percentText,
            $stakedNIMText,
            $stakedNIMAmount,
            $backgroundOne,
            $backgroundTwo,
            $backgroundThree,
            $backgroundFour,
            $progressBar,
            $dotIndicator,
            buildSVG,
        };
    },
    props: {
        stakedAmount: {
            type: Number,
            required: true,
        },
    },
    components: {
        Amount,
        StakingIcon,
        OneLeafStakingIcon,
        ThreeLeafStakingIcon,
        VerticalLineIcon,
    },
});
</script>

<style lang="scss" scoped>
.slider-container {
    width: 63.5rem;
    height: 11.875rem;
    margin: auto;
    .slider-body {
        position: relative;
        margin: auto;
        margin-top: 2rem;
        width: 56rem;
        height: 5rem;
        background-color: #f2f2f4;
        border-radius: 2.5rem;
        .slider-background {
            position: absolute;
            left: 0;
            top: 0;
            padding-top: 0.75rem;
            padding-left: 1.5rem;
            div {
                background-color: #9e9faf;
                height: 3.5rem;
            }
            .background-one, .background-three {
                display: inline-block;
                width: 25rem;

                mask-image: url('../../assets/vertical-line.svg');
                mask-size: .5rem;
                mask-repeat: repeat-x;
                mask-position: center;
            }
            .background-two {
                display: inline-block;
                width: 3.5rem;
                margin-right: 0.375rem;

                mask-image: url('../../assets/staking/staking.svg');
                mask-repeat: no-repeat;
                mask-position: center;
            }
            .background-three {
                width: 21.25rem;
            }
            .background-four {
                display: inline-block;
                width: 3.5rem;
                margin-right: 0.375rem;

                mask-image: url('../../assets/staking/three-leaf-staking.svg');
                mask-repeat: no-repeat;
                mask-position: center;
            }
        }
        .slider-gradation {
            position: absolute;
            left: 0.5rem;
            top: 0rem;
            width: 56rem;
            .scalar-amount-text {
                display: flex;
                position: relative;
                justify-content: center;
                align-items: center;
                padding: .75rem 1rem;

                // background: #fff;
                // border: 0.1875rem solid #D2D3DA;
                // border-radius: .5rem;
                top: -5.9rem;
                font-size: 2rem;
                // color: #1F2348;
            }
            .percent-amount-text {
                position: relative;
                top: 1rem;
                color: var(--nimiq-green);
                font-size: 1.625rem;
                font-weight: 700;
                letter-spacing: .0625rem;
            }
            .bottom-indicator {
                display: inline-block;
                position: relative;
                top: 1rem;
                svg {
                    height: 1rem;
                }
            }
            .stake-dot-indicator {
                position: relative;
                top: -.25rem;
                background-color: var(--nimiq-green);
                width: .375rem;
                height: .375rem;
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
</style>

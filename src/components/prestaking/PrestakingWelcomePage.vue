<template>
    <div class="prestaking-welcome-page flex-column"
         @touchstart="handleTouchStart"
         @touchmove="handleTouchMove"
         @touchend="handleTouchEnd"
         @mousedown="handleMouseDown"
         @mouseup="handleMouseUp"
         @mouseleave="setPaused(false)"
         @focusout="setPaused(false)">
        <StepProgressBar
            :currentStep="currentStep"
            :shouldAnimate="shouldAnimate"
            :isPaused="isPaused"
            @stepCompleted="onStepCompleted"
        />

        <!-- Navigation arrows -->
        <div v-if="currentStep > 1" class="arrow-area left-arrow"
             @mousedown.stop="handleArrowMouseDown('prev')"
             @mouseup.stop="handleArrowMouseUp('prev')"
             @touchstart.stop="handleArrowTouchStart('prev')"
             @touchend.stop="handleArrowTouchEnd('prev')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M15 18L9 12L15 6"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>
        <div v-if="currentStep < 3" class="arrow-area right-arrow"
             @mousedown.stop="handleArrowMouseDown('next')"
             @mouseup.stop="handleArrowMouseUp('next')"
             @touchstart.stop="handleArrowTouchStart('next')"
             @touchend.stop="handleArrowTouchEnd('next')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M9 18L15 12L9 6"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>

        <div class="content-wrapper" ref="contentWrapper">
            <transition duration="300" name="fade" mode="out-in" @enter="onTransitionEnter">
                <div :key="currentStep" class="step-content" ref="stepContent">
                    <!-- Step 1: Introduction -->
                    <div v-if="currentStep === 1">
                        <PageHeader>
                            <template #default>
                                {{ $t('Pre-stake your NIM!') }} <br/>
                                {{ $t('1000 NIM = 1 Giveaway point') }}
                            </template>
                            <template #more>
                                <p class="nq-text">
                                    {{ $t('Collect points for the big giveaway and get a shiny Identicon upgrade – \
                                    the more the better.') }}
                                </p>
                            </template>
                        </PageHeader>
                        <PageBody>
                            <div class="content flex-column">
                                <div class="cards">
                                    <div class="card" v-for="(card, index) in cards" :key="index">
                                        <div class="card-placeholder" :class="{ 'loaded': card.loaded }">
                                            <img :src="card.src" :alt="card.alt" @load="onImageLoad(index)">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PageBody>
                    </div>

                    <!-- Step 2: Early Bird Multipliers -->
                    <div v-if="currentStep === 2">
                        <PageHeader>
                            <template #default>
                                {{ $t('Stake early to get more points!') }}
                            </template>
                            <template #more>
                                <p class="nq-text">
                                    {{ $t('Pre-stake as early as possible to earn more points.') }}
                                </p>
                            </template>
                        </PageHeader>
                        <PageBody>
                            <div class="content flex-column">
                                <div class="icon-container">
                                    <img src="../../assets/prestaking/step-2-icon.svg" alt="Hourglass icon"/>
                                    <div class="icon-label">{{ $t('EARLY BIRD MULTIPLIERS') }}</div>
                                </div>
                                <div class="multipliers">
                                    <div class="multiplier-card">
                                        <div class="multiplier">{{ $t('3x') }}</div>
                                        <div class="period">{{ $t('First week') }}</div>
                                    </div>
                                    <div class="multiplier-card">
                                        <div class="multiplier">{{ $t('2x') }}</div>
                                        <div class="period">{{ $t('Second week') }}</div>
                                    </div>
                                </div>
                            </div>
                        </PageBody>
                    </div>

                    <!-- Step 3: Underdog Multipliers -->
                    <div v-if="currentStep === 3">
                        <PageHeader>
                            <template #default>
                                {{ $t('Go for small validator pools to earn even more points!') }}
                            </template>
                            <template #more>
                                <p class="nq-text">
                                    {{ $t('Spreading the pre-staked NIM across validators helps decentralization.\
                                    Choose an underdog for another bonus.') }}
                                </p>
                            </template>
                        </PageHeader>
                        <PageBody>
                            <div class="content flex-column">
                                <div class="icon-container">
                                    <img src="../../assets/prestaking/step-3-icon.svg" alt="Hourglass icon"/>
                                    <div class="icon-label">{{ $t('UNDERDOG MULTIPLIERS') }}</div>
                                </div>
                                <div class="multipliers">
                                    <div class="multiplier-card step-3">
                                        <div class="multiplier">{{ $t('5x') }}</div>
                                        <div class="period">{{ $t('Small validators') }}</div>
                                    </div>
                                </div>
                            </div>
                        </PageBody>
                    </div>
                </div>
            </transition>
        </div>

        <button class="nq-button light-blue next-button"
                @click="emitNext"
                :disabled="!hasReachedStep3"
                :class="{ 'disabled': !hasReachedStep3 }">
            {{ $t('Let\'s go!') }}
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, watch } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import StepProgressBar from '../StepProgressBar.vue';

import bronzeCard from '../../assets/prestaking/cards/bronze.png';
import silverCard from '../../assets/prestaking/cards/silver.png';
import goldCard from '../../assets/prestaking/cards/gold.png';

export default defineComponent({
    setup(props, { emit, root }) {
        const currentStep = ref(1);
        const maxReachedStep = ref(1);
        const shouldAnimate = ref(true);
        const lastNavigationTime = ref(0);
        const navigationCooldown = 300; // ms
        const isPaused = ref(false);
        const isArrowClicked = ref(false);
        const arrowDirection = ref<'prev' | 'next' | null>(null);
        const pauseTimer = ref<number | ReturnType<typeof setTimeout> | null>(null);
        const navigationTimer = ref<number | ReturnType<typeof setTimeout> | null>(null);
        const PAUSE_DELAY = 200; // 200ms delay before pausing
        const NAVIGATION_DELAY = 300; // 300ms delay before allowing navigation after unpausing

        const touchStartX = ref(0);
        const touchEndX = ref(0);
        const isSwiping = ref(false);

        const hasReachedStep3 = computed(() => maxReachedStep.value >= 3);

        const cards = reactive([
            { src: bronzeCard, alt: 'Guardian', loaded: false },
            { src: silverCard, alt: 'Protector', loaded: false },
            { src: goldCard, alt: 'Hero', loaded: false },
        ]);

        const contentWrapper = ref<HTMLElement | null>(null);
        const stepContent = ref<HTMLElement | null>(null);

        const forceReflow = (el: HTMLElement): number => el.offsetHeight;

        const onTransitionEnter = (el: HTMLElement, done: () => void) => {
            if (contentWrapper.value) {
                const prevHeight = contentWrapper.value.offsetHeight;
                contentWrapper.value.style.height = 'auto';
                const newHeight = el.offsetHeight;
                contentWrapper.value.style.height = `${prevHeight}px`;

                // Force a reflow
                forceReflow(el);

                contentWrapper.value.style.height = `${newHeight}px`;

                setTimeout(done, 300);
            } else {
                done();
            }
        };

        const updateContainerHeight = () => {
            if (contentWrapper.value && stepContent.value) {
                contentWrapper.value.style.height = `${stepContent.value.offsetHeight}px`;
            }
        };

        onMounted(() => {
            updateContainerHeight();
        });

        watch(currentStep, () => {
            root.$nextTick(updateContainerHeight);
        });

        // Handle navigation between steps
        const navigate = (direction: 'next' | 'prev') => {
            const currentTime = Date.now();
            if (currentTime - lastNavigationTime.value > navigationCooldown && !isPaused.value) {
                if (direction === 'next' && currentStep.value < 3) {
                    currentStep.value++;
                    maxReachedStep.value = Math.max(maxReachedStep.value, currentStep.value);
                    shouldAnimate.value = true;
                } else if (direction === 'prev' && currentStep.value > 1) {
                    currentStep.value--;
                    shouldAnimate.value = false;
                }
                lastNavigationTime.value = currentTime;
            }
        };

        const onStepCompleted = () => {
            if (shouldAnimate.value) {
                navigate('next');
            }
        };

        const emitNext = () => {
            if (hasReachedStep3.value) {
                emit('next');
            }
        };

        const onImageLoad = (index: number) => {
            cards[index].loaded = true;
        };

        // Touch event handlers for swipe navigation
        const handleTouchStart = (e: TouchEvent) => {
            if (!isArrowClicked.value) {
                touchStartX.value = e.touches[0].clientX;
                isSwiping.value = false;
                startPauseTimer();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isArrowClicked.value) {
                touchEndX.value = e.touches[0].clientX;
                if (Math.abs(touchEndX.value - touchStartX.value) > 10) {
                    isSwiping.value = true;
                }
            }
        };

        const handleTouchEnd = () => {
            if (!isArrowClicked.value && isSwiping.value) {
                const swipeThreshold = 50; // Minimum distance to trigger swipe
                const swipeDistance = touchEndX.value - touchStartX.value;

                if (Math.abs(swipeDistance) > swipeThreshold) {
                    navigate(swipeDistance > 0 ? 'prev' : 'next');
                }
            }

            // Reset touch values
            touchStartX.value = 0;
            touchEndX.value = 0;
            isSwiping.value = false;
            isArrowClicked.value = false;
            setPaused(false);
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (!isArrowClicked.value) {
                startPauseTimer();
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isArrowClicked.value) {
                setPaused(false);
            }
        };

        const handleArrowMouseDown = (direction: 'prev' | 'next') => {
            isArrowClicked.value = true;
            arrowDirection.value = direction;
            startPauseTimer();
        };

        const handleArrowMouseUp = (direction: 'prev' | 'next') => {
            if (isArrowClicked.value && arrowDirection.value === direction && navigationTimer.value === null) {
                navigate(direction);
            }
            isArrowClicked.value = false;
            arrowDirection.value = null;
            setPaused(false);
        };

        const setPaused = (value: boolean) => {
            if (pauseTimer.value !== null) {
                clearTimeout(pauseTimer.value as ReturnType<typeof setTimeout>);
                pauseTimer.value = null;
            }
            if (navigationTimer.value !== null) {
                clearTimeout(navigationTimer.value as ReturnType<typeof setTimeout>);
                navigationTimer.value = null;
            }
            isPaused.value = value;
            if (!value) {
                navigationTimer.value = setTimeout(() => {
                    navigationTimer.value = null;
                }, NAVIGATION_DELAY);
            }
        };

        const startPauseTimer = () => {
            if (pauseTimer.value === null) {
                pauseTimer.value = setTimeout(() => {
                    setPaused(true);
                    pauseTimer.value = null;
                }, PAUSE_DELAY);
            }
        };

        const handleArrowTouchStart = (direction: 'prev' | 'next') => {
            isArrowClicked.value = true;
            arrowDirection.value = direction;
            startPauseTimer();
        };

        const handleArrowTouchEnd = (direction: 'prev' | 'next') => {
            if (isArrowClicked.value && arrowDirection.value === direction && navigationTimer.value === null) {
                navigate(direction);
            }
            isArrowClicked.value = false;
            arrowDirection.value = null;
            setPaused(false);
        };

        return {
            currentStep,
            shouldAnimate,
            isPaused,
            navigate,
            emitNext,
            onStepCompleted,
            cards,
            onImageLoad,
            hasReachedStep3,
            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,
            handleMouseDown,
            handleMouseUp,
            handleArrowMouseDown,
            handleArrowMouseUp,
            contentWrapper,
            stepContent,
            onTransitionEnter,
            setPaused,
            startPauseTimer,
            navigationTimer,
            isSwiping,
            handleArrowTouchStart,
            handleArrowTouchEnd,
        };
    },
    components: {
        PageHeader,
        PageBody,
        StepProgressBar,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/functions.scss';

.modal ::v-deep .close-button {
    display: none;
}

.prestaking-welcome-page {
    position: relative;
    width: 62rem;
    color: white;
    background-color: nimiq-blue(1);
    background-image: url('../../assets/prestaking/background.png');
    background-repeat: no-repeat;
    background-position: bottom center;
    background-size: 100% auto;
    border-radius: 0.75rem;
    flex-grow: 1;
    touch-action: pan-y;

    transition: height 0.45s ease;
    overflow: hidden;
}

.page-header {
    padding: 5.5rem 0 7rem;
}

.page-body {
    margin: 0;
    padding: 0;
    flex-grow: 1;
    overflow: unset;

    .content {
        height: 100%;
        justify-content: space-between;
        align-items: center;
        overflow: hidden;
    }
}

.next-button {
    width: 40.875rem;
    margin: 0 auto 5.375rem;
    transition: opacity 0.3s ease, background-color 0.3s ease, color 0.3s ease;

    &.disabled {
        color: white;
        background-color: rgba(255, 255, 255, 0.1);
        opacity: 0.6;
        cursor: not-allowed;
        pointer-events: none;
    }
}

.nq-text {
    margin: 1.25rem 0 0;
    padding: 0 1rem;
    color: rgba(255, 255, 255, 0.6);
}

.icon-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;

    img {
        width: auto;
        height: 150px;
        margin-bottom: 2rem;
    }

    .icon-label {
        font-size: 1.5rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
    }
}

.cards {
    display: flex;
    width: 115%;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 5rem;

    .card {
        width: 33.33%;
        flex: 0 0 auto;
    }
}

.card-placeholder {
    position: relative;
    width: 100%;
    padding-bottom: 140%;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    overflow: hidden;

    img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &.loaded img {
        opacity: 1;
    }
}

.multipliers {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-bottom: 8.375rem;
}

.multiplier-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 162px;
    height: 80px;
    padding: 2.5rem;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    border-radius: 1rem;
    background-color: rgba(255, 255, 255, 0.05);
    background-image:
        radial-gradient(101.48% 101.48% at 50% 100%, rgba(31, 35, 72, 0) 0%, rgba(31, 35, 72, 0.15) 100%),
        radial-gradient(83.64% 49.88% at 50% 0%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
    background-blend-mode: color-dodge;

    &.step-3 {
        width: 210px;
    }
}

.multiplier {
    padding: 1rem;
    margin-right: 1.5rem;
    font-size: 2rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
}

.period {
    font-size: 2rem;
    line-height: 1.25;
    opacity: 0.6;
}

@media (max-width: $mobileBreakpoint) {
    .prestaking-welcome-page {
        width: 100%;
        margin-top: -.5rem;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
    transform: scale(0.98);
}

.fade-enter-to,
.fade-leave {
    opacity: 1;
    transform: scale(1);
}

// Arrow navigation styles
.arrow-area {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    display: flex;
    align-items: center;
    opacity: 0;
    z-index: 10;
    cursor: pointer;
    transition: opacity 0.3s ease;

    &:hover, &:active, &:focus {
        opacity: 1;
    }

    svg {
        position: absolute;
        width: 2rem;
        height: 2rem;
        z-index: 11;
    }

    @media (max-width: $mobileBreakpoint) {
        opacity: 0.4;
        -webkit-tap-highlight-color: transparent;

        &:hover, &:active, &:focus {
            opacity: 0.4;
        }

        svg {
            width: 2.25rem;
            height: 2.25rem;
        }
    }

    // Improve touch area on mobile
    @media (max-width: $mobileBreakpoint) {
        width: 25%; // Decrease touch area width
        min-width: 50px; // Ensure a minimum width for small screens
    }
}

@mixin arrow-background($direction) {
    background: linear-gradient(
        to #{$direction},
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(255, 255, 255, 0) 100%
    );

    @media (max-width: $mobileBreakpoint) {
        background: linear-gradient(
            to #{$direction},
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 1rem,
            rgba(255, 255, 255, 0) 2rem
        );
    }
}

.left-arrow {
    left: 0;
    justify-content: flex-start;
    @include arrow-background(right);

    svg {
        left: 1rem;

        @media (max-width: $mobileBreakpoint) {
            left: 0.5rem;
        }
    }
}

.right-arrow {
    right: 0;
    justify-content: flex-end;
    @include arrow-background(left);

    svg {
        right: 1rem;

        @media (max-width: $mobileBreakpoint) {
            right: 0.5rem;
        }
    }
}

.content-wrapper {
    width: 100%;
    transition: height 0.3s ease;
    overflow: hidden;
}

.step-content {
    width: 100%;
    // transition: opacity 0.3s ease, transform 0.3s ease;
}
</style>

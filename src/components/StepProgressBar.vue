<template>
    <div class="step-progress-bar">
        <div
        v-for="step in 3"
        :key="step"
        class="step"
        >
            <div
            class="step-fill"
            :style="{ width: getFillWidth(step) }"
            ></div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted, onUnmounted } from 'vue';

export default defineComponent({
    props: {
        currentStep: {
            type: Number,
            required: true,
        },
        shouldAnimate: {
            type: Boolean,
            default: true,
        },
        isPaused: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const animationProgress = ref(0);
        const isFirstStepAnimated = ref(false);
        const ANIMATION_DURATION = 5000; // 5000ms = 5s (adjust as needed)

        const getFillWidth = computed(() => (step: number) => {
            if (props.currentStep > step) return '100%';
            if (props.currentStep === step) {
                return props.shouldAnimate ? `${animationProgress.value}%` : '100%';
            }
            return '0%';
        });

        let animationFrame: number;
        let startTime: number;
        let pausedTime = 0;
        let lastPauseTime: number | null = null;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;

            if (props.isPaused) {
                if (lastPauseTime === null) {
                    lastPauseTime = timestamp;
                }
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            if (lastPauseTime !== null) {
                pausedTime += timestamp - lastPauseTime;
                lastPauseTime = null;
            }

            const elapsedTime = timestamp - startTime - pausedTime;
            const progress = Math.min(elapsedTime / ANIMATION_DURATION, 1);
            animationProgress.value = progress * 100;

            if (progress < 1 && props.shouldAnimate) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                isFirstStepAnimated.value = true;
                emit('stepCompleted');
            }
        };

        const startAnimation = () => {
            cancelAnimationFrame(animationFrame);
            startTime = 0;
            pausedTime = 0;
            lastPauseTime = null;
            animationProgress.value = 0;
            if (props.shouldAnimate) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                animationProgress.value = 100;
            }
        };

        watch(() => props.currentStep, (newStep, oldStep) => {
            if (newStep > oldStep || (newStep === 1 && !isFirstStepAnimated.value)) {
                startAnimation();
            } else if (newStep < oldStep) {
                animationProgress.value = 100;
            }
        });

        onMounted(() => {
            if (props.currentStep === 1) {
                startAnimation();
            }
        });

        onUnmounted(() => {
            cancelAnimationFrame(animationFrame);
        });

        return {
            getFillWidth,
        };
    },
});
</script>

<style lang="scss" scoped>
.step-progress-bar {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 1rem;
    position: absolute;
    top: 1rem;
}

.step {
    height: 0.5rem;
    flex-grow: 1;
    background-color: rgba(255, 255, 255, 0.2); // white 20% opacity
    margin: 0 0.25rem;
    border-radius: 0.25rem;
    overflow: hidden;
}

.step-fill {
    height: 100%;
    background-color: white;
    transition: width 0.3s cubic-bezier(0.33, 1, 0.68, 1); // Easing curve added here
}
</style>

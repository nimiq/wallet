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
import { defineComponent, computed, ref, watch, onMounted } from '@vue/composition-api';

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
    },
    setup(props, { emit }) {
        const animationProgress = ref(100); // Start with full progress
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
        let animationStartTime: number | null = null;

        const animateStep = (timestamp: number) => {
            if (!animationStartTime) {
                animationStartTime = timestamp;
            }
            const elapsed = timestamp - animationStartTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
            animationProgress.value = progress * 100;

            if (progress < 1 && props.shouldAnimate) {
                animationFrame = requestAnimationFrame(animateStep);
            } else {
                isFirstStepAnimated.value = true;
                emit('stepCompleted');
            }
        };

        const startAnimation = () => {
            if (props.shouldAnimate) {
                animationStartTime = null;
                cancelAnimationFrame(animationFrame);
                animationProgress.value = 0; // Reset progress before starting animation
                animationFrame = requestAnimationFrame(animateStep);
            } else {
                animationProgress.value = 100; // Set to full progress immediately
            }
        };

        watch(() => props.currentStep, (newStep, oldStep) => {
            if (newStep > oldStep || (newStep === 1 && !isFirstStepAnimated.value)) {
                startAnimation();
            } else if (newStep < oldStep) {
                animationProgress.value = 100; // Set to full progress when going back
            }
        });

        onMounted(() => {
            if (props.currentStep === 1) {
                startAnimation();
            }
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

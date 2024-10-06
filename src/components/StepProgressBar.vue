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
    },
    setup(props) {
        const animationProgress = ref(0);
        const isFirstStepAnimated = ref(false);

        const getFillWidth = computed(() => (step: number) => {
            if (props.currentStep > step) return '100%';
            if (props.currentStep === step) {
                return `${animationProgress.value}%`;
            }
            return '0%';
        });

        let animationFrame: number;

        const animateStep = (timestamp: number) => {
            if (!animationStartTime) {
                animationStartTime = timestamp;
            }
            const elapsed = timestamp - animationStartTime;
            const progress = Math.min(elapsed / 2000, 1); // 2000ms = 2s
            animationProgress.value = progress * 100;

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animateStep);
            } else {
                isFirstStepAnimated.value = true;
            }
        };

        let animationStartTime: number | null = null;

        const startAnimation = () => {
            animationStartTime = null;
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(animateStep);
        };

        watch(() => props.currentStep, (newStep, oldStep) => {
            if (newStep > oldStep || (newStep === 1 && !isFirstStepAnimated.value)) {
                startAnimation();
            } else if (newStep < oldStep) {
                animationProgress.value = 0;
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
    transition: width 0.3s linear;
}
</style>

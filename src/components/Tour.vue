<template>
  <div class="tour">
    <v-tour
      name="nimiq-tour"
      :steps="steps.map((s) => s.tooltip)"
      :options="tourOptions"
    >
        <template slot-scope="tour">
            <transition name="fade">
                <v-step
                    class="tooltip"
                    v-if="tour.steps[tour.currentStep]"
                    :key="tour.currentStep"
                    :step="tour.steps[tour.currentStep]"
                    :previous-step="tour.previousStep"
                    :next-step="tour.goToNextStep"
                    :stop="tour.stop"
                    :skip="tour.skip"
                    :is-first="tour.isFirst"
                    :is-last="tour.isLast"
                    :labels="tour.labels"
                >
                    <div slot="content" class="content">
                        <p v-for="(content, i) in tour.steps[tour.currentStep].content" :key="i" v-html="$t(content)">
                        </p>
                        <!-- TODO REMOVE ME -->
                        <div class="remove_me" v-if="currentStep === 1" @click="simulate()">
                            Simulate Receive NIM
                        </div>
                    </div>
                    <div slot="actions">
                        <div
                            v-if="tour.steps[tour.currentStep].button || isFullDesktop"
                            class="actions"
                        >
                            <button @click="goToPrevStep()" v-if="currentStep > 0 && isFullDesktop" class="left">
                                <TourPreviousLeftArrowIcon />
                                {{ $t("Previous") }}
                            </button>
                            <button
                                class="right" v-if="tour.steps[tour.currentStep].button && !isLoading"
                                @click="() => tour.steps[tour.currentStep].button.fn(endTour)"
                            >
                                {{ $t(tour.steps[tour.currentStep].button.text) }}
                            </button>
                            <button
                                v-else-if="isFullDesktop && !disableNextStep && !isLoading"
                                class="right"
                                @click="goToNextStep()"
                            >
                                <span>{{ $t("Next") }}</span>
                            </button>
                            <button v-if="isLoading && isFullDesktop" class="circle-spinner right">
                                <CircleSpinner />
                            </button>
                        </div>
                    </div>
                </v-step>
            </transition>
        </template>
    </v-tour>
        <div class="tour-control-bar" v-if="isMobile || isTablet">
            <button @click="endTour()">
                {{ $t("End Tour") }}
            </button>
            <span class="progress"> {{ currentStep + 1 }} / {{ nSteps }} </span>
            <div class="arrows">
                <button
                    v-if="!isLoading"
                    class="prev"
                    :class="{ hidden: currentStep === 0}"
                    @click="goToPrevStep()"
                    style="transform: rotate(180deg)"
                >
                    <CaretRightIcon />
                </button>
                <button
                    class="next"
                    :class="{ loading: isLoading }"
                    :disabled="disableNextStep"
                    @click="!isLoading && goToNextStep()"
                >
                    <CaretRightIcon v-if="!isLoading" />
                    <CircleSpinner v-else class="circle-spinner" />
                </button>
            </div>
        </div>
  </div>
</template>

<script lang="ts">
import { useAccountStore } from '@/stores/Account';
import { useNetworkStore } from '@/stores/Network';
import { useTransactionsStore } from '@/stores/Transactions';
import { CircleSpinner } from '@nimiq/vue-components';
import {
    computed,
    defineComponent,
    onMounted,
    Ref,
    ref,
    watch,
} from '@vue/composition-api';
import Vue from 'vue';
import VueTour from 'vue-tour';
import { useWindowSize } from '../composables/useWindowSize';
import {
    getFakeTx,
    getTour,
    MountedReturnFn, TourStep,
    TourStepIndex,
} from '../lib/tour';
import CaretRightIcon from './icons/CaretRightIcon.vue';
import TourPreviousLeftArrowIcon from './icons/TourPreviousLeftArrowIcon.vue';

Vue.use(VueTour);

require('vue-tour/dist/vue-tour.css');

export default defineComponent({
    name: 'tour',
    setup(props, context) {
        const { isMobile, isTablet, isFullDesktop } = useWindowSize();

        const { state: $network } = useNetworkStore();
        const disconnected = computed(() => $network.consensus !== 'established');

        const { state: tourStore, setTour } = useAccountStore();

        let tour: VueTour.Tour | null = null;
        const tourOptions: any = {
            // eslint-disable-next-line max-len
            // see example: https://github.com/pulsardev/vue-tour/blob/6ee85afdae3a4cb8689959b3b0c2035e165072fa/src/shared/constants.js
            enabledButtons: {
                buttonSkip: false,
                buttonPrevious: false,
                buttonNext: false,
                buttonStop: false,
            },
            labels: {
                buttonSkip: 'Skip tour',
                buttonPrevious: 'Previous',
                buttonNext: 'Next',
                buttonStop: 'Finish',
            },
            useKeyboardNavigation: false, // handled by us
        };
        // TODO Go back to index
        const steps: TourStep[] = Object.values(getTour(tourStore.tour, context) ?? []);

        // Initial state
        const isLoading = ref(true);
        const currentStep: Ref<TourStepIndex> = tourStore.tour === 'onboarding' ? ref(5) : ref(0); // TODO Remove
        const nSteps: Ref<number> = ref(0);
        const disableNextStep = ref(true);

        let unmounted: MountedReturnFn | void;

        onMounted(async () => {
            await tourSetup();

            // REMOVE ME
            const { removeTransactions } = useTransactionsStore();
            removeTransactions([getFakeTx()]);
        });

        async function tourSetup() {
            await context.root.$nextTick(); // to ensure the DOM is ready

            const step = steps[currentStep.value]!;

            // Update state
            nSteps.value = Object.keys(steps).length;
            disableNextStep.value = currentStep.value >= nSteps.value - 1 || !!step.ui.isNextStepDisabled;

            if (step.lifecycle?.created) {
                await step.lifecycle.created({ goToNextStep, goingForward: true });
            }

            _addAttributes(step.ui, currentStep.value);

            unmounted = await step.lifecycle?.mounted?.({
                goToNextStep,
                goingForward: true,
                ending: false,
            });

            if (context.root.$route.path !== step.path) {
                context.root.$router.push(step.path);
            }

            await sleep(500);

            tour = context.root.$tours['nimiq-tour'];
            tour.start(`${currentStep.value}`);
            isLoading.value = false;

            _broadcastTourData();
            context.root.$on('tour-end', () => {
                endTour();
            });
        }

        // Dont allow user to interact with the page while it is loading
        // But allow to end it
        watch([isLoading, disconnected], () => {
            const app = document.querySelector('#app main') as HTMLDivElement;

            if (isLoading.value || disconnected.value) {
                app.setAttribute('data-non-interactable', '');
            } else {
                app.removeAttribute('data-non-interactable');
            }
        });

        function goToPrevStep() {
            if (currentStep.value <= 0) return;
            _moveToFutureStep(currentStep.value, currentStep.value - 1);
        }

        function goToNextStep() {
            if (currentStep.value + 1 >= nSteps.value) return;
            _moveToFutureStep(currentStep.value, currentStep.value + 1);
        }

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        async function _moveToFutureStep(
            currentStepIndex: TourStepIndex,
            futureStepIndex: TourStepIndex,
        ) {
            // TODO https://stackoverflow.com/questions/42990308/vue-js-how-to-call-method-from-another-component
            const goingForward = futureStepIndex > currentStepIndex;

            const { path: currentPath, ui: currentUI } = steps[currentStepIndex]!;
            const { path: futurePath, ui: futureUI, lifecycle: futureLifecycle } = steps[futureStepIndex]!;

            isLoading.value = true;
            tour!.stop();

            await sleep(500);

            if (unmounted) {
                await unmounted({ goingForward, ending: false });
            }

            // created
            await futureLifecycle?.created?.({ goToNextStep, goingForward });

            if (futurePath !== currentPath && context.root.$route.fullPath !== futurePath) {
                context.root.$router.push(futurePath);
                await context.root.$nextTick();
            }

            _toggleDisabledButtons(currentUI.disabledButtons, false);
            _toggleDisabledButtons(futureUI.disabledButtons, true);
            _addAttributes(futureUI, futureStepIndex);

            if (futurePath !== currentPath) {
                await sleep(500);
            }

            _removeAttributes(currentStepIndex);

            tour!.start(futureStepIndex.toString());

            // FIXME Instead of doing tour!.end and tour!.start, we could also use .nextStep() or previsousStep()
            // The problem with this solution is that some animations glitch the UI so it needs further
            // investigation
            // goingForward ? tour!.nextStep() : tour!.previousStep();

            // mounted
            isLoading.value = false;
            disableNextStep.value = futureStepIndex >= nSteps.value - 1 || !!futureUI.isNextStepDisabled;

            unmounted = await futureLifecycle?.mounted?.({
                goToNextStep,
                goingForward,
                ending: false,
            });

            currentStep.value = futureStepIndex;
            _broadcastTourData();
        }

        function _broadcastTourData() {
            context.root.$emit('tour-data', {
                nSteps: nSteps.value,
                currentStep: currentStep.value,
            });
        }

        function _toggleDisabledButtons(disabledButtons: TourStep['ui']['disabledButtons'], disabled:boolean) {
            if (!disabledButtons) return;
            disabledButtons.forEach((element) => {
                const el = document.querySelector(element) as HTMLButtonElement;
                if (!el) return;
                el.disabled = disabled;
            });
        }

        function _addAttributes(
            uiConfig: TourStep['ui'],
            stepIndex: TourStepIndex,
        ) {
            const fadedElements = uiConfig.fadedElements || [];
            const disabledElements = uiConfig.disabledElements || [];

            disabledElements.forEach((element) => {
                const el = document.querySelector(element);
                if (!el) return;
                el.setAttribute('data-non-interactable', stepIndex.toString());
            });

            fadedElements.forEach((element) => {
                const el = document.querySelector(element);
                if (!el) return;
                el.setAttribute('data-opacified', stepIndex.toString());
                el.setAttribute('data-non-interactable', stepIndex.toString());
            });
        }

        function _removeAttributes(stepIndex: TourStepIndex) {
            document
                .querySelectorAll(`[data-non-interactable="${stepIndex}"]`)
                .forEach((el) => {
                    el.removeAttribute('data-non-interactable');
                });

            document
                .querySelectorAll(`[data-opacified="${stepIndex}"]`)
                .forEach((el) => {
                    el.removeAttribute('data-opacified');
                });
        }

        async function endTour() {
            _removeAttributes(currentStep.value);
            _toggleDisabledButtons(steps[currentStep.value]?.ui.disabledButtons, false);

            if (unmounted) {
                await unmounted({ ending: true, goingForward: false });
            }

            // If user finalizes tour while it is loading, allow interaction again
            const app = document.querySelector('#app main') as HTMLDivElement;
            app.removeAttribute('data-non-interactable');

            setTour(null);
            context.root.$off('tour-end');
        }

        // TODO REMOVE ME - Simulate tx
        function simulate() {
            const { addTransactions } = useTransactionsStore();
            addTransactions([getFakeTx()]);
            goToNextStep();
        }

        return {
            isMobile,
            isTablet,
            isFullDesktop,

            // tour
            tourOptions,
            steps,

            // control bar
            currentStep,
            nSteps,
            isLoading: disconnected || isLoading,
            disableNextStep,

            // actions
            goToPrevStep,
            goToNextStep,
            endTour,

            // TODO REMOVE ME
            simulate,
        };
    },
    components: {
        CaretRightIcon,
        TourPreviousLeftArrowIcon,
        CircleSpinner,
    },
});
</script>

<style lang="scss">
// Using data attribute instead of classes because it is easier to track which elements should be
// updated with opacity and non-interactivity properties as data attributes allow to use a value like
// [data-opaified="1"] although the CSS selector that we can use is [data-opacified]. @see _removeAttributes

[data-opacified] {
  filter: opacity(0.3);
}

[data-non-interactable],
[data-non-interactable] * {
  user-select: none !important;
  pointer-events: none !important;
}

#app > *:not(.tour) {
  cursor: not-allowed;
}
</style>

<style lang="scss" scoped>
.tour {
    position: relative;

    button {
        width: min-content;
        white-space: nowrap;
        font-size: 16px;
        padding: 0.8rem 1.6rem;

        text-align: center;
        background: #ffffff33; // TODO Maybe move this to a CSS variable (?)
        color: var(--nimiq-white);
        border: none;
        outline: var(--nimiq-);
        border-radius: 9999px;
        cursor: pointer;
    }

    .tooltip {
        background: radial-gradient(
            100% 100% at 100% 100%,
            #265dd7 0%,
            #0582ca 100%
        );
        box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.07),
        0px 1.5px 3px rgba(0, 0, 0, 0.05),
        0px 0.337011px 2px rgba(0, 0, 0, 0.0254662);
        border-radius: 1rem;
        width: clamp(200px, 255px, calc(100vw - 2rem));
        padding: 2rem;

        .content {
            display: flex;
            flex-direction: column;
            gap: 1rem;

            p {
                margin: 0;
                font-size: 15px;
                line-height: 21px;
                text-align: left;

                br {
                    margin: 4rem 0;
                }
            }
        }

        .actions {
            margin-top: 2rem;
            display: flex;

            button {
                font-weight: 700;
                font-size: 14px;

                &.left {
                    display: flex;
                    align-items: center;
                    opacity: 0.7;
                    background: none;
                    padding: 0;

                    svg {
                        margin-right: 0.75rem;
                    }
                }

                &.right {
                    margin-left: auto;
                }

                &.circle-spinner {
                    width: 28.78px;
                    height: 28.78px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;

                    & ::v-deep svg path:nth-child(1) {
                        stroke: var(--nimiq-white);
                    }
                }
            }
        }
    }
}

.tour-control-bar {
    position: fixed;
    bottom: 10px;
    right: 0;
    left: 0;
    margin: 0 auto;
    width: clamp(180px, 300px, calc(100vw - 2rem));
    padding: 1rem;
    border-radius: 9999px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    z-index: 6;

    // TODO Cannot use CSS variables here
    background: radial-gradient(100% 100% at 100% 100%, #265dd7 0%, #0582ca 100%);

    button {
        padding: 1.4rem 1.6rem 1rem 1.6rem;
        font-weight: 700;

        &:disabled {
        opacity: 0.5;
        }

        &.hidden {
        display: none;
        }
    }

    .arrows {
        justify-self: end;
        display: flex;
        gap: 0.5rem;

        button {
            height: 5rem;
            width: 5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;

            &.prev {
                background: initial;
            }

            &.next {
                padding-left: 0.75rem;

                &.loading {
                    padding-left: 0;

                    & ::v-deep svg path:nth-child(1) {
                        stroke: var(--nimiq-white);
                    }
                }
            }
        }
    }

    .progress {
        opacity: 0.7;
        color: var(--nimiq-white);
        white-space: nowrap;
        text-align: center;
        font-size: 13px;
    }
}

.remove_me {
    background: var(--nimiq-green);
    color: var(--nimiq-white);
    border-radius: 9999px;
    padding: 1rem 3rem;
    font-size: 16px;
    text-align: center;
    cursor: pointer;
}
</style>

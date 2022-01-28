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
                    :class="tour.steps[tour.currentStep].params.placement || ''"
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
                        <div v-for="(content, i) in tour.steps[tour.currentStep].content" :key="i">
                            <PartyConfettiIcon v-if="currentStep === nSteps - 1 && i === 0" />
                            <p>{{ $t(content) }}</p>
                        </div>
                        <!-- TODO REMOVE ME -->
                        <div class="remove_me" v-if="currentStep === 1 && disableNextStep" @click="simulate()">
                            Simulate Receive NIM
                        </div>
                    </div>
                    <div slot="actions">
                        <div
                            v-if="tour.steps[tour.currentStep].button || isLargeScreen"
                            class="actions"
                        >
                            <button @click="goToPrevStep()" v-if="currentStep > 0 && isLargeScreen" class="left">
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
                                v-else-if="isLargeScreen && !disableNextStep && !isLoading"
                                class="right"
                                @click="goToNextStep()"
                            >
                                <span>{{ $t("Next") }}</span>
                            </button>
                            <button v-if="isLoading && isLargeScreen" class="circle-spinner right">
                                <CircleSpinner />
                            </button>
                        </div>
                    </div>
                </v-step>
            </transition>
        </template>
    </v-tour>
        <div class="tour-control-bar" v-if="isSmallScreen || isMediumScreen">
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
    MountedReturnFn, TourBroadcast, TourStep,
    TourStepIndex,
} from '../lib/tour';
import CaretRightIcon from './icons/CaretRightIcon.vue';
import PartyConfettiIcon from './icons/PartyConfettiIcon.vue';
import TourPreviousLeftArrowIcon from './icons/TourPreviousLeftArrowIcon.vue';

Vue.use(VueTour);

require('vue-tour/dist/vue-tour.css');

export default defineComponent({
    name: 'nimiq-tour',
    setup(props, context) {
        const { isSmallScreen, isMediumScreen, isLargeScreen } = useWindowSize();

        const { state: $network } = useNetworkStore();
        const disconnected = computed(() => $network.consensus !== 'established');

        const { state: tourStore, setTour, activeAccountInfo } = useAccountStore();
        activeAccountInfo.value!.fileExported = false;

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
        const steps = Object.values(getTour(tourStore.tour?.name, context));

        // Initial state
        const isLoading = ref(true);
        const currentStep: Ref<TourStepIndex> = ref(0);
        const nSteps: Ref<number> = ref(0);
        const disableNextStep = ref(true);

        let unmounted: MountedReturnFn | void;

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        onMounted(async () => {
            await tourSetup();

            // REMOVE ME
            const { removeTransactions, addTransactions } = useTransactionsStore();
            // removeTransactions([getFakeTx()]);
            addTransactions([getFakeTx()]);
        });

        async function tourSetup() {
            await context.root.$nextTick(); // to ensure the DOM is ready

            const step = steps[currentStep.value];
            if (!step) return;

            // Update state
            nSteps.value = Object.keys(steps).length;
            disableNextStep.value = currentStep.value >= nSteps.value - 1 || !!step.ui.isNextStepDisabled;

            if (step.lifecycle?.created) {
                await step.lifecycle.created({ goToNextStep, goingForward: true });
            }

            _toggleDisabledButtons(step.ui.disabledButtons, true);
            _addAttributes(step.ui, currentStep.value);

            unmounted = await step.lifecycle?.mounted?.({
                goToNextStep,
                goingForward: true,
                ending: false,
            });

            if (!context.root.$route.fullPath.endsWith(step.path)) {
                context.root.$router.push(step.path);
                await context.root.$nextTick();
            }

            // ensures animation ends
            await sleep(1000);

            tour = context.root.$tours['nimiq-tour'];
            tour.start(`${currentStep.value}`);
            isLoading.value = false;

            window.addEventListener('keyup', _onKeyDown);
            window.addEventListener('click', _userClicked());

            _receiveEvents();
            _broadcast({
                type: 'tour-step-changed',
                payload: {
                    currentStep: currentStep.value,
                    nSteps: nSteps.value,
                },
            });
        }

        // Dont allow user to interact with the page while it is loading
        // But allow to end it
        watch([isLoading, disconnected], async () => {
            const app = document.querySelector('#app main') as HTMLDivElement;

            if (isLoading.value || disconnected.value) {
                app.setAttribute('data-non-interactable', '');
            } else {
                app.removeAttribute('data-non-interactable');
            }

            // FIXME we should wait until the button is rendered and the we could
            // execute _toggleDisabledButtons but it is kind of random the amount of time
            // it takes to render the button. I don't know how to fix it.

            // Ensure that we disabled 'Receive Free NIM' button
            await sleep(500);
            _toggleDisabledButtons(steps[currentStep.value]?.ui.disabledButtons, true);
        });

        function goToPrevStep() {
            if (currentStep.value <= 0 || disconnected.value || isLoading.value) return;
            _moveToFutureStep(currentStep.value, currentStep.value - 1);
        }

        function goToNextStep() {
            if (currentStep.value + 1 >= nSteps.value || disconnected.value || isLoading.value) return;
            _moveToFutureStep(currentStep.value, currentStep.value + 1);
        }

        async function _moveToFutureStep(
            currentStepIndex: TourStepIndex,
            futureStepIndex: TourStepIndex,
        ) {
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
            _broadcast({
                type: 'tour-step-changed',
                payload: {
                    currentStep: currentStep.value,
                    nSteps: nSteps.value,
                },
            });
        }

        function _broadcast(data: TourBroadcast) {
            // Send data to TourLargeScreenManager
            context.root.$emit('nimiq-tour-event', data);
        }

        function _receiveEvents() {
            // events emitted by TourLargeScreenManager
            context.root.$on('nimiq-tour-event', (data: TourBroadcast) => {
                if (data.type === 'end-tour') endTour();
            });
        }

        function _userClicked() {
            const userCanClick = ['.tour', '.tour-manager'].map((s) => document.querySelector(s) as HTMLElement);
            return ({ target }: MouseEvent) => {
                if (!target) return;
                if (!userCanClick.some((el) => el.contains(target as Node))) {
                    _broadcast({ type: 'clicked-outside-tour' });
                }
            };
        }

        // TODO In tablets 'buy nim' in sidebar does not get its original state
        let _buttonNimClasses: {[x:string]: string} = {};
        function _toggleDisabledButtons(disabledButtons: TourStep['ui']['disabledButtons'], disabled:boolean) {
            if (!disabledButtons) return;

            // Classes that have to be removed while the tour is shown
            const btnNimiqClasses = ['light-blue', 'green', 'orange', 'red', 'gold'];
            disabledButtons.forEach((element) => {
                const el = document.querySelector(element) as HTMLButtonElement;
                if (!el) return;
                el.disabled = disabled;

                for (const className of el.classList.values() ?? []) {
                    if (disabled && btnNimiqClasses.includes(className)) {
                        el.classList.remove(className);
                        _buttonNimClasses[element] = className;
                    }
                }
            });
            if (!disabled) {
                Object.keys(_buttonNimClasses).forEach((el) => {
                    const btn = document.querySelector(el) as HTMLButtonElement;
                    if (!btn) return;
                    btn.classList.add(_buttonNimClasses[el]);
                });
                _buttonNimClasses = {};
            }
        }

        function _addAttributes(
            uiConfig: TourStep['ui'],
            stepIndex: TourStepIndex,
        ) {
            const fadedElements = uiConfig.fadedElements || [];
            const disabledElements = uiConfig.disabledElements || [];

            disabledElements.filter((e) => e).forEach((element) => {
                const el = document.querySelector(element);
                if (!el) return;
                el.setAttribute('data-non-interactable', stepIndex.toString());
            });

            fadedElements.filter((e) => e).forEach((element) => {
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

            window.removeEventListener('keyup', _onKeyDown);
            window.addEventListener('click', _userClicked());

            context.root.$off('nimiq-tour-event');

            if (unmounted) {
                await unmounted({ ending: true, goingForward: false });
            }

            // If user finalizes tour while it is loading, allow interaction again
            const app = document.querySelector('#app main') as HTMLDivElement;
            app.removeAttribute('data-non-interactable');

            setTour(null);
        }

        function _onKeyDown(event: KeyboardEvent) {
            switch (event.key) {
                case 'ArrowRight':
                    if (!disableNextStep.value) {
                        goToNextStep();
                    }
                    break;
                case 'ArrowLeft':
                    goToPrevStep();
                    break;
                case 'Escape':
                    endTour();
                    break;
                default:
                    break;
            }
        }

        // TODO REMOVE ME - Simulate tx
        function simulate() {
            const { addTransactions } = useTransactionsStore();
            addTransactions([getFakeTx()]);
            goToNextStep();
        }

        return {
            isSmallScreen,
            isMediumScreen,
            isLargeScreen,

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
            _buttonNimClasses,
        };
    },
    components: {
        CaretRightIcon,
        TourPreviousLeftArrowIcon,
        PartyConfettiIcon,
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

#app > *:not(.tour):not(.tour-manager) {
  cursor: not-allowed;
}

button.highlighted {
    background: linear-gradient(
            274.28deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 27.6%, rgba(255, 255, 255, 0) 53.12%,
            rgba(255, 255, 255, 0.2) 81.25%, rgba(255, 255, 255, 0) 100%
        ),
        radial-gradient(100% 100% at 100% 100%, #41A38E 0%, #21BCA5 100%) !important;
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
        border-radius: 9999px;
        cursor: pointer;
    }

    .tooltip {
        background: var(--nimiq-light-blue-bg);
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

            & > div {
                display: flex;
                align-items: center;

                p {
                    margin: 0;
                    font-size: 15px;
                    line-height: 21px;
                    text-align: left;

                    br {
                        margin: 4rem 0;
                    }
                }

                p::selection {
                    color: var(--nimiq-light-blue);
                    background: var(--nimiq-light-gray);
                }

                ::v-deep svg {
                    float: left;
                    margin-right: 2rem;
                    margin-top: -5px;
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
        ::v-deep .v-step__arrow {
            background: var(--nimiq-light-blue);
        }

        &.bottom-start ::v-deep .v-step__arrow, &.right-start ::v-deep .v-step__arrow,
        &.bottom ::v-deep .v-step__arrow, &.right ::v-deep .v-step__arrow, &.right-end ::v-deep .v-step__arrow {
            background: #0582ca !important;
        }

        &.bottom-end ::v-deep .v-step__arrow {
            background: #0681ca !important;
        }

        &.top-start ::v-deep .v-step__arrow {
            background: #087ecb !important;
        }

        &.left-start ::v-deep .v-step__arrow {
            background: #0a7ccc !important;
        }

        &.left ::v-deep .v-step__arrow {
            background: #1570d0 !important;
        }

        &.top ::v-deep .v-step__arrow {
            background: #1570d0 !important;
        }

        &.left-end ::v-deep .v-step__arrow, &.top-end ::v-deep .v-step__arrow {
            background: #2163d5 !important;
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
                    cursor: inherit;

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
        letter-spacing: -0.4px;
        font-variant-numeric: tabular-nums;
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

<template>
  <div class="tour">
    <v-tour
      name="nimiq-tour"
      :steps="steps.map((s) => s.tooltip)"
      :options="tourOptions"
    >
        <template v-slot="tour">
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
                            <hr v-if="content === IContentSpecialItem.HR" />
                            <i18n v-else-if="content.includes(IContentSpecialItem.ICON_NETWORK_WORLD)"
                                :path="content" tag="p">
                                <template v-slot:network_icon>
                                    <WorldCheckIcon />
                                </template>
                                <template v-slot:account_icon>
                                    <svg width="14" height="21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g opacity=".7">
                                            <rect x=".75" y=".75" width="12.5" height="19.5"
                                                rx="2.5" stroke="#fff" stroke-width="1.5"/>
                                            <circle cx="7" cy="7" r="2" fill="#fff"/>
                                        </g>
                                    </svg>
                                </template>
                            </i18n>
                            <p v-else-if="typeof content === 'string'" v-html="$t(content)"></p>
                            <ul v-else-if="content.length">
                                <li v-for="(item, i) in content" :key="i">
                                    <span class="dash">-</span>
                                    <span v-html="$t(item)"></span>
                                </li>
                            </ul>
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
                                <!--  TODO Move $t to logic -->
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
                    <CaretRightSmallIcon />
                </button>
                <button
                    class="next"
                    :class="{ loading: isLoading }"
                    :disabled="disableNextStep"
                    @click="!isLoading && goToNextStep()"
                >
                    <CaretRightSmallIcon v-if="!isLoading" />
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
import { CircleSpinner, CaretRightSmallIcon } from '@nimiq/vue-components';
import {
    computed,
    defineComponent,
    onMounted,
    onUnmounted,
    Ref,
    ref,
    watch,
} from '@vue/composition-api';
import Vue from 'vue';
import VueTour from 'vue-tour';
import { useWindowSize } from '../composables/useWindowSize';
import {
    IContentSpecialItem,
    getFakeTx,
    getTour,
    IMountedReturnFn, ITourBroadcast, ITourStep,
    TourStepIndex,
} from '../lib/tour';
import PartyConfettiIcon from './icons/PartyConfettiIcon.vue';
import TourPreviousLeftArrowIcon from './icons/TourPreviousLeftArrowIcon.vue';
import WorldCheckIcon from './icons/WorldCheckIcon.vue';

Vue.use(VueTour);

require('vue-tour/dist/vue-tour.css');

export default defineComponent({
    name: 'nimiq-tour',
    setup(props, context) {
        const { isSmallScreen, isMediumScreen, isLargeScreen } = useWindowSize();

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
            // TODO Add padding to arrow
            useKeyboardNavigation: false, // handled by us
        };
        let steps = Object.values(getTour(tourStore.tour?.name, context));

        // Initial state
        const isLoading = ref(true);
        const currentStep: Ref<TourStepIndex> = ref(0);
        const nSteps: Ref<number> = ref(0);
        const disableNextStep = ref(true);

        let unmounted: IMountedReturnFn | void;

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        onMounted(async () => {
            await tourSetup();

            // REMOVE ME
            const { removeTransactions } = useTransactionsStore();
            removeTransactions([getFakeTx()]);
            // const { addTransactions } = useTransactionsStore();
            // addTransactions([getFakeTx()]);
        });

        onUnmounted(() => endTour());

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

            if (context.root.$route.fullPath !== step.path) {
                context.root.$router.push(step.path);
                await context.root.$nextTick();
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
            setTimeout(() => {
                window.addEventListener('click', _userClicked());
            }, 100); // avoid click event to be triggered by the setting button

            // window.addEventListener('resize', _OnResize(_OnResizeEnd)); TODO

            const app = document.querySelector('#app');
            app!.setAttribute('data-tour-active', '');

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
            // TODO
            // Avoid interaction with any of the elements when loading except tour elements (bar, manager and tooltip)
            // const elements = Object.values(IWalletHTMLElements).filter((e) => e);
            // if (isLoading.value || disconnected.value) {
            //     elements.forEach((element) => {
            //         const el = document.querySelector(element);
            //         if (!el) return;
            //         el.setAttribute('data-non-interactable', 'loading');
            //     });
            // } else {
            //     elements.forEach((element) => {
            //         const el = document.querySelector(element);
            //         if (!el) return;
            //         el.removeAttribute('data-non-interactable');
            //     });
            // }

            // FIXME we should wait until the buttons are rendered and the we could
            // execute _toggleDisabledButtons but it is kind of random the amount of time
            // it takes to render the button. I don't know how to fix it. Waiting 500ms works.
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
            await context.root.$nextTick();

            if (futurePath !== currentPath) {
                await sleep(500);
            }

            _removeAttributes(currentStepIndex);

            tour!.start(futureStepIndex.toString());
            await context.root.$nextTick();

            // FIXME Instead of doing tour!.end and tour!.start, we could also use .nextStep() or previsousStep()
            // The problem with this solution is that some animations glitch the UI so it needs further
            // investigation
            // goingForward ? tour!.nextStep() : tour!.previousStep();

            // mounted
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

        function _broadcast(data: ITourBroadcast) {
            // Send data to TourLargeScreenManager
            context.root.$emit('nimiq-tour-event', data);
        }

        function _receiveEvents() {
            // events emitted by TourLargeScreenManager
            context.root.$on('nimiq-tour-event', (data: ITourBroadcast) => {
                if (data.type === 'end-tour') endTour();
            });
            context.root.$on('nimiq-tour-event', (data: ITourBroadcast) => {
                if (data.type === 'clicked-outside-tour') {
                    const tourManager = document.querySelector('.tour-control-bar');
                    if (tourManager) {
                        tourManager.classList.add('flash');
                        setTimeout(() => {
                            tourManager.classList.remove('flash');
                        }, 400);
                    }
                }
            });
        }

        function _userClicked() {
            const userCanClick = ['.tour', '.tour-manager']
                .map((s) => document.querySelector(s) as HTMLElement)
                .filter((e) => !!e);

            return ({ target }: MouseEvent) => {
                if (!target) return;
                if (!userCanClick.some((el) => el.contains(target as Node))) {
                    _broadcast({ type: 'clicked-outside-tour' });
                }
            };
        }

        // TODO In tablets 'buy nim' in sidebar does not get its original state
        let _buttonNimClasses: {[x:string]: string} = {};
        function _toggleDisabledButtons(disabledButtons: ITourStep['ui']['disabledButtons'], disabled:boolean) {
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

        function _onScrollLockedElement(e: Event, el: Element) {
            e.preventDefault();
            el.scrollTop = 0;
        }
        function _addAttributes(
            uiConfig: ITourStep['ui'],
            stepIndex: TourStepIndex,
        ) {
            const fadedElements = uiConfig.fadedElements || [];
            const disabledElements = uiConfig.disabledElements || [];
            const scrollLockedElements = uiConfig.scrollLockedElements || [];

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

            scrollLockedElements.filter((e) => e).forEach((element) => {
                const el = document.querySelector(element);
                if (!el) return;
                el.setAttribute('data-scroll-locked', stepIndex.toString());
                // Avoid scrolling when tooltip is instantiated
                el.addEventListener('scroll', (e) => _onScrollLockedElement(e, el));
                el.scrollTop = 0;
            });
        }

        function _removeAttributes(stepIndex: TourStepIndex) {
            document.querySelectorAll(`[data-non-interactable="${stepIndex}"]`)
                .forEach((el) => {
                    el.removeAttribute('data-non-interactable');
                });

            document.querySelectorAll(`[data-opacified="${stepIndex}"]`)
                .forEach((el) => {
                    el.removeAttribute('data-opacified');
                });

            document.querySelectorAll(`[data-scroll-locked="${stepIndex}"]`)
                .forEach((el) => {
                    el.removeAttribute('data-scroll-locked');
                    el.addEventListener('scroll', (e) => _onScrollLockedElement(e, el));
                });
        }

        async function endTour(soft = false) {
            window.removeEventListener('keyup', _onKeyDown);
            window.removeEventListener('click', () => _userClicked());

            if (unmounted) {
                await unmounted({ ending: true, goingForward: false });
            }
            if (soft) {
                return;
            }

            window.removeEventListener('resize', () => _OnResize(_OnResizeEnd));

            _removeAttributes(currentStep.value);
            _toggleDisabledButtons(steps[currentStep.value]?.ui.disabledButtons, false);

            context.root.$off('nimiq-tour-event');

            // If user finalizes tour while it is loading, allow interaction again
            const app = document.querySelector('#app') as HTMLDivElement;
            app.removeAttribute('data-tour-active');
            app.querySelector('main')!.removeAttribute('data-non-interactable');

            setTour(null);
        }

        function _OnResize(func: () => void) {
            endTour(true);
            tour!.stop();
            let timer: ReturnType<typeof setTimeout> | null = null;
            return () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(func, 100);
            };
        }

        function _OnResizeEnd() {
            steps = Object.values(getTour(tourStore.tour?.name, context));
            tourSetup();
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
            IContentSpecialItem,

            // tour
            tourOptions,
            steps,

            // control bar
            currentStep,
            nSteps,
            isLoading: computed(() => disconnected.value || isLoading.value),
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
        CaretRightSmallIcon,
        TourPreviousLeftArrowIcon,
        PartyConfettiIcon,
        CircleSpinner,
        WorldCheckIcon,
    },
});
</script>

<style lang="scss">
// Using data attribute instead of classes because it is easier to track which elements should be
// updated with opacity and non-interactivity properties as data attributes allow to use a value like
// [data-opaified="1"] although the CSS selector that we can use is [data-opacified]. @see _removeAttributes

[data-tour-active] [data-opacified] {
  filter: opacity(0.3);
}

[data-tour-active] [data-non-interactable],
[data-tour-active] [data-non-interactable] * {
  user-select: none !important;
  pointer-events: none !important;
  cursor: not-allowed;
}

[data-tour-active] [data-scroll-locked],
[data-tour-active] [data-scroll-locked] * {
    overflow: hidden;
}

[data-tour-active] button.green-highlight {
    background: linear-gradient(
            274.28deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 27.6%, rgba(255, 255, 255, 0) 53.12%,
            rgba(255, 255, 255, 0.2) 81.25%, rgba(255, 255, 255, 0) 100%
        ), var(--nimiq-green-bg) !important;
    background-blend-mode: hard-light, normal !important;
}

[data-tour-active] button.gray-highlight {
    background: linear-gradient(
            274.28deg, rgba(31, 35, 72, 0) 0%, rgba(31, 35, 72, 0.07) 27.6%, rgba(31, 35, 72, 0) 53.12%,
            rgba(31, 35, 72, 0.07) 81.25%, rgba(31, 35, 72, 0) 100%) !important;
    background-blend-mode: hard-light, normal !important;
}
</style>

<style lang="scss" scoped>
.tour {
    font-family: Mulish, Muli, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;

    position: absolute;
    width: 100vw;
    height: 100%;
    pointer-events: none;

    > * {
        pointer-events: initial;
    }

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
        z-index: 10;

        .content {
            display: flex;
            flex-direction: column;
            gap: 1rem;

            & > div {
                display: flex;
                align-items: center;

                ul {
                    list-style-type: none;
                    margin: 0;
                    padding-left: 0;

                    li {
                        display: flex;
                        gap: 1rem;
                        margin-top: 1rem;

                        .dash {
                            user-select: none;
                        }
                    }
                }

                p, li {
                    margin: 0;
                    font-size: 15px;
                    line-height: 21px;
                    text-align: left;

                    br {
                        margin: 4rem 0;
                    }
                }

                p::selection, li::selection {
                    color: var(--nimiq-light-blue);
                    background: var(--nimiq-light-gray);
                }

                hr {
                    width: 100%;
                    opacity: 0.2;
                    height: 1.5px;
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
            gap: 1rem;

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
    background: var(--nimiq-light-blue-bg);

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
                &.loading {
                    cursor: inherit;

                    & ::v-deep svg path {
                        stroke: var(--nimiq-white);

                        &:nth-child(2) {
                            opacity: 0.3;
                        }
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

[data-tour-active] .flash  {
    animation: flash 0.4s;
}

@keyframes flash {
    from { background: var(--nimiq-light-blue-bg); }
    50% { background: radial-gradient(100% 100% at bottom right, hsl(221, 70%, 70%), hsl(202, 95%, 61%)); }
    to { background: var(--nimiq-light-blue-bg); }
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

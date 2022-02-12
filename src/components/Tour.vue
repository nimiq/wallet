<template>
    <div class="tour">
        <v-tour
            name="nimiq-tour"
            :steps="vTourSteps"
            :options="tourOptions"
        >
            <template v-slot="tour">
                <transition name="fade">
                    <v-step
                        class="tooltip"
                        :class="tour.steps[tour.currentStep].params.placement || ''"
                        v-if="showTour && tour.steps[tour.currentStep]"
                        :key="tour.currentStep"
                        :step="tour.steps[tour.currentStep]"
                        :previous-step="tour.previousStep"
                        :next-step="tour.goToNextStep"
                        :stop="tour.stop"
                        :skip="tour.skip"
                        :is-first="tour.isFirst"
                        :is-last="tour.isLast"
                        :labels="tour.labels"
                        role="tooltip"
                        :data-step="tour.currentStep"
                    >
                        <div slot="content" class="content">
                            <div v-for="(content, i) in tour.steps[tour.currentStep].content" :key="i">
                                <!--  Confetti only visible in last tooltip (currentStep === nSteps - 1)
                                        and first paragraph (i === 0) -->
                                <PartyConfettiIcon class="confetti" v-if="currentStep === nSteps - 1 && i === 0" />
                                <hr v-if="content === IContentSpecialItem.HR" />

                                <!--
                                    There are some texts that contains icons within the text or html attribute
                                    like bold.
                                    You can see all the types in the interface at lib/tour/types.ts@IContentSpecialItem.
                                 -->
                                <i18n
                                    v-else-if="new RegExp(
                                            Object.values(IContentSpecialItem).join('|'), 'gmi').test($t(content))"
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
                                    <template v-slot:back_to_addresses>
                                        <b>‘{{$t('Back to addresses')}}’</b>
                                    </template>
                                </i18n>

                                <!-- The content can be a simple string or a list of strings  -->
                                <p v-else-if="typeof content === 'string'">{{ $t(content) }}</p>
                                <ul v-else-if="content.length">
                                    <li v-for="(item, i) in content" :key="i">
                                        <span class="dash">-</span>
                                        <span>{{ $t(item) }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div slot="actions">
                            <!--
                                Inside the tooltip and in large screens, users can control the tour state:
                                Go next, go prev or do custom event
                            -->
                            <div
                                v-if="tour.steps[tour.currentStep].button || isLargeScreen"
                                class="actions"
                            >
                                <button
                                    v-if="currentStep > 0 && isLargeScreen"
                                    @click="goToPrevStep()"
                                    class="left"
                                    tabindex="0"
                                >
                                    <TourPreviousLeftArrowIcon />
                                    {{ $t("Previous") }}
                                </button>
                                <button
                                    class="right" v-if="tour.steps[tour.currentStep].button && !isLoading"
                                    @click="() => tour.steps[tour.currentStep].button.fn(endTour)"
                                    tabindex="0"
                                >
                                    {{ tour.steps[tour.currentStep].button.text }}
                                </button>
                                <button
                                    v-else-if="isLargeScreen && !disableNextStep && !isLoading"
                                    class="right"
                                    @click="goToNextStep()"
                                    tabindex="0"
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
        <transition name="slide-vertical">
            <div class="tour-control-bar" v-if="showTour && (isSmallScreen || isMediumScreen)" role="toolbar">
                <button @click="endTour()" tabindex="0">
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
                        tabindex="0"
                    >
                        <CaretRightSmallIcon />
                    </button>
                    <button
                        class="next"
                        :class="{ loading: isLoading }"
                        :disabled="disableNextStep"
                        @click="!isLoading && goToNextStep()"
                        tabindex="0"
                    >
                        <CaretRightSmallIcon v-if="!isLoading" />
                        <CircleSpinner v-else class="circle-spinner" />
                    </button>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import { useAccountStore } from '@/stores/Account';
import { useNetworkStore } from '@/stores/Network';
import { CaretRightSmallIcon, CircleSpinner } from '@nimiq/vue-components';
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
import { useEventListener } from '../composables/useEventListener';
import { useKeys } from '../composables/useKeys';
import { useWindowSize } from '../composables/useWindowSize';
import {
    getTour, IContentSpecialItem, ITourBroadcast, ITourStep, IUnmountedFn, TourStepIndex,
} from '../lib/tour';
import PartyConfettiIcon from './icons/PartyConfettiIcon.vue';
import TourPreviousLeftArrowIcon from './icons/TourPreviousLeftArrowIcon.vue';
import WorldCheckIcon from './icons/WorldCheckIcon.vue';

Vue.use(VueTour);

require('vue-tour/dist/vue-tour.css');

// Useful functions
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const $ = (s: string) => s ? document.querySelector(s) : undefined;
const $$ = (s: string) => (s ? document.querySelectorAll(s) : []) as HTMLElement[];
const selectorsToElements = (selectors: string[]) => selectors.map($).filter(Boolean) as Element[];

/**
 * Lifecycle of the step in the tour:
 * Every time the tour changes step the tour logic go through a lifecycle. The lifecycle will be run in two ways:
 * _moveToFutureStep and _tourSetup. This is the algorithm:
 * 1. If we are in _moveToFutureStep function, then stop tour and run unmounted function.
 *      - unmounted(): It will reset the page as it was before the step started. Examples: removing event listeners,
 *        removing CSS classes, etc. This function is only called in _moveToFutureStep
 * 2. created(): It will prepare the page for the futureStep. This is mainly, running logic from the stores retrieving
 *    data or setting the configuration needed. This will run before any DOM manipulation.
 * 3. Each step needs to be in a specific page. If this condition is not met, then we change the route.
 * 4. Update UI. This will go through the different selector removing opacity, disabling interaction, disabling
 *    buttons... See more at lib/tour/types.ts@ITourStep["ui"]. This also includes removing all the UI changes
 *    from the previous step.
 * 5. mounted(): It will update the DOM with the custom changes the step needs and custom code that needs to run
 *    in that step.
 *
 */

export default defineComponent({
    name: 'nimiq-tour',
    setup(props, context) {
        const { isSmallScreen, isMediumScreen, isLargeScreen } = useWindowSize();

        const { state: $network } = useNetworkStore();
        const disconnected = computed(() => $network.consensus !== 'established');

        const { state: accountStore, setTour } = useAccountStore();

        let tour: VueTour.Tour | null = null;

        // see more options at
        // https://github.com/pulsardev/vue-tour/blob/6ee85afdae3a4cb8689959b3b0c2035e165072fa/src/shared/constants.js
        const tourOptions: any = {
            useKeyboardNavigation: false, // handled by us
        };

        // Initial state
        const steps: Ref<ITourStep[]> = ref([]);
        setTourAsArray();

        const isLoading = ref(true);
        const currentStep: Ref<TourStepIndex> = ref(0);
        const nSteps: Ref<number> = ref(steps.value.length);
        const disableNextStep = ref(true);
        const showTour = ref(false);

        let unmounted: IUnmountedFn | void;

        // Tour events
        useEventListener(window, 'click', _onUserClicked);
        useEventListener(window, 'resize', _onResize());
        useKeys([
            { key: 'ArrowRight', handler: goToNextStep, options: { ignoreIf: disableNextStep } },
            { key: 'ArrowLeft', handler: goToPrevStep },
            { key: 'Escape', handler: endTour },
        ]);
        _receiveEvents();

        onMounted(async () => {
            await _tourSetup();
        });

        onUnmounted(() => endTour());

        // Prepares the tour for the first time. Similar to _moveToFutureStep(). See more details
        // in the coments after the imports section
        async function _tourSetup() {
            // Activates tour mode
            const app = $('#app');
            app!.setAttribute('data-tour-active', '');

            await context.root.$nextTick(); // to ensure DOM is ready

            const step = steps.value[currentStep.value];
            if (!step) return;

            // Update state
            disableNextStep.value = currentStep.value >= nSteps.value - 1 || !!step.ui.isNextStepDisabled;

            if (step.lifecycle?.created) {
                await step.lifecycle.created({ goToNextStep, goingForward: true });
            }

            // If we are not currently in the correct path then we need to change the route
            if (context.root.$route.fullPath !== step.path) {
                context.root.$router.push(step.path);
                await context.root.$nextTick();
            }

            // Update UI
            _updateUI(step.ui, currentStep.value);
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

            // We run this function twice just to make sure we can make the proper changes
            _updateUI(step.ui, currentStep.value);

            showTour.value = true;
            tour = context.root.$tours['nimiq-tour'];
            tour.start(`${currentStep.value}`);
            await context.root.$nextTick();
            _changeArrowAppearance(currentStep.value);

            isLoading.value = false;

            // emit changes to large screen tour manager
            _broadcast({
                type: 'tour-step-changed',
                payload: {
                    currentStep: currentStep.value,
                    nSteps: nSteps.value,
                },
            });
        }

        watch([isLoading, disconnected], async () => {
            // After the page is loaded, if the user has not txs, onboarding tour needs to disable
            // buttons so the user cannot click on them.
            // FIXME we should wait until the buttons are rendered and the we could
            // execute _toggleDisabledButtons but it is kind of random the amount of time
            // it takes to render the button. I don't know how to fix it. Waiting 500ms works.
            await sleep(500);
            _toggleDisabledButtons(steps.value[currentStep.value]?.ui.disabledButtons, true);
        });

        function goToPrevStep() {
            if (currentStep.value <= 0 || disconnected.value || isLoading.value) return;
            _moveToFutureStep(currentStep.value, currentStep.value - 1, false);
        }

        function goToNextStep() {
            if (currentStep.value + 1 >= nSteps.value || disconnected.value || isLoading.value) return;
            _moveToFutureStep(currentStep.value, currentStep.value + 1, true);
        }

        // for more details, read Lifecycle steps section right below imports of this file
        async function _moveToFutureStep(
            currentStepIndex: TourStepIndex,
            newStepIndex: TourStepIndex,
            goingForward: boolean,
        ) {
            const { path: currentPath } = steps.value[currentStepIndex]!;
            const { path: newPath, ui: newUI, lifecycle: newLifecycle } = steps.value[newStepIndex]!;

            tour!.stop();
            await sleep(500); // ensures animation ends

            if (unmounted) {
                await unmounted({ goingForward, ending: false });
            }

            // created
            await newLifecycle?.created?.({ goToNextStep, goingForward });

            if (newPath !== currentPath && context.root.$route.fullPath !== newPath) {
                context.root.$router.push(newPath);
                await context.root.$nextTick();
            }

            _toggleDisabledButtons(steps.value[currentStepIndex].ui.disabledButtons, false);
            _updateUI(newUI, newStepIndex);
            await context.root.$nextTick();

            if (newPath !== currentPath) {
                await sleep(500);
            }

            _removeUIFromOldStep(currentStepIndex);

            tour!.start(newStepIndex.toString());
            await context.root.$nextTick();
            _changeArrowAppearance(newStepIndex);

            // some steps may not allow the user to go to the next step unless they click on a specific button
            disableNextStep.value = newStepIndex >= nSteps.value - 1 || !!newUI.isNextStepDisabled;

            unmounted = await newLifecycle?.mounted?.({
                goToNextStep,
                goingForward,
                ending: false,
            });

            currentStep.value = newStepIndex;

            // emit changes to large screen tour manager
            _broadcast({
                type: 'tour-step-changed',
                payload: {
                    currentStep: currentStep.value,
                    nSteps: nSteps.value,
                },
            });
        }

        function _broadcast(data: ITourBroadcast) {
            // Send data to TourLargeScreenManager via root instance
            context.root.$emit('nimiq-tour-event', data);
        }

        function _receiveEvents() {
            // events emitted by TourLargeScreenManager via root instance
            context.root.$on('nimiq-tour-event', (data: ITourBroadcast) => {
                if (data.type === 'end-tour') endTour(false);
            });
        }

        // The user is only allow to click in certain elements depending on the current step
        // If user clicks in an element that is not allowed, we need to flash the tour bar
        // or tour manager
        function _onUserClicked({ target }: MouseEvent) {
            // This are the elements that are allowed to be clicked always
            const tourInteractableElements = ['.tour', '.tour-manager', '.tooltip'];

            // This are the elements that are allowed to be clicked only in current step
            const stepInteractableElements = steps.value[currentStep.value]?.ui.explicitInteractableElements || [];

            const interactableElements = tourInteractableElements.concat(stepInteractableElements)
                .map((s) => $(s)).filter((e) => !!e) as HTMLElement[];

            // If the user clicked on an element that is not in the list of interactable elements nor
            // is a children of one of the interactable elementsf
            if (interactableElements.every((el) => !el.contains(target as Node))) {
                _broadcast({ type: 'clicked-outside-tour' });

                const tourManager = $('.tour-control-bar');
                if (tourManager) {
                    tourManager.classList.add('flash');
                    setTimeout(() => {
                        tourManager.classList.remove('flash');
                    }, 400);
                }
            }
        }

        // This function will add or remove disabled attribute to the given selectors.
        // If the element contains a nimiq-button class with a color, these will be temporally
        // removed
        let _buttonNimClasses: {[x:string]: string} = {};
        function _toggleDisabledButtons(disabledButtons: ITourStep['ui']['disabledButtons'], disabled:boolean) {
            if (!disabledButtons) return;

            // Classes that contains these words, have to be removed while the tour is shown
            const btnNimiqClasses = ['light-blue', 'green', 'orange', 'red', 'gold'];
            (disabledButtons
                .map((s) => ({ selector: s, el: $(s) }))
                .filter(({ el }) => Boolean(el)) as { selector: string, el: HTMLButtonElement }[])
                .forEach(({ selector, el }) => {
                    el.disabled = disabled;
                    for (const className of el.classList.values() ?? []) {
                        if (disabled && btnNimiqClasses.includes(className)) {
                            el.classList.remove(className);
                            _buttonNimClasses[selector] = className;
                        }
                    }
                });

            if (!disabled) {
                Object.keys(_buttonNimClasses).forEach((el) => {
                    const btn = $(el) as HTMLButtonElement;
                    if (!btn) return;
                    btn.classList.add(_buttonNimClasses[el]);
                });
                _buttonNimClasses = {};
            }
        }

        // Add the specific changes that the new step needs. This will be done with data-attributes
        // as they allow to use an index which will be used to identify the step so adding and removing
        // them is easier
        function _updateUI(
            uiConfig: ITourStep['ui'],
            stepIndex: TourStepIndex,
        ) {
            const fadedElements = uiConfig.fadedElements || [];
            const disabledElements = uiConfig.disabledElements || [];
            const scrollLockedElements = uiConfig.scrollLockedElements || [];
            const interactableElements = uiConfig.explicitInteractableElements || [];

            const setAttribute = (el: Element, name: `data-${string}`) => el.setAttribute(name, `${stepIndex}`);

            selectorsToElements(disabledElements).forEach((el) => setAttribute(el, 'data-non-interactable'));
            selectorsToElements(interactableElements).forEach((el) => setAttribute(el, 'data-explicit-interactable'));
            selectorsToElements(fadedElements).forEach((el) => {
                setAttribute(el, 'data-opacified');
                setAttribute(el, 'data-non-interactable');
            });
            selectorsToElements(scrollLockedElements).forEach((el) => {
                setAttribute(el, 'data-scroll-locked');

                // Avoid scrolling when tooltip is instantiated
                el.addEventListener('scroll', _onScrollInLockedElement);
                el.scrollTop = 0;
            });

            _toggleDisabledButtons(uiConfig.disabledButtons, true);
        }

        // remove UI changes from old step using the oldIndex
        function _removeUIFromOldStep(stepIndex: TourStepIndex) {
            $$(`[data-non-interactable="${stepIndex}"]`).forEach((el) => el.removeAttribute('data-non-interactable'));

            $$(`[data-opacified="${stepIndex}"]`).forEach((el) => el.removeAttribute('data-opacified'));

            $$(`[data-scroll-locked="${stepIndex}"]`).forEach((el) => {
                el.removeAttribute('data-scroll-locked');
                el.removeEventListener('scroll', _onScrollInLockedElement);
            });

            $$(`[data-explicit-interactable="${stepIndex}"]`).forEach((el) => {
                el.removeAttribute('data-explicit-interactable');
            });
        }

        // nofifyManager - if true will notify the manager that the tour has ended
        // soft - when user resizes, we are calling endTour() because it is easier to restore
        // the state of the tour than to recreate it. soft flag will allow us to do that without completely
        // destroying the tour
        async function endTour(notifyManager = true, soft = false) {
            if (unmounted) {
                await unmounted({ ending: true, goingForward: false });
            }

            if (notifyManager) {
                _broadcast({ type: 'end-tour' });
                await context.root.$nextTick();
            }

            const app = $('#app') as HTMLDivElement;
            app.removeAttribute('data-tour-active');
            app.querySelector('main')!.removeAttribute('data-non-interactable');

            if (tour && !soft) {
                showTour.value = false; // This way, we can trigger the animation as v-step will be removed
            }

            if (!soft) {
                // wait until longest leave transition finishes
                await sleep(1150);
            }

            // Update UI
            _removeUIFromOldStep(currentStep.value);

            if (!soft) {
                setTour(null);
            }
        }

        // User will not be allow to scroll due to the pointer-events: none
        // This function is just a workaround to avoid the scrolling on certain elements
        // due to popper library. Probably there is a cleaner way to do this using popper
        // propper config
        function _onScrollInLockedElement(e: Event) {
            e.preventDefault();
            const target = e.target as HTMLElement;
            if ((target as HTMLElement).scrollTop) {
                target.scrollTop = 0;
            }
        }

        function _onResize() {
            let timer: ReturnType<typeof setTimeout> | null = null;

            // 0: small screen, 1: medium screen, 2: large screen
            const screenType = () => [isSmallScreen.value, isMediumScreen.value, isLargeScreen.value].indexOf(true);
            let oldScreen = screenType();

            // We only want to change the state when the type of screen has changed
            return () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    // If the type of screen changes, then we count it as resize
                    const newScreen = screenType();

                    if (oldScreen !== newScreen) {
                        _screenTypeChanged();
                        oldScreen = screenType();
                    }
                }, 100);
            };
        }

        // If the screen type has changed, we need to update the tour. There might be different
        // steps for different screen sizes, so that is why we need to update the steps as well
        async function _screenTypeChanged() {
            tour!.stop();

            setTourAsArray();

            // end tour sofly and start it again
            await endTour(false, true);
            _tourSetup();
        }

        // vue-tour library does not have an arrow slot for custom arrows, therefore we need to
        // update it manually with JS
        const arrowSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 9" xml:space="preserve">
            <path d="M3.3 7.2A4 4 0 0 1 0 9h18a4 4 0 0 1-3.3-1.8L10.3.8c-.6-.9-1.9-.9-2.5 0L3.3 7.2z"/>
        </svg>`;
        function _changeArrowAppearance(stepIndex: TourStepIndex) {
            // It has been detected that some slower devices are not able to render the arrow
            // in time, therefore we need to wait until the arrow is rendered and try a few times
            Array.from({ length: 10 }).forEach((_, i) => {
                setTimeout(() => {
                    const arrow = $(
                        `[data-step="${stepIndex}"] [data-popper-arrow]`) as HTMLDivElement;
                    if (!arrow) return;
                    arrow.innerHTML = arrowSvg;
                    arrow.style.visibility = 'initial';
                    arrow.style.width = '2rem';
                }, 100 * (i + 1));
            });
        }

        function setTourAsArray() {
            steps.value = getTour(accountStore.tour?.name, context, { isSmallScreen, isMediumScreen, isLargeScreen });
        }

        return {
            isSmallScreen,
            isMediumScreen,
            isLargeScreen,
            IContentSpecialItem,

            // tour
            tourOptions,
            vTourSteps: computed(() => steps.value.map((s) => s.tooltip)),
            showTour,

            // control bar
            currentStep,
            nSteps,
            isLoading: computed(() => disconnected.value || isLoading.value),
            disableNextStep,

            // actions
            goToPrevStep,
            goToNextStep,
            endTour,

            // We need to expose this function so that we can call it from the steps.
            // In particular /lib/tour/onboarding/06_0_BackupAlertStep.ts
            setTourAsArray,
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
// updated as data attributes allow to use a value like [data-opaified="1"] to select ceratain elements
// as well as [data-opacified] to all elements with this attribute. @see _removeUIFromOldStep

#app[data-tour-active] [data-opacified],
#app[data-tour-active] ~ div [data-opacified] {
  filter: opacity(0.3);
}

#app[data-tour-active] [data-non-interactable],
#app[data-tour-active] [data-non-interactable] *,
// Select also modals which are not children of #app but siblings
#app[data-tour-active] ~ div [data-non-interactable],
#app[data-tour-active] ~ div [data-non-interactable] *
{
    user-select: none !important;
    pointer-events: none !important;
    cursor: not-allowed;
}

#app[data-tour-active] [data-scroll-locked],
#app[data-tour-active] [data-scroll-locked] * {
    overflow: hidden;
}

#app[data-tour-active] [data-explicit-interactable],
#app[data-tour-active] [data-explicit-interactable] * {
    pointer-events: initial !important;
    cursor: pointer;
}

// Custom background colors for ceratin buttons. Made for onboarding tour.
#app[data-tour-active] button.green-highlight {
    background: linear-gradient(
            274.28deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 27.6%, rgba(255, 255, 255, 0) 53.12%,
            rgba(255, 255, 255, 0.2) 81.25%, rgba(255, 255, 255, 0) 100%
        ), var(--nimiq-green-bg) !important;
    background-blend-mode: hard-light, normal !important;
}

#app[data-tour-active] button.gray-highlight {
    background: linear-gradient(
            274.28deg, rgba(31, 35, 72, 0) 0%, rgba(31, 35, 72, 0.07) 27.6%, rgba(31, 35, 72, 0) 53.12%,
            rgba(31, 35, 72, 0.07) 81.25%, rgba(31, 35, 72, 0) 100%) !important;
    background-blend-mode: hard-light, normal !important;
}

#app[data-tour-active] button.orange-highlight {
    background: linear-gradient(274.28deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 27.6%,
            rgba(255, 255, 255, 0) 53.12%, rgba(255, 255, 255, 0.2) 81.25%,
            rgba(255, 255, 255, 0) 100%),
            var(--nimiq-orange-bg) !important;
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

                ::v-deep svg.confetti {
                    float: left;
                    margin-right: 2rem;
                    margin-top: -5px;
                }

                ::v-deep svg:not(.confetti) {
                    margin: 0 .25rem;
                    height: 2.25rem;
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
                border: 1px solid transparent;

                &.right:focus {
                    border: 1px solid #ffffff55;
                }

                &.left:focus {
                    opacity: 1;
                }

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
            background: transparent;
        }

        ::v-deep .v-step__arrow::before {
            display: none;
        }

        &[data-popper-placement^="top"] ::v-deep .v-step__arrow {
            display: flex;
            bottom: -9px;
        }

        &[data-popper-placement^="top"] ::v-deep .v-step__arrow svg {
            transform: rotate(180deg);
        }

        &[data-popper-placement^="right"] ::v-deep .v-step__arrow svg {
            transform: rotate(-90deg);
            transform-origin: 0 37%;
        }

        &[data-popper-placement^="bottom"] ::v-deep .v-step__arrow {
            display: flex;
            top: -9px;
        }

        &[data-popper-placement^="left"] ::v-deep .v-step__arrow svg {
            transform: rotate(90deg);
            transform-origin: 100% 30%;
        }

        // Designs use one gradient for tooltip. In the HTML, we are using two different elements
        // and to achieve the gradient effect in the arrow, we color the arrow with a propper value
        // depending on the placement of the tooltip
        &[data-popper-placement="top-start"] ::v-deep .v-step__arrow svg path {
            fill: #087dcb;
        }

        &[data-popper-placement="top"] ::v-deep .v-step__arrow svg path {
            fill: #1570d1;
        }

        &[data-popper-placement="top-end"] ::v-deep .v-step__arrow svg path {
            fill: #2163d5;
        }

        &[data-popper-placement="right-start"] ::v-deep .v-step__arrow svg path {
            fill: #0582ca;
        }

        &[data-popper-placement="right"] ::v-deep .v-step__arrow svg path {
            fill: #0582ca;
        }

        &[data-popper-placement="right-end"] ::v-deep .v-step__arrow svg path {
            fill: #0582ca;
        }

        &[data-popper-placement="bottom-start"] ::v-deep .v-step__arrow svg path {
            fill: #0582ca;
        }

        &[data-popper-placement="bottom"] ::v-deep .v-step__arrow svg path {
            fill: #0582ca;
        }

        &[data-popper-placement="bottom-end"] ::v-deep .v-step__arrow svg path {
            fill: #0681ca;
        }

        &[data-popper-placement="left-start"] ::v-deep .v-step__arrow svg path {
            fill: #0e78cd;
        }

        &[data-popper-placement="left"] ::v-deep .v-step__arrow svg path {
            fill: #1670d0;
        }

        &[data-popper-placement="left-end"] ::v-deep .v-step__arrow svg path {
            fill: #0582ca;
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

            &.next.loading {
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

.slide-vertical-enter-active {
    animation: slidevertical 0.4s var(--nimiq-ease);
    animation-delay: 0.6s;
    bottom: -56px;
    transform: scale(0.8);
}

.slide-vertical-leave-active {
    animation: slidevertical 0.4s var(--nimiq-ease) reverse;
    animation-delay: 0.75s;
}

@keyframes slidevertical {
    from { bottom: -56px; transform: scale(0.8); }
    60% { bottom: 10px; transform: scale(0.8); }
    75% { bottom: 10px; transform: scale(0.8); }
    to { bottom: 10px; transform: scale(1); }
}
</style>

<template>
    <div class="tour">
        <v-tour
            name="nimiq-tour"
            :steps="Object.values(steps).map((s) => s.tooltip)"
        >
            <template slot-scope="tour">
                <transition name="fade">
                    <v-step
                        class="tooltip-step"
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
                            <p
                                v-for="(content, i) in tour.steps[tour.currentStep].content"
                                :key="i"
                                v-html="$t(content)"
                            ></p>
                            <!-- TODO REMOVE ME -->
                            <div class="remove_me" v-if="currentStep === 1" @click="simulate()">
                                Simulate Receive NIM
                            </div>
                        </div>
                        <div slot="actions" class="actions">
                            <button @click="tour.previousStep" v-if="!isMobile">
                                {{ $t("Previous step") }}
                            </button>
                            <button class="right" @click="tour.steps[tour.currentStep].button.fn()"
                                v-if="tour.steps[tour.currentStep].button">
                                {{ $t(tour.steps[tour.currentStep].button.text) }}
                            </button>
                            <button class="right" @click="tour.goToNextStep"
                                v-else-if="!isMobile">
                                {{ $t("Next step") }}
                            </button>
                        </div>
                    </v-step>
                </transition>
            </template>
        </v-tour>
        <transition name="fade">
            <div class="tour-control-bar" v-if="isMobile">
                <button @click="endTour()">
                    {{ $t("End Tour") }}
                </button>
                <span class="progress">
                    {{ currentStep + 1 }} / {{ nSteps }}
                </span>
                <div class="arrows">
                    <button
                        class="prev"
                        :class="{
                            hidden: currentStep === 0,
                        }"
                        v-if="!loading"
                        @click="goToPrevStep()"
                        style="transform: rotate(180deg)"
                    >
                        <CaretRightIcon />
                    </button>
                    <button
                        class="next"
                        :class="{ loading }"
                        :disabled="disableNextStep"
                        @click="!loading && goToNextStep()"
                    >
                        <CaretRightIcon v-if="!loading" />
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
import { TourStep, TourStepIndex, TourSteps, useFakeTx, useTour } from '../composables/useTour';
import { useWindowSize } from '../composables/useWindowSize';
import CaretRightIcon from './icons/CaretRightIcon.vue';

Vue.use(VueTour);

require('vue-tour/dist/vue-tour.css');

export default defineComponent({
    name: 'tour',
    setup(props, context) {
        // TODO Use isMobile
        const { width } = useWindowSize();

        const { state: $network } = useNetworkStore();
        const disconnected = computed(
            () => $network.consensus !== 'established',
        );

        const { state: tourStore, setTour } = useAccountStore();

        let tour: VueTour.Tour | null = null;
        const steps: TourSteps<any> = useTour(tourStore.tour, context) || {};

        // Initial state
        const loading = ref(true);
        const currentStep: Ref<TourStepIndex> = ref(0);
        const nSteps: Ref<number> = ref(0);
        const disableNextStep = ref(true);

        let unmounted: (
            (args?: { goingForward: boolean, ending?: boolean }) => Promise<null>)
            | Promise<null>
            | ((args?: { goingForward: boolean, ending?: boolean }) => null)
            | null = null;

        onMounted(() => {
            tourSetup();

            // REMOVE ME
            const { removeTransactions } = useTransactionsStore();
            removeTransactions([useFakeTx()]);
        });

        async function tourSetup() {
            await context.root.$nextTick(); // to ensure the DOM is ready

            // Update state
            nSteps.value = Object.keys(steps).length;
            disableNextStep.value = currentStep.value >= nSteps.value - 1
                || !!steps[currentStep.value].ui.isNextStepDisabled;

            if (steps[currentStep.value].lifecycle?.created) {
                await steps[currentStep.value].lifecycle!.created!({ goToNextStep, goingForward: true });
            }

            _addAttributes(steps[currentStep.value].ui, currentStep.value);

            if (steps[currentStep.value].lifecycle?.mounted) {
                unmounted = await steps[currentStep.value].lifecycle!.mounted!({ goToNextStep, goingForward: true });
            }

            if (context.root.$route.path !== steps[currentStep.value].path) {
                context.root.$router.push(steps[currentStep.value].path);
            }

            await sleep(500);

            tour = context.root.$tours['nimiq-tour'];
            tour!.start(`${currentStep.value}`);
            loading.value = false;
        }

        // Dont allow user to interact with the page while it is loading
        // But allow to end it
        watch([loading, disconnected], () => {
            const app = document.querySelector('#app main') as HTMLDivElement;

            if (loading.value || disconnected.value) {
                app!.setAttribute('data-non-interactable', '');
            } else {
                app!.removeAttribute('data-non-interactable');
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
            const goingForward = futureStepIndex > currentStepIndex;

            const { path: currentPage } = steps[currentStepIndex];
            const { path: futurePage, ui: futureUI, lifecycle: futureLifecycle } = steps[futureStepIndex];

            loading.value = true;
            tour!.stop();

            if (unmounted) {
                await (await unmounted)!({ goingForward });
            }

            if (futureLifecycle?.created) {
                await (futureLifecycle.created!)({ goToNextStep, goingForward });
            }

            if (futurePage !== currentPage && context.root.$route.fullPath !== futurePage) {
                try {
                    // Default prepare DOM
                    context.root.$router.push(futurePage);
                    await context.root.$nextTick();
                } catch {
                    // Ignore error
                }
            }

            _addAttributes(futureUI, futureStepIndex);

            if (futurePage !== currentPage) {
                await sleep(500);
            }

            _removeAttributes(currentStepIndex);

            tour!.start(futureStepIndex.toString());

            // FIXME Instead of doing tour!.end and tour!.start, we could also use .nextStep() or previsousStep()
            // The problem with this solution is that some animations glitch the UI so it needs further
            // investigation
            // goingForward ? tour!.nextStep() : tour!.previousStep();

            // onMountedStep
            loading.value = false;
            disableNextStep.value = futureStepIndex >= nSteps.value - 1 || !!futureUI.isNextStepDisabled;

            if (futureLifecycle?.mounted) {
                unmounted = await futureLifecycle!.mounted!({ goToNextStep, goingForward });
            } else {
                unmounted = null;
            }

            currentStep.value = futureStepIndex;
        }

        function _addAttributes(uiConfig: TourStep['ui'], stepIndex: TourStepIndex) {
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
            document.querySelectorAll(`[data-non-interactable="${stepIndex}"]`).forEach((el) => {
                el.removeAttribute('data-non-interactable');
            });

            document.querySelectorAll(`[data-opacified="${stepIndex}"]`).forEach((el) => {
                el.removeAttribute('data-opacified');
            });
        }

        async function endTour() {
            _removeAttributes(currentStep.value);

            if (unmounted) {
                await (await unmounted)!({ ending: true, goingForward: false });
            }

            // If user finalizes tour while it is loading, allow interaction again
            const app = document.querySelector('#app main') as HTMLDivElement;
            app.removeAttribute('data-non-interactable');

            setTour(null);
        }

        // TODO REMOVE ME - Simulate tx
        function simulate() {
            const { addTransactions } = useTransactionsStore();
            addTransactions([useFakeTx()]);
            goToNextStep();
        }

        return {
            steps,
            isMobile: width.value < 700,

            // control bar
            currentStep,
            nSteps,
            loading: disconnected || loading,
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

[data-non-interactable], [data-non-interactable] * {
    user-select: none !important;
    pointer-events: none !important;
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
    }

    .tooltip-step {
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

                &.right {
                    margin-left: auto;
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
    width: clamp(200px, 75vw, calc(100vw - 2rem));
    padding: 1rem;
    border-radius: 9999px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;
    z-index: 6;

    // TODO Cannot use CSS variables here
    background: radial-gradient(
        100% 100% at 100% 100%,
        #265dd7 0%,
        #0582ca 100%
    );

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

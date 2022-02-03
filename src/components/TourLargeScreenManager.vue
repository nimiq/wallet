<template>
    <div class="tour-manager" ref="$originalManager">
        <p>
            {{$t('Use the tooltips to navigate your tour.')}}
        </p>
        <div>
            <span class="progress" v-if="currentStep >= 0 && nSteps > 0">
                {{ currentStep + 1 }} / {{ nSteps }}
            </span>
            <button @click="() => endTour()">End tour</button>
        </div>
    </div>
</template>

<script lang="ts">
import { ITourBroadcast, ITourBroadcastStepChanged, TourStepIndex, IWalletHTMLElements } from '@/lib/tour';
import { defineComponent, onMounted, onUnmounted, Ref, ref } from '@vue/composition-api';

export default defineComponent({
    name: 'tour-large-screen-manager',
    setup(props, context) {
        const nSteps: Ref<number> = ref(-1);
        const currentStep:Ref<TourStepIndex> = ref(-1);

        const $originalManager = ref<HTMLDivElement>(null);
        onMounted(() => {
            const tourManager = document.querySelector('.tour-manager') as HTMLDivElement;
            if (tourManager) {
                tourManager.style.maxHeight = '150px';
            }
            _checkIfModalIsOpen();

            context.root.$on('nimiq-tour-event', (data: ITourBroadcast) => {
                // TODO The event should be triggered also when resizing the window
                if (data.type === 'tour-step-changed') _stepChanged(data.payload);
                if (data.type === 'clicked-outside-tour') _flash();
            });
        });

        onUnmounted(() => _removeClonedManager());

        async function _stepChanged(
            { nSteps: newNSteps, currentStep: newCurrentStep }:ITourBroadcastStepChanged['payload']) {
            nSteps.value = newNSteps;
            currentStep.value = newCurrentStep;

            await context.root.$nextTick();

            _checkIfModalIsOpen();
        }

        function _checkIfModalIsOpen() {
            const modalIsOpen = document.querySelector(IWalletHTMLElements.MODAL_CONTAINER) !== null;
            if (modalIsOpen) {
                _duplicateManager();
            } else {
                _removeClonedManager();
            }
        }

        function _removeClonedManager() {
            const tourManager = document.querySelector('body > .tour-manager');
            if (tourManager) {
                tourManager.remove();
            }
            const original = $originalManager.value!;
            if (!original) return;
            original.style.visibility = 'initial';
        }

        // at some steps, a modal will be openened in the tour and we still need to show the tour
        // manager to the user, therefore, we need to duplicate the manager and set it to the body
        // positionated over the modal
        function _duplicateManager() {
            _removeClonedManager();
            const original = $originalManager.value!;
            if (!original) return;

            original.style.visibility = 'hidden';

            const manager = original.cloneNode(true) as HTMLDivElement;

            if (!manager) {
                return;
            }

            manager.style.position = 'absolute';
            manager.style.top = `${original.offsetTop}px`;
            manager.style.left = `${original.offsetLeft}px`;
            manager.style.width = `${original.offsetWidth}px`;
            manager.style.height = `${original.offsetHeight}px`;
            manager.style.visibility = 'inherit';
            manager.style.zIndex = '10';
            document.body.appendChild(manager);

            manager.querySelector('button')!.addEventListener('click', () => endTour());
        }

        function endTour() {
            _removeClonedManager();
            context.root.$emit('nimiq-tour-event', { type: 'end-tour' } as ITourBroadcast);
        }

        function _flash() {
            const tourManager = document.querySelector('[data-tour-active] .tour-manager');
            if (tourManager) {
                tourManager.classList.add('flash');
                setTimeout(() => {
                    tourManager.classList.remove('flash');
                }, 400);
            }
        }

        return {
            nSteps,
            currentStep,
            endTour,
            $originalManager,
        };
    },
});
</script>

<style lang="scss" scoped>
.tour-manager {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-height: 0;
    background-color: rgba(255, 255, 255, 0.12); // TODO This should be var(--text-12)
    transition-property: background-color 0.4s ease-in-out;
    transition: max-height 0.15s ease-in-out;
    border-radius: 4px;
    font-family: Mulish, Muli, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;

    p {
        margin: 0;
        font-size: 18px;
        line-height: 26px;
        color: var(--nimiq-white);
        padding: 12px;
        padding-bottom: 0;
    }

    > div {
        display: flex;
        align-items: baseline;
        width: 100%;
        padding: 12px;
        padding-top: 0;

        .progress {
            opacity: 0.7;
            color: var(--nimiq-white);
            white-space: nowrap;
            text-align: center;
            font-size: 14px;
            letter-spacing: -0.4px;
            font-variant-numeric: tabular-nums;
        }

        button {
            margin-left: auto;
            padding: 8px 12px;
            color: var(--nimiq-white);
            background-color: rgba(255, 255, 255, 0.2); // TODO Move to a variable??
            border: none;
            cursor: pointer !important;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
        }
    }

}
.flash  {
    animation: flash 0.4s;
}

@keyframes flash {
    from { background: rgba(255, 255, 255, 0.12); } // TODO This should be var(--text-12)
    50% { background: rgba(255, 255, 255, 0.30); } // TODO This should be var(--text-30)
    to { background: rgba(255, 255, 255, 0.12); } // TODO This should be var(--text-12)
}
</style>

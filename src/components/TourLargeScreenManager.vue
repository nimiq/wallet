<template>
    <div v-if="isLargeScreen && isTourActive" class="tour-manager" ref="$originalManager">
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
import { useWindowSize } from '@/composables/useWindowSize';
import { TourBroadcast, TourBroadcastStepChanged, TourStepIndex, WalletHTMLElements } from '@/lib/tour';
import { useAccountStore } from '@/stores/Account';
import { computed, defineComponent, onMounted, Ref, ref } from '@vue/composition-api';

export default defineComponent({
    name: 'tour-large-screen-manager',
    setup(props, context) {
        const { isLargeScreen } = useWindowSize();

        const { state: accountState } = useAccountStore();
        const isTourActive = computed(() => accountState.tour !== null);

        const nSteps: Ref<number> = ref(-1);
        const currentStep:Ref<TourStepIndex> = ref(-1);

        const $originalManager = ref<HTMLDivElement>(null);
        onMounted(() => {
            context.root.$on('nimiq-tour-event', (data: TourBroadcast) => {
                if (data.type === 'tour-step-changed') stepChanged(data.payload);
            });
        });

        function stepChanged({ nSteps: newNSteps, currentStep: newCurrentStep }:TourBroadcastStepChanged['payload']) {
            nSteps.value = newNSteps;
            currentStep.value = newCurrentStep;
            if (!isLargeScreen.value) return;

            const modalIsOpen = document.querySelector(WalletHTMLElements.MODAL_CONTAINER) !== null;
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
            // manager.style.top = `${original.offsetTop}px`; // FIXME: it is getting 114px instead of 98px
            manager.style.top = '98px';
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
            context.root.$emit('nimiq-tour-event', { type: 'end-tour' } as TourBroadcast);
        }

        return {
            isTourActive,
            isLargeScreen,
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
    margin: 2rem 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 2rem;
    background-color: rgba(255, 255, 255, 0.12); // TODO Move to a variable??
    border-radius: 4px;
    cursor: initial !important;

    p {
        margin: 0;
        font-size: 18px;
        line-height: 26px;
        color: var(--nimiq-white);
    }

    div {
        display: flex;
        align-items: baseline;
        width: 100%;

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
            cursor: pointer;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
        }
    }
}
</style>

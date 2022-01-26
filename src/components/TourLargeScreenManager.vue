<template>
    <div v-if="isFullDesktop && isTourActive" class="tour-manager" ref="$originalManager">
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
import { TourDataBroadcast } from '@/lib/tour';
import { useAccountStore } from '@/stores/Account';
import { computed, defineComponent, onMounted, ref, watch } from '@vue/composition-api';

export default defineComponent({
    setup(props, context) {
        const { isFullDesktop } = useWindowSize();

        const { state: accountState } = useAccountStore();
        const isTourActive = computed(() => accountState.tour !== null);

        const nSteps = ref(-1);
        const currentStep = ref(-1);

        context.root.$on('tour-data', (tourData: TourDataBroadcast) => {
            nSteps.value = tourData.nSteps;
            currentStep.value = tourData.currentStep;
        });

        const $originalManager = ref<HTMLDivElement>(null);
        onMounted(() => {
            // duplicateManager();
        });

        watch([nSteps, currentStep], () => {
            // duplicateManager();
        });

        function duplicateManager() {
            const tourManager = document.querySelector('body > .tour-manager');
            if (tourManager) {
                tourManager.remove();
            }
            const original = $originalManager.value!;
            if (!original) return;

            document.querySelector('.sidebar')!.removeAttribute('data-non-interactable');
            const manager = original.cloneNode(true) as HTMLDivElement;
            document.querySelector('.sidebar')!.setAttribute('data-non-interactable', '5');

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
        }

        function endTour() {
            context.root.$emit('tour-end');
        }

        return {
            isTourActive,
            isFullDesktop,
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
    // background-color: rgba(255, 255, 255, 0.12);#3a3d5e // TODO Move to a variable??
    background-color: #3a3d5e; // TODO Check this
    border-radius: 4px;

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
            font-size: 13px;
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

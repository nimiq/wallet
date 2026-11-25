<template>
    <div class="slider-toggle" :class="[`type-${type}`, { 'no-transition': noTransitions, loading }]" ref="root$">
        <!-- Loading state -->
        <label v-if="loading"> <LoadingSpinner />Loading </label>
        <template v-else>
            <!-- Active box that moves and changes width based on the selected slot -->
            <div
                class="active-box"
                ref="activeBox$"
                :style="{
                    '--center': `${activeBoxStyles.center}px`,
                    '--width': `${activeBoxStyles.width}px`,
                }"
            ></div>
            <!-- Slot buttons -->
            <label
                v-for="(slot, index) in Object.keys($slots)"
                ref="labels$"
                :key="index"
                :class="{ active: localValue === slot }"
            >
                <input type="radio" :name="name" :value="slot" v-model="localValue" />
                <slot :name="slot"></slot>
            </label>
        </template>
    </div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { nextTick } from '@/lib/nextTick';
import LoadingSpinner from './LoadingSpinner.vue';

export interface SliderToggleRadio {
    label: string;
    value: string;
}

export enum SliderToggleType {
    CURRENCY = 'currency',
    DEFAULT = 'default',
}

export default defineComponent({
    props: {
        name: {
            type: String,
            required: true,
        },
        modelValue: {
            type: String,
            default: '',
            required: true,
        },
        type: {
            type: String as () => SliderToggleType,
            default: SliderToggleType.DEFAULT,
        },
        loading: {
            type: Boolean,
            default: false,
        },
    },
    model: { prop: 'modelValue', event: 'update:modelValue' },
    emits: ['update:modelValue'],
    setup(props, context) {
        const { proxy: vm } = getCurrentInstance()!;

        const root$ = ref<HTMLDivElement | null>(null);
        const labels$ = ref<HTMLLabelElement[] | null>(null);
        const activeBox$ = ref<HTMLDivElement | null>(null);

        const localValue = ref<string | null>(null); // Initialized below
        const activeBoxStyles = reactive({ center: 0, width: 0 });
        let isUpdatingActiveBoxPosition = false;
        const noTransitions = ref(true);

        watch(
            () => props.modelValue,
            (value) => {
                localValue.value = value;
            },
        );

        // Use a classic $watch instead of watch(), such that the initialization of localValue below triggers the
        // watcher via Vue's scheduler (i.e. after mounted), like for the original class component's @Watch combined
        // with the initialization in created. Flush 'pre' watch() watchers triggered during setup instead run
        // synchronously after the initial render, before mounted.
        vm.$watch(
            () => localValue.value,
            (value) => {
                updateActiveBoxPosition();
                context.emit('update:modelValue', value);
            },
        );

        localValue.value = props.modelValue;
        window.addEventListener('resize', updateActiveBoxPosition);

        // Watch for style changes associated with type changes and for UI changes when component gets enabled.
        watch([() => props.loading, () => props.type], () => updateActiveBoxPosition());

        onMounted(async () => {
            await updateActiveBoxPosition();
            await nextTick();
            // Wait for browser to update styles
            await new Promise((resolve) => {
                window.requestAnimationFrame(resolve);
            });
            noTransitions.value = false;
        });

        onUnmounted(() => {
            window.removeEventListener('resize', updateActiveBoxPosition);
        });

        async function updateActiveBoxPosition() {
            if (isUpdatingActiveBoxPosition) return;
            isUpdatingActiveBoxPosition = true;
            try {
                await nextTick();
                // Wait for browser to update styles, after which getBoundingClientRect should be cheaper
                await new Promise<unknown>((resolve) => {
                    window.requestAnimationFrame(resolve);
                });

                if (!labels$.value || !activeBox$.value) return;

                const label = labels$.value.find(({ className }) => className === 'active') || labels$.value[0];
                if (!label) return;

                const labelRect = label.getBoundingClientRect();
                const containerRect = root$.value!.getBoundingClientRect();

                const labelCenter = labelRect.left - containerRect.left + labelRect.width / 2;

                activeBoxStyles.center = labelCenter;
                activeBoxStyles.width = labelRect.width;
            } finally {
                isUpdatingActiveBoxPosition = false;
            }
        }

        return {
            root$,
            labels$,
            activeBox$,
            localValue,
            activeBoxStyles,
            noTransitions,
        };
    },
    components: {
        LoadingSpinner,
    },
});
</script>

<style lang="scss" scoped>
.slider-toggle {
    --borderRadius: 9999px;
    --transitionDuration: 200ms;
    --padding: 0.5rem;

    contain: layout style; // not paint to not cutoff active-box box-shadow
    position: relative;
    display: flex;

    background-color: var(--nimiq-highlight-bg);
    border-radius: var(--borderRadius);
    padding: var(--padding);
}

// Currency type styles
.slider-toggle,
.slider-toggle.type-currency {
    --inactiveOpacity: 0.5;
    --horizontalPadding: 16px;
    --verticalPadding: 14px;

    font-size: 1.75rem;
    letter-spacing: 0.1em;
    font-weight: bold;
}

// Purpose type styles
.slider-toggle.type-default {
    --inactiveOpacity: 0.625;
    --horizontalPadding: 2.5rem;
    --verticalPadding: 1.125rem;

    font-size: 2.5rem;
    letter-spacing: 0;
    font-weight: 600;
    color: rgba(31, 35, 72, 0.8); // --nimiq-blue
}

// Loading state styles
.slider-toggle.loading {
    letter-spacing: initial;
    font-size: 2rem;
    font-weight: 600;
    line-height: 2.5rem;

    svg {
        height: 2.5rem;
        width: auto;
        margin-right: 1.5rem;
    }

    label {
        opacity: 1;
    }

    &.no-transition {
        --transitionDuration: 0ms;
    }
}

input {
    display: none;
}

label {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    isolation: isolate; // create a separate stacking context to avoid being hidden behind active-box

    line-height: 150%;

    padding: var(--verticalPadding) var(--horizontalPadding);
    cursor: pointer;

    transition: opacity var(--transitionDuration) var(--nimiq-ease);

    &:not(.active) {
        opacity: var(--inactiveOpacity);
    }

    &:not(.active):hover {
        opacity: calc(var(--inactiveOpacity) + 0.12);
    }

    * {
        pointer-events: none;
    }
}

.active-box {
    // variables dynamically updated in updateActiveBoxPosition()
    --center: 0px;
    --width: 0px;

    contain: size layout paint style;
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(calc(-50% + var(--center)), -50%);

    background-color: white;
    height: calc(100% - (var(--padding) * 2));
    border-radius: var(--borderRadius);
    width: var(--width);

    box-shadow:
        0px 13px 27px rgba(31, 35, 72, 0.07), // --nimiq-blue
        0px 5px 6px rgba(31, 35, 72, 0.04), // --nimiq-blue
        0px 1px 2px rgba(31, 35, 72, 0.02); // --nimiq-blue

    transition:
        transform var(--transitionDuration) var(--nimiq-ease),
        width var(--transitionDuration) var(--nimiq-ease);
}
</style>

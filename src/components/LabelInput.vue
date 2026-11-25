<template>
    <form class="label-input" @submit.prevent="onBlur" :class="{ disabled }">
        <span class="width-finder width-placeholder" ref="widthPlaceholder$">{{
            placeholder || $t('Name your address')
        }}</span>
        <span class="width-finder width-value" ref="widthValue$">{{ liveValue }}</span>
        <input
            type="text"
            class="nq-input"
            :class="{ vanishing: vanishing }"
            :placeholder="placeholder || $t('Name your address')"
            :style="{ width: `${width}px` }"
            v-model="liveValue"
            :disabled="disabled"
            @input="onInput"
            @blur="onBlur"
            @paste="$emit('paste', $event)"
            ref="input$"
        />
    </form>
</template>

<script lang="ts">
import { Utf8Tools } from '@nimiq/utils';
import { defineComponent, ref, watch } from 'vue';
import { nextTick } from '@/lib/nextTick';

const LabelInput = defineComponent({
    props: {
        maxBytes: Number,
        value: {
            type: String,
            default: '',
        },
        placeholder: String,
        vanishing: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['paste', 'input', 'changed'],
    setup(props, context) {
        const widthPlaceholder$ = ref<HTMLSpanElement | null>(null);
        const widthValue$ = ref<HTMLSpanElement | null>(null);
        const input$ = ref<HTMLInputElement | null>(null);

        const liveValue = ref('');
        let lastValue = '';
        let lastEmittedValue = '';
        const width = ref(50);

        function focus() {
            input$.value!.focus();
        }

        function onInput() {
            if (props.maxBytes) {
                const lengthInBytes = Utf8Tools.stringToUtf8ByteArray(liveValue.value).byteLength;
                if (lengthInBytes > props.maxBytes) {
                    liveValue.value = lastValue;
                    return;
                }
                lastValue = liveValue.value;
            }
            context.emit('input', liveValue.value);
        }

        function onBlur() {
            if (liveValue.value === lastEmittedValue) return;
            context.emit('changed', liveValue.value);
            lastEmittedValue = liveValue.value;
            input$.value!.blur();
        }

        function updateValue(newValue: string) {
            liveValue.value = newValue;
            lastValue = liveValue.value;
            lastEmittedValue = lastValue;
        }

        async function updateWidth() {
            await nextTick(); // Await updated DOM
            if (!widthPlaceholder$.value) return;

            const placeholderWidth = widthPlaceholder$.value.offsetWidth;
            const valueWidth = widthValue$.value!.offsetWidth;

            // Add an additional padding, so entering new letters does not flicker the input before width is adjusted
            //
            // A third of the font-size was found to be a good compromise between not adding too big a gap and
            // still resonably supporting wide letters (it still jumps for W at bigger font-sizes, but that's why
            // it's called a compromise).
            const fontSize = parseFloat(window.getComputedStyle(input$.value!, null).getPropertyValue('font-size'));

            width.value = (liveValue.value.length ? valueWidth : placeholderWidth) + fontSize / 3;
        }

        // Note: the order of these immediate watchers matters, as in the original class component.
        watch(() => props.value, updateValue, { immediate: true });
        watch(liveValue, updateWidth, { immediate: true });

        return {
            widthPlaceholder$,
            widthValue$,
            input$,
            liveValue,
            width,
            focus,
            onInput,
            onBlur,
        };
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type LabelInput = InstanceType<typeof LabelInput>;
export default LabelInput;
</script>

<style lang="scss" scoped>
.label-input {
    position: relative;
    overflow: hidden; // limit width-finder width to parent available width
    max-width: 100%;
    box-sizing: border-box;
}

.width-finder {
    position: absolute;
    color: transparent;
    pointer-events: none;
    user-select: none;
    white-space: pre;
    padding: 0 2.25rem; // nq-input padding + border-width
}

input {
    padding-right: 0;
    max-width: 100%;
    // color and box-shadow transitions copied from Nimiq Styles
    transition:
        color 0.2s ease,
        box-shadow 0.2s ease,
        width 50ms ease-out;

    &:disabled {
        pointer-events: none; // Prevent hover effects
    }
}
</style>

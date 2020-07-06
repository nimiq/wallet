<template>
    <div class="amount-input" :class="{'has-value': valueInLuna > 0, 'focussed': isFocussed}">
        <slot name="prefix"/>
        <form class="label-input" @submit.prevent ref="$fullWidth">
            <span class="width-finder width-placeholder" ref="$widthPlaceholder">{{ placeholder }}</span>
            <div v-if="maxFontSize" class="full-width" :class="{'width-finder': maxWidth > 0}">Width</div>
            <span class="width-finder width-value" ref="$widthValue">{{ liveValue || '' }}</span>
            <input type="text" inputmode="numeric" class="nq-input" :class="vanishing"
                :placeholder="placeholder"
                :style="{width: `${width}px`, fontSize: `${fontSize}rem`}"
                :value="liveValue" @input="onInput"
                @focus="isFocussed = true" @blur="isFocussed = false"
                ref="$input">
        </form>
        <slot v-if="$slots.suffix" name="suffix"/>
        <span v-else class="nim">NIM</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from '@vue/composition-api';

export default defineComponent({
    props: {
        value: Number,
        maxFontSize: {
            type: Number,
            default: 8,
        },
        placeholder: {
            type: String,
            default: '0',
        },
        vanishing: {
            type: Boolean,
            default: false,
        },
        decimals: {
            type: Number,
            default: 5,
        },
    },
    setup(props, context) {
        const liveValue = ref('');
        const lastEmittedValue = ref(0);
        const width = ref(50);
        const fontSize = ref(props.maxFontSize);
        const maxWidth = ref(0);
        const valueInLuna = ref(0);
        const isFocussed = ref(false);

        // Refs
        const $fullWidth = ref<HTMLDivElement>(null);
        const $input = ref<HTMLInputElement>(null);
        const $widthPlaceholder = ref<HTMLSpanElement>(null);
        const $widthValue = ref<HTMLSpanElement>(null);

        onMounted(() => {
            if (props.maxFontSize) {
                maxWidth.value = $fullWidth.value!.offsetWidth;
            }
        });

        async function updateWidth() {
            await context.root.$nextTick(); // Await updated DOM
            if (!$widthPlaceholder.value) return;

            const placeholderWidth = $widthPlaceholder.value.offsetWidth;
            const valueWidth = $widthValue.value!.offsetWidth;
            const fontSizeFactor = Math.min(1.0, Math.max(maxWidth.value / valueWidth, 1 / props.maxFontSize));

            fontSize.value = fontSizeFactor * props.maxFontSize;
            width.value = (liveValue.value ? (fontSizeFactor === 1 ? valueWidth : maxWidth.value) : placeholderWidth);
        }

        watch(liveValue, updateWidth);

        function formatValue(val: string) {
            const regExp = new RegExp(`(\\d*)(\\.(\\d{0,${props.decimals}}))?`, 'g'); // Backslashes are escaped
            const regExpResult = regExp.exec(val)!;
            if (regExpResult[1] || regExpResult[2]) {
                // Note: regExpResult[2] contains the decimal point, if there was any
                return `${regExpResult[1] ? regExpResult[1] : '0'}${regExpResult[2] ? regExpResult[2] : ''}`;
            }
            return '';
        }

        function updateValue(value: string) {
            liveValue.value = formatValue(value.replace(/,/, '.'));
            valueInLuna.value = Number(liveValue.value || 0) * 10 ** props.decimals;
        }

        function onInput(event: InputEvent) {
            updateValue((event.target as HTMLInputElement).value);

            (event.target as HTMLInputElement).value = liveValue.value;

            if (lastEmittedValue.value !== valueInLuna.value) {
                context.emit('input', valueInLuna.value);
                lastEmittedValue.value = valueInLuna.value;
            }
        }

        watch(() => props.value, (newValue: number | undefined) => {
            updateValue(newValue ? (newValue / 10 ** props.decimals).toString() : '');
        });

        return {
            valueInLuna,
            isFocussed,
            width,
            maxWidth,
            liveValue,
            fontSize,
            onInput,
            $fullWidth,
            $input,
            $widthPlaceholder,
            $widthValue,
        };
    },
    methods: {
        focus() {
            (this.$refs.$input as HTMLInputElement).focus();
        },
    },
});
</script>

<style lang="scss" scoped>
.label-input {
    position: relative;
    overflow: hidden; /* limit width-finder width to parent available width */
    max-width: 100%;
    height: 100%;
}

.width-finder {
    position: absolute;
    color: transparent;
    pointer-events: none;
    user-select: none;
    white-space: pre;
    padding: 1.25rem;
}

input {
    padding: 0 0.25rem;
    max-width: 100%;
    text-align: center;
    color: inherit !important;

    // Remove color transition (handled by .amount-input parent)
    // Add width transition
    transition: box-shadow .2s var(--nimiq-ease), width 50ms ease-out;
}

.full-width {
    width: 1000px;
}

.amount-input {
    display: flex;
    align-items: baseline;
    justify-content: center;
    width: 100%;
    font-size: 8rem;
    color: rgba(31, 35, 72, 0.5); /* Based on Nimiq Blue */
    transition: color .2s var(--nimiq-ease);
}

.amount-input.has-value {
    color: var(--nimiq-blue);
}

.amount-input.focussed {
    color: var(--nimiq-light-blue);
}

.amount-input form {
    display: flex;
}

.amount-input .nim {
    margin-left: 1rem;
    font-size: 4rem;
    font-weight: 700;
    line-height: 4.5rem;
}
</style>

<template>
    <div class="amount-input" :class="{'has-value': liveValue.length > 0, 'focussed': isFocussed}">
        <slot name="prefix"/>
        <form class="label-input" @submit.prevent ref="fullWidth$">
            <span class="width-finder width-placeholder" ref="widthPlaceholder$">{{ placeholder }}</span>
            <div v-if="maxFontSize" class="full-width" :class="{'width-finder': maxWidth > 0}">Width</div>
            <span class="width-finder width-value" ref="widthValue$">{{ liveValue || '' }}</span>
            <input type="text" inputmode="decimal" class="nq-input" :class="{ vanishing }"
                :placeholder="placeholder"
                :style="{width: `${width}px`, fontSize: `${fontSize}rem`}"
                :value="liveValue"
                :disabled="disabled"
                @input="onInput"
                @focus="onToggleFocus(true)"
                @blur="onToggleFocus(false)"
                ref="input$"
            >
        </form>
        <slot v-if="$slots.suffix" name="suffix"/>
        <span v-else class="ticker">NIM</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue';
import { nextTick } from '@/lib/nextTick';

const AmountInput = defineComponent({
    props: {
        value: Number,
        maxFontSize: {
            type: Number,
            default: 8,
        },
        max: {
            type: Number,
            required: false,
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
        preserveSign: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
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
        const fullWidth$ = ref<HTMLDivElement>(null);
        const input$ = ref<HTMLInputElement>(null);
        const widthPlaceholder$ = ref<HTMLSpanElement>(null);
        const widthValue$ = ref<HTMLSpanElement>(null);

        onMounted(() => {
            if (props.maxFontSize) {
                maxWidth.value = fullWidth$.value!.offsetWidth;
            }
        });

        function focus() {
            if (!input$.value) return;
            input$.value.focus();
        }

        async function updateWidth() {
            await nextTick(); // Await updated DOM
            if (!widthPlaceholder$.value) return;

            const placeholderWidth = widthPlaceholder$.value.offsetWidth;
            const valueWidth = widthValue$.value!.offsetWidth;
            const fontSizeFactor = Math.min(1.0, Math.max(maxWidth.value / valueWidth, 1 / props.maxFontSize));

            fontSize.value = fontSizeFactor * props.maxFontSize;
            width.value = (liveValue.value ? (fontSizeFactor === 1 ? valueWidth : maxWidth.value) : placeholderWidth);
        }

        watch(liveValue, updateWidth);

        function formatValue(val: string) {
            // Handle exponential decimal notation
            if (val.includes('e-')) {
                val = parseFloat(val).toFixed(props.decimals);
                while (val.length > 1 && val.endsWith('0')) {
                    val = val.substring(0, val.length - 1);
                }
                if (val.endsWith('.')) {
                    val = val.substring(0, val.length - 1);
                }
            }

            const regExp = new RegExp(`([-+])?(\\d*)(\\.\\d{0,${props.decimals}})?`, 'g'); // Backslashes are escaped
            const regExpResult = regExp.exec(val)!;
            if (regExpResult[1] || regExpResult[2] || regExpResult[3]) {
                // regExpResult[1] contains the sign
                // regExpResult[2] contains the whole integers
                // regExpResult[3] contains the decimal point and decimals
                return [
                    props.preserveSign ? (regExpResult[1] || '+') : '',
                    regExpResult[2] || (regExpResult[3] ? '0' : ''),
                    regExpResult[3] || '',
                ].join('');
            }
            return '';
        }

        function updateValue(value: string) {
            let newValue = formatValue(value.replace(/,/, '.'));
            let newValueInLuna = Math.round(Number(newValue || 0) * 10 ** props.decimals);

            if (props.max && props.max < newValueInLuna) {
                newValueInLuna = props.max;
                newValue = String(newValueInLuna / 10 ** props.decimals);
            }

            liveValue.value = newValue;
            valueInLuna.value = newValueInLuna;
        }

        function onInput(event: { target: EventTarget | null }) {
            const target = event.target as HTMLInputElement;

            updateValue(target.value);
            target.value = liveValue.value;

            if (lastEmittedValue.value !== valueInLuna.value) {
                context.emit('input', valueInLuna.value);
                lastEmittedValue.value = valueInLuna.value;
            }
        }

        function onToggleFocus(_isFocussed: boolean) {
            isFocussed.value = _isFocussed;
            context.emit(_isFocussed ? 'focus' : 'blur', context.refs.input$);
        }

        watch(() => props.value, (newValue: number | undefined) => {
            if (newValue === valueInLuna.value) return;
            lastEmittedValue.value = newValue || 0;
            updateValue(newValue ? String(newValue / 10 ** props.decimals) : '');
        });

        watch(() => props.max, (newMax: number | undefined) => {
            // Disabling a max value, or setting it higher than the current value, has no effect on
            // the current value, but will take effect only on the next input.
            if (!newMax || newMax >= valueInLuna.value) return;

            onInput({ target: context.refs.input$ as EventTarget });
        });

        return {
            focus, // exposed for use from other components

            valueInLuna,
            isFocussed,
            width,
            maxWidth,
            liveValue,
            fontSize,
            onInput,
            onToggleFocus,
            fullWidth$,
            input$,
            widthPlaceholder$,
            widthValue$,
        };
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type AmountInput = InstanceType<typeof AmountInput>;
export default AmountInput;
</script>

<style lang="scss" scoped>
@import '../scss/functions.scss';

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
    transition: box-shadow 0.2s var(--nimiq-ease), width 50ms ease-out, color 0.2s var(--nimiq-ease);

    &:not(:disabled):hover {
        --border-color: rgba(5, 130, 202, 0.2);
    }
    &:disabled {
        box-shadow: none;
    }
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
    color: nimiq-blue(0.5);

    form {
        display: flex;

        &:has(:disabled) ~ .ticker {
           margin-left: -.5rem;
        }
    }

    .ticker {
        margin-left: 1rem;
        font-size: 4rem;
        font-weight: 700;
        line-height: 4.5rem;
    }

    &.has-value {
        color: var(--nimiq-blue);
    }

    &.has-value .nq-input:not(:disabled):hover {
        color: var(--nimiq-light-blue);
    }

    &.has-value .nq-input:not(:disabled):focus-within {
        --border-color: rgba(5, 130, 202, 0.4);
    }
}

.amount-input.focussed .ticker,
// .label-input:hover + .ticker,
.label-input:focus-within + .ticker {
    color: var(--nimiq-light-blue);
}
</style>

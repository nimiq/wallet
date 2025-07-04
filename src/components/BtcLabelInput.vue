<template>
    <div class="btc-label-input"
        :class="{ disabled, autocomplete: matchingLabels && matchingLabels.length > 0 }"
        @keydown="onKeyDown"
    >
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled" ref="input$"/>
        <Avatar :label="localValue"/>
        <ul class="label-autocomplete" v-if="matchingLabels && matchingLabels.length > 0" ref="btcLabelAutocomplete$">
            <li v-for="(label, index) in matchingLabels" :key="index"
                :class="{selected: selectedLabelIndex === index}"
                @mouseenter="selectedLabelIndex = index"
                @focusin="selectedLabelIndex = index"
                @click="localValue = label"
            >
                <Avatar :label="label"/>
                {{ label }}
            </li>
        </ul>
        <div class="blue-tooltip" v-if="Object.values(recipientLabels).length === 0">
            <p>{{ $t('Add a label to quickly find the transaction in your history.') }}</p>
            <p>{{ $t('With Bitcoin, there are no contacts, since addresses are only used once.') }}</p>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, Ref, ref, watch } from 'vue';
import { LabelInput } from '@nimiq/vue-components';
import { useBtcLabelsStore } from '@/stores/BtcLabels';
import Avatar from './Avatar.vue';

const BtcLabelInput = defineComponent({
    props: {
        value: {
            type: String,
            default: '',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        // Nested v-model pattern
        // https://zaengle.com/blog/using-v-model-on-nested-vue-components
        // https://vue-composition-api-rfc.netlify.app/api.html#computed
        const localValue = computed({
            get: () => props.value,
            set(value) { context.emit('input', value); },
        });

        const { recipientLabels } = useBtcLabelsStore();
        const input$ = ref<LabelInput | null>(null);
        const btcLabelAutocomplete$ = ref<HTMLUListElement | null>(null);
        const selectedLabelIndex: Ref<number> = ref(0);

        function focus() {
            if (!input$.value) return;
            input$.value.focus();
        }

        /* Filtering Labels */
        const matchingLabels = computed(() =>
            localValue.value && Object.values(recipientLabels.value).filter((label) =>
                label
                && label.toLowerCase().startsWith(localValue.value.toLowerCase())
                && label.toLowerCase() !== localValue.value.toLowerCase(),
            ),
        );

        /* Reset the currently selected label to 0 on text input */
        watch(localValue, () => selectedLabelIndex.value = 0);

        /* Keyboard navigation */
        function onKeyDown(event: KeyboardEvent) {
            if (!matchingLabels || !btcLabelAutocomplete$.value) return;
            const oldIndex = selectedLabelIndex.value;

            switch (event.keyCode) {
                case 40: // down arrow key
                    selectedLabelIndex.value = Math.max(0, Math.min(
                        matchingLabels.value.length - 1, selectedLabelIndex.value + 1),
                    );

                    break;

                case 38: // up arrow key
                    selectedLabelIndex.value = Math.max(0, Math.min(
                        matchingLabels.value.length - 1, selectedLabelIndex.value - 1),
                    );
                    break;

                case 13: // enter key
                    localValue.value = matchingLabels.value[selectedLabelIndex.value];
                    break;

                default:
                    break;
            }

            if (selectedLabelIndex.value !== oldIndex) {
                /* If the selected label list item is not into view, scroll to it */
                btcLabelAutocomplete$.value.children[selectedLabelIndex.value].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }
        }

        return {
            focus, // exposed for use from other components

            localValue,
            input$,
            btcLabelAutocomplete$,
            recipientLabels,
            matchingLabels,
            selectedLabelIndex,
            onKeyDown,
        };
    },
    components: {
        LabelInput,
        Avatar,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type BtcLabelInput = InstanceType<typeof BtcLabelInput>;
export default BtcLabelInput;
</script>

<style lang="scss" scoped>
    @import '../scss/mixins.scss';

    .btc-label-input {
        position: relative;
        font-weight: 600;

        & >.avatar {
            position: absolute;
            left: 1.5rem;
            top: 1.5rem;
            width: 3rem;
            height: 3rem;
            font-size: 1.625rem;
            letter-spacing: -0.05em;
        }

        & >.avatar ::v-deep svg path {
            transition: fill 200ms var(--nimiq-ease);
        }

        &:hover > .avatar ::v-deep svg path,
        &:focus-within > .avatar ::v-deep svg path {
            fill: var(--nimiq-light-blue);
        }

        ::v-deep input {
            width: 100% !important;
            padding: 1.75rem 2rem 1.75rem 5.75rem;

            &::placeholder {
                transition: color 200ms var(--nimiq-ease);
            }
        }

        &.disabled {
            & > .avatar {
                filter: saturate(0);
                opacity: 0.5;
            }

            ::v-deep input {
                color: var(--text-50);
            }
        }
    }

    .blue-tooltip {
        @media (min-width: ($tabletBreakpoint + 1px)) {
            @include blue-tooltip(left);
        }

        @media (max-width: $tabletBreakpoint) {
            @include blue-tooltip(bottom);
        }

        p:first-child {
            margin-top: 0;
        }
        p:last-child {
            margin-bottom: 0;
        }
    }

    .label-input:focus-within ~ .blue-tooltip {
        @media (min-width: ($tabletBreakpoint + 1px)) {
            @include blue-tooltip_open(left);
        }

        @media (max-width: $tabletBreakpoint) {
            @include blue-tooltip_open(bottom);
        }
    }

    .label-autocomplete {
        display: none;
    }

    .label-input:focus-within ~ .label-autocomplete {
        @extend %custom-scrollbar-inverse;

        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        z-index: 4;
        background: var(--nimiq-blue-bg);
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0px 1.125rem 2.25rem rgba(0, 0, 0, 0.1);
        margin: 0;
        margin-top: -.25rem;
        padding: .5rem;
        max-height: 40rem;
        list-style-type: none;
        overflow: auto;
        cursor: pointer;

        li {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 1rem;
            border-radius: 0.25rem;
            background-color: rgba(#FFFFFF, 0);

            transition: background-color 200ms var(--nimiq-ease);

            &:not(:last-child) {
                margin-bottom: .5rem;
            }

            &:hover,
            &.selected {
                background-color: rgba(#FFFFFF, .12);
            }
        }

        .avatar {
            margin-right: 1rem;
            height: 3rem;
            width: 3rem;
            font-size: 1.625rem;
            letter-spacing: -0.05em;
        }
    }
</style>

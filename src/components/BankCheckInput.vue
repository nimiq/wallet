<template>
    <div class="bank-check-input"
        :class="{ disabled, autocomplete: matchingBanks && matchingBanks.length > 0 }"
        @keydown="onKeyDown"
    >
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled" ref="$labelInput"/>
        <ul class="bank-autocomplete" v-if="matchingBanks && matchingBanks.length > 0" ref="$bankAutocomplete">
            <li v-for="(bank, index) in matchingBanks" :key="index"
                :class="{ selected: selectedBankIndex === index }"
                :disabled="bank.type === SEPA_INSTANT_SUPPORT.NONE"
                @mouseenter="selectedBankIndex = index"
                @mousedown.prevent="selectBank(bank)"
            >
                <Avatar :label="bank.name" v-if="bank.type !== SEPA_INSTANT_SUPPORT.NONE"/>
                <i class="avatar" v-else>X</i>
                <span>{{ bank.name }}</span>
                <CaretRightSmallIcon class="caret-right-small-icon" v-if="bank.type === SEPA_INSTANT_SUPPORT.FULL"/>
                <i class="circled-question-mark-icon" v-if="bank.type === SEPA_INSTANT_SUPPORT.PARTIAL">?</i>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { LabelInput, CaretRightSmallIcon } from '@nimiq/vue-components';
import { SEPA_INSTANT_SUPPORT, BankInfos } from '@/stores/Swaps';
import Avatar from './Avatar.vue';

export default defineComponent({
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

        // TEST DATA
        const banks = ref<BankInfos[]>([
            {
                name: 'Berliner Sparkasse',
                type: SEPA_INSTANT_SUPPORT.FULL,
            },
            {
                name: 'Stadtsparkasse Bad Honne',
                type: SEPA_INSTANT_SUPPORT.FULL,
            },
            {
                name: 'Sparkasse Bremen AG',
                type: SEPA_INSTANT_SUPPORT.FULL,
            },
            {
                name: 'Sparda Bank',
                type: SEPA_INSTANT_SUPPORT.UNKNOW,
            },
            {
                name: 'Sparkasse Wuppertal',
                type: SEPA_INSTANT_SUPPORT.FULL,
            },
            {
                name: 'Sparkasse Attendorn-Lenn',
                type: SEPA_INSTANT_SUPPORT.PARTIAL,
            },
            {
                name: 'Sparkasse Bad Hersfeld-Rot',
                type: SEPA_INSTANT_SUPPORT.NONE,
            },
        ]);
        const $bankAutocomplete = ref<HTMLUListElement | null>(null);
        const selectedBankIndex = ref(0);

        /* Filtering Labels */
        const matchingBanks = computed(() =>
            localValue.value
                ? Object.values(banks.value).filter((bank) =>
                    bank.name
                    && bank.name.toLowerCase().includes(localValue.value.toLowerCase())
                    && bank.name.toLowerCase() !== localValue.value.toLowerCase(),
                ) : [],
        );

        /* Reset the currently selected label to 0 on text input */
        watch(localValue, () => selectedBankIndex.value = 0);

        /* Keyboard navigation */
        function onKeyDown(event: KeyboardEvent) {
            if (!matchingBanks || !$bankAutocomplete.value) return;
            const oldIndex = selectedBankIndex.value;

            switch (event.keyCode) {
                case 40: // down arrow key
                    selectedBankIndex.value = Math.max(0, Math.min(
                        matchingBanks.value.length - 1, selectedBankIndex.value + 1),
                    );

                    break;

                case 38: // up arrow key
                    selectedBankIndex.value = Math.max(0, Math.min(
                        matchingBanks.value.length - 1, selectedBankIndex.value - 1),
                    );
                    break;

                case 13: // enter key
                    selectBank(matchingBanks.value[selectedBankIndex.value]);
                    break;

                default:
                    break;
            }

            if (selectedBankIndex.value !== oldIndex) {
                /* If the selected label list item is not into view, scroll to it */
                $bankAutocomplete.value.children[selectedBankIndex.value].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }
        }

        function selectBank(bank: BankInfos) {
            localValue.value = bank.name;
            context.emit('bank-selected', bank);
        }

        return {
            SEPA_INSTANT_SUPPORT,

            $bankAutocomplete,

            localValue,
            matchingBanks,
            selectedBankIndex,

            onKeyDown,
            selectBank,
        };
    },
    methods: {
        focus() {
            (this.$refs.$labelInput as LabelInput).focus();
        },
    },
    components: {
        LabelInput,
        CaretRightSmallIcon,
        Avatar,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.bank-check-input {
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

    & >.avatar /deep/ svg path {
        transition: fill 200ms var(--nimiq-ease);
    }

    &:hover > .avatar /deep/ svg path,
    &:focus-within > .avatar /deep/ svg path {
        fill: var(--nimiq-light-blue);
    }

    /deep/ input {
        width: 78% !important;
        padding: 1.75rem 2rem;

        &::placeholder {
            transition: color 200ms var(--nimiq-ease);
        }
    }

    &.disabled {
        & > .avatar {
            filter: saturate(0);
            opacity: 0.5;
        }

        /deep/ input {
            color: var(--text-50);
        }
    }
}

.bank-autocomplete {
    @extend %custom-scrollbar-inverse;

    display: flex;
    flex-direction: column;
    width: 90%;
    position: absolute;
    top: 51px; // TEMP: input height
    left: 50%;
    transform: translateX(-50%);
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

    .label-input:not(:focus-within) ~ & {
        display: none;
    }

    li {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 1rem;
        border-radius: 0.25rem;
        background-color: rgba(#FFFFFF, 0);

        transition: background-color 200ms var(--nimiq-ease);

        span {
            flex-grow: 1;
            text-align: left;
        }

        i.circled-question-mark-icon {
            font-style: normal;
            color: var(--nimiq-red);
        }

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

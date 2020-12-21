<template>
    <div class="bank-check-input"
        :class="{
            disabled,
            autocomplete: matchingBanks && matchingBanks.length > 0 && localValue.length >= 2,
            writing: localValue.length > 0,
        }"
        @keydown="onKeyDown"
    >
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled" ref="$labelInput"/>
        <ul class="bank-autocomplete" v-if="matchingBanks && matchingBanks.length > 0" ref="$bankAutocomplete">
            <li class="bank" v-for="(bank, index) in visibleBanks" :key="index"
                :class="{ selected: selectedBankIndex === index }"
                :disabled="bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.NONE"
                @mouseenter="selectedBankIndex = index"
                @mousedown.prevent="selectBank(bank)"
                :title="bank.name"
            >
                <BankIcon v-if="bank.support.sepa.outbound !== SEPA_INSTANT_SUPPORT.NONE"/>
                <ForbiddenIcon v-else />
                <span v-if="new RegExp(localValue, 'i').test(bank.name)">{{
                    getMatchPrefix(bank.name)
                    }}<strong>{{
                        getMatch(bank.name)
                    }}</strong>{{
                    getMatchSuffix(bank.name)
                }}</span>
                <span v-else>{{ bank.name }}</span>
                <CaretRightSmallIcon class="caret-right-small-icon"
                    v-if="bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.FULL"/>

                <Tooltip
                    v-if="bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.PARTIAL
                        || bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.UNKNOWN"
                    class="circled-question-mark"
                    preferredPosition="bottom left"
                    theme="inverse"
                    :container="this"
                    :styles="{ transform: 'translate3d(5%, 2rem, 1px)' }">
                    <CircledQuestionMarkIcon slot="trigger"/>
                    <p>{{ $t('Not all accounts provided by this bank support instant transactions.') }}</p>
                    <p>{{ $t('Contact your bank to find out if your account is eligible.') }}</p>
                </Tooltip>
            </li>
            <li class="more-count" v-if="matchingBanks.length > visibleBanks.length">
                {{ $tc('+ {count} more | + {count} more', matchingBanks.length - visibleBanks.length) }}
            </li>
            <li class="warning" v-if="showWarning" key="warning">
                {{ $t('Your bank needs to support SEPA Instant out transactions.'
                    + 'Some banks don’t support it yet, but are likely to do so in the future.') }}
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { LabelInput, CaretRightSmallIcon, Tooltip } from '@nimiq/vue-components';
import { SEPA_INSTANT_SUPPORT, BankInfos } from '@/stores/Swaps';
import BANKS from '@/data/banksList/bankslist.json';
import BankIcon from './icons/BankIcon.vue';
import CircledQuestionMarkIcon from './icons/CircledQuestionMark.vue';
import ForbiddenIcon from './icons/ForbiddenIcon.vue';

const MAX_VISIBLE_ITEMS = 3;

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

        const banks: BankInfos[] = BANKS;
        const $bankAutocomplete = ref<HTMLUListElement | null>(null);
        const selectedBankIndex = ref(0);

        /* Filtering & Sorting Labels */
        const matchingBanks = computed(() => {
            if (!localValue.value) return [];

            const rgx = RegExp(localValue.value, 'i');
            return Object.values(banks).filter((bank) =>
                (bank.name && rgx.test(bank.name)) || (bank.BIC && rgx.test(bank.BIC)),
            ).sort((a, b) => a.name.localeCompare(b.name));
        });
        const visibleBanks = computed(() => matchingBanks.value.slice(0, MAX_VISIBLE_ITEMS));

        /* Reset the currently selected label to 0 on text input */
        watch(localValue, () => selectedBankIndex.value = 0);

        /* Keyboard navigation */
        function onKeyDown(event: KeyboardEvent) {
            if (!matchingBanks || !$bankAutocomplete.value) return;
            const oldIndex = selectedBankIndex.value;

            switch (event.keyCode) {
                case 40: // down arrow key
                    event.preventDefault();
                    selectedBankIndex.value = Math.max(0, Math.min(
                        visibleBanks.value.length - 1, selectedBankIndex.value + 1),
                    );
                    break;

                case 38: // up arrow key
                    event.preventDefault();
                    selectedBankIndex.value = Math.max(0, Math.min(
                        visibleBanks.value.length - 1, selectedBankIndex.value - 1),
                    );
                    break;

                case 13: // enter key
                    selectBank(visibleBanks.value[selectedBankIndex.value]);
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

        /* Executed when a bank is selected */
        function selectBank(bank: BankInfos) {
            if (bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.NONE) {
                (context.refs.$labelInput as LabelInput).focus();
                return;
            }
            localValue.value = bank.name;
            context.emit('bank-selected', bank);
        }

        /* Show warning if any visible bank is not fully supporting SEPA instant */
        const showWarning = computed(() =>
            matchingBanks.value.some((bank: BankInfos) => bank.support.sepa.outbound !== SEPA_INSTANT_SUPPORT.FULL),
        );

        /* Those 3 functions are used to highlight the matched string in autocomplete list */
        function getMatchPrefix(s: string) {
            const rgx = new RegExp(`^(.*?)${localValue.value}`, 'i');
            const match = s.match(rgx);

            return (match ? match[1] : '');
        }
        function getMatch(s: string) {
            const rgx = new RegExp(`${localValue.value}`, 'i');
            const match = s.match(rgx);

            return (match ? match[0] : '');
        }
        function getMatchSuffix(s: string) {
            const rgx = new RegExp(`${localValue.value}(.*?)$`, 'i');
            const match = s.match(rgx);

            return (match ? match[1] : '');
        }

        return {
            SEPA_INSTANT_SUPPORT,

            $bankAutocomplete,

            localValue,
            matchingBanks,
            visibleBanks,
            selectedBankIndex,

            onKeyDown,
            selectBank,

            showWarning,
            getMatchPrefix,
            getMatch,
            getMatchSuffix,
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
        BankIcon,
        CircledQuestionMarkIcon,
        ForbiddenIcon,
        Tooltip,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.bank-check-input {
    --input-width: 78%;

    position: relative;
    font-weight: 600;

    /deep/ input {
        width: var(--input-width) !important;
        padding: 1.75rem 2rem;

        &::placeholder {
            transition: color 200ms var(--nimiq-ease);
        }
    }

    &.disabled {
        /deep/ input {
            color: var(--text-50);
        }
    }
}

.bank-autocomplete {
    @extend %custom-scrollbar-inverse;

    display: none;
    flex-direction: column;
    overflow: visible;

    width: 90%;
    // max-height: 40rem;
    margin: 0;
    margin-top: -.25rem;
    padding: .5rem;

    position: absolute;
    z-index: 4;
    top: 51px; // TEMP: input height
    left: 50%;
    transform: translateX(-50%);

    background: var(--nimiq-blue-bg);
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0px 1.125rem 2.25rem rgba(0, 0, 0, 0.1);
    list-style-type: none;
    text-align: left;
    user-select: none;

    .autocomplete & {
        display: flex;
    }

    .label-input:not(:focus-within) ~ & {
        display: none;
    }

    li.bank {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 1.5rem;
        border-radius: 0.25rem;
        font-weight: 400;
        cursor: pointer;

        background-color: rgba(#FFFFFF, 0);
        transition: background-color 200ms var(--nimiq-ease);

        &:not(:last-child) {
            margin-bottom: .5rem;
        }

        &[disabled] {
            opacity: 0.4;
            cursor: not-allowed;
        }

        &:not([disabled]) {
            &:hover,
            &.selected {
                background-color: rgba(#FFFFFF, .12);

                .caret-right-small-icon {
                    opacity: 1;
                }
            }
        }

        span:first-of-type {
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            mask: linear-gradient(90deg , white, white calc(100% - 5rem), rgba(255,255,255, 0) calc(100% - .5rem));
        }

        .caret-right-small-icon {
            opacity: 0.3;
            transition: opacity 200ms var(--nimiq-ease);
        }

        .circled-question-mark {
            flex-shrink: 0;
            flex-grow: 0;

            &.tooltip /deep/ .tooltip-box {
                width: 32rem;
            }

            .circled-question-mark-icon {
                color: var(--nimiq-orange);
            }

            p:first-child {
                color: var(--text-100);
                margin-bottom: 1rem;
            }

            p:last-child {
                color: var(--text-60);
                margin: 0;
                font-size: var(--small-size);
            }
        }
    }

    .bank-icon,
    .forbidden-icon {
        margin-right: 1rem;
        height: 3rem;
        width: 3rem;
        font-size: 1.625rem;
        letter-spacing: -0.05em;
        flex-shrink: 0;
    }

    li.more-count {
        font-size: var(--small-size);
        margin-left: 1.5rem;
        margin-bottom: 1.75rem;
        opacity: 0.5;
    }

    li.warning {
        font-size: var(--small-size);
        line-height: 130%;
        margin: 0.5rem;
        padding: 1rem;
        padding-right: 1.625rem;
        border-top: 1px solid rgba(white, 0.2);
        opacity: 0.6;
    }
}
</style>

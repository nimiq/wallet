<template>
    <div class="bank-check-input" :class="{ disabled }" @keydown="onKeyDown">
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled" ref="bankSearchInput$"/>
        <CountrySelector :countryCodes="SEPA_COUNTRY_CODES" includeAllOption
            @open="countryDropdownOpened = true"
            @close="countryDropdownOpened = false"
            @select="selectCountry"
            ref="countrySelect">
            <li slot="info" class="info">{{ $t('More locations will be supported in the future.') }}</li>
        </CountrySelector>
        <ul class="bank-autocomplete" ref="bankAutocomplete$"
            v-if="matchingBanks && matchingBanks.length > 0 && localValue.length >= 2 && !countryDropdownOpened"
            :class="{ scroll: isScrollable }"
        >
            <li class="bank"
                v-for="(bank, index) in visibleBanks" :key="index"
                :class="{ selected: bankToConfirm || selectedBankIndex === index }"
                :disabled="getBankSupport(bank) === SEPA_INSTANT_SUPPORT.NONE"
                :title="bank.name"
                @mouseenter="selectedBankIndex = index; bank.tooltip && !bank.tooltip.isShown && bank.tooltip.show()"
                @focusin="selectedBankIndex = index; bank.tooltip && !bank.tooltip.isShown && bank.tooltip.show()"
                @mouseleave="bank.tooltip && bank.tooltip.isShown && bank.tooltip.hide()"
                @focusout="bank.tooltip && bank.tooltip.isShown && bank.tooltip.hide()"
                @click="selectBank(bank)"
                @mousedown.prevent
            >
                <BankIcon v-if="getBankSupport(bank) !== SEPA_INSTANT_SUPPORT.NONE"/>
                <ForbiddenIcon v-else />

                <div class="flex-column">
                    <span v-if="shouldHighlightMatch(bank.name)">{{
                        getMatchPrefix(bank.name)
                        }}<strong>{{
                            getMatch(bank.name)
                        }}</strong>{{
                        getMatchSuffix(bank.name)
                    }}</span>
                    <span v-else>{{ bank.name }}</span>

                    <div class="bic">{{ bank.BIC }}</div>
                </div>

                <button v-if="bankToConfirm" class="reset cancel-bank" @click.stop="bankToConfirm = null" >
                    <CrossIcon/>
                </button>
                <CaretRightSmallIcon class="caret-right-small-icon"
                    v-else-if="checkBankSupport(bank, SEPA_INSTANT_SUPPORT.FULL)"/>
                <Tooltip
                    v-else-if="checkBankSupport(bank, SEPA_INSTANT_SUPPORT.PARTIAL)
                        || checkBankSupport(bank, SEPA_INSTANT_SUPPORT.UNKNOWN)"
                    class="circled-question-mark"
                    preferredPosition="bottom left"
                    theme="inverse"
                    :container="bankAutocomplete$ && { $el: bankAutocomplete$ }"
                    :styles="{ transform: `translate3d(${isScrollable ? -1 : 5}%, 2rem, 1px)` }">
                    <CircledQuestionMarkIcon @click.stop slot="trigger"/>
                    <p>{{ $t('Not all accounts provided by this bank support instant transactions.') }}</p>
                    <p>{{ $t('Contact your bank to find out if your account is eligible.') }}</p>
                </Tooltip>
                <Tooltip
                    v-else-if="checkBankSupport(bank, SEPA_INSTANT_SUPPORT.FULL_OR_SHARED)"
                    class="alert-triangle-icon"
                    preferredPosition="bottom left"
                    theme="inverse"
                    ref="tooltips$"
                    :container="bankAutocomplete$ && { $el: bankAutocomplete$ }"
                    :styles="{ transform: `translate3d(${isScrollable ? -1 : 5}%, 2rem, 1px)` }">
                    <AlertTriangleIcon @click.stop slot="trigger"/>
                    <template v-if="direction == 'outbound'">
                        <p>{{ $t('Without an individual IBAN, refunds are impossible!') }}</p>
                        <p>{{ $t('{bankName} offers generic and individual IBANs.', { bankName: bank.name }) }}</p>
                        <p>{{ $t('In case of any issues, like exceeded limits or insufficient amounts, '
                            + 'the automatic refunds will only work for individual IBAN addresses.') }}</p>
                    </template>
                    <template v-else>
                        <p>{{ $t('Don’t use a generic IBAN!') }}</p>
                        <p>{{ $t('{bankName} offers generic and individual IBANs.', { bankName: bank.name }) }}</p>
                        <p class="nq-orange">{{ $t('Selling and refunds will not work with a generic IBAN!') }}</p>
                    </template>
                </Tooltip>
            </li>
            <li class="more-count" v-if="!bankToConfirm && matchingBanks.length > visibleBanks.length">
                <a @click="isScrollable = true">
                    {{ $tc('+ {count} more | + {count} more', matchingBanks.length - visibleBanks.length) }}
                </a>
            </li>
            <li class="confirm-bank" v-if="bankToConfirm">
                <i18n path="I understand that I have to send a {sepaInstantLink}." tag="p">
                    <template v-slot:sepaInstantLink>
                        <strong>{{ $t('SEPA Instant transaction') }}</strong>
                    </template>
                </i18n>
                <button class="nq-button-pill light-blue" @click="confirmBank" @mousedown.prevent>
                    {{ $t('Got it') }}
                </button>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted } from 'vue';
import { LabelInput, CaretRightSmallIcon, Tooltip, AlertTriangleIcon, CrossIcon } from '@nimiq/vue-components';
import { Bank, BANK_NETWORK, SEPA_INSTANT_SUPPORT, loadBankList } from '@nimiq/oasis-bank-list';
import BankIcon from './icons/BankIcon.vue';
import CircledQuestionMarkIcon from './icons/CircledQuestionMark.vue';
import ForbiddenIcon from './icons/ForbiddenIcon.vue';
import CountrySelector from './CountrySelector.vue';
import { SEPA_COUNTRY_CODES } from '../lib/Countries';

type CountryInfo = {
    name: string,
    code: string,
}

// Define the tooltip interface with the methods that are actually used
interface TooltipInstance {
    isShown: boolean;
    show(): void;
    hide(): void;
}

function unicodeNormalize(s: string) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const BankCheckInput = defineComponent({
    props: {
        value: {
            type: String,
            default: '',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        direction: {
            type: String as () => 'inbound' | 'outbound',
            required: true,
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
        const normalizedLocalValue = computed(() =>
            unicodeNormalize(localValue.value
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue'),
            ),
        );

        const bankSearchInput$ = ref<LabelInput | null>(null);
        const bankAutocomplete$ = ref<HTMLUListElement | null>(null);
        const tooltips$ = ref<Array<TooltipInstance>>([]);

        const selectedBankIndex = ref(0);
        const currentCountry = ref<CountryInfo | null>(null);
        const countryDropdownOpened = ref(false);
        const isScrollable = ref(false);

        const intlCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

        const bankToConfirm = ref<Bank & { tooltip: undefined } | null>(null);

        /* Lazy-load the complete bank lists */
        const banks = ref<Bank[]>([]);
        onMounted(() => {
            loadBankList().then((BANKS: Bank[]) => banks.value = BANKS);
        });

        function focus() {
            if (!bankSearchInput$.value) return;
            bankSearchInput$.value.focus();
        }

        /* List of available banks in the currently selected country */
        const availableBanks = computed(() => {
            if (!currentCountry.value || currentCountry.value.code === 'all') return banks.value;
            const { code } = currentCountry.value;
            return banks.value.filter((bank) => bank.country === code);
        });

        /* List of banks matching the BIC or Name search */
        const matchingBanks = computed(() => {
            if (!localValue.value) return [];

            const rgx = RegExp(normalizedLocalValue.value, 'i');

            return Object.values(availableBanks.value).filter((bank) => {
                const normalizedBankName = unicodeNormalize(bank.name);

                const matchName = (normalizedBankName && rgx.test(normalizedBankName));
                const matchBIC = (bank.BIC && rgx.test(bank.BIC));

                if (bank.BIC && bank.BIC.length === 8) {
                    const rgxBankBIC = RegExp(`${bank.BIC}[\\w]{0,3}`, 'i');
                    const partiallyMatchBIC = rgxBankBIC.test(normalizedLocalValue.value);

                    return matchName || matchBIC || partiallyMatchBIC;
                }

                return matchName || matchBIC;
            }).sort((a, b) => {
                const aStartWithSearchTerm = unicodeNormalize(a.name).toLowerCase()
                    .startsWith(normalizedLocalValue.value.toLowerCase());
                const bStartWithSearchTerm = unicodeNormalize(b.name).toLowerCase()
                    .startsWith(normalizedLocalValue.value.toLowerCase());

                if (aStartWithSearchTerm && !bStartWithSearchTerm) return -1;
                if (!aStartWithSearchTerm && bStartWithSearchTerm) return 1;

                if (a.name.length < b.name.length) return -1;
                if (b.name.length < a.name.length) return 1;

                return intlCollator.compare(a.name, b.name);
            });
        });

        /* List of banks displayed to the user. */
        const visibleBanks = computed(() => {
            if (bankToConfirm.value) return [bankToConfirm.value];

            const b: (Bank & { tooltip?: TooltipInstance })[] = [...(
                isScrollable.value
                    ? matchingBanks.value
                    : matchingBanks.value.slice(0, 3)
            )];

            if (tooltips$.value.length === 0) return b;

            for (let i = 0, tIndex = 0; i < b.length; i++) {
                if (checkBankSupport(b[i], SEPA_INSTANT_SUPPORT.FULL_OR_SHARED)) {
                    b[i].tooltip = tooltips$.value[tIndex] as TooltipInstance;
                    tIndex++;
                }
            }

            return b;
        });

        /* Show warning if any visible bank is not fully supporting SEPA instant */
        const showWarning = computed(() =>
            matchingBanks.value.some(
                (bank: Bank) => !checkBankSupport(bank, SEPA_INSTANT_SUPPORT.FULL)),
        );

        /* Reset the selectedBankIndex to 0 on text input */
        watch(localValue, () => {
            selectedBankIndex.value = 0;
            bankToConfirm.value = null;
        });

        /* Show bank tooltip when a bank is selected and if the tooltip is accessible */
        watch(selectedBankIndex, () => {
            if (visibleBanks.value[selectedBankIndex.value]?.tooltip?.isShown) return;

            visibleBanks.value.forEach((bank, index) => {
                if (index !== selectedBankIndex.value && bank.tooltip && bank.tooltip.isShown) bank.tooltip.hide();
                if (index === selectedBankIndex.value && bank.tooltip && !bank.tooltip.isShown) bank.tooltip.show();
            });
        });

        /* Country dropdown watch: onOpen -> focus input | onClose -> clear input & focus bank search */
        watch(countryDropdownOpened, (newBool, oldBool) => {
            if (!newBool && oldBool) { // onClose
                if (bankSearchInput$.value) {
                    bankSearchInput$.value.focus();
                }
            }
        });

        watch([localValue, countryDropdownOpened], () => isScrollable.value = false);

        /* Keyboard navigation */
        function onKeyDown(event: KeyboardEvent) {
            if ((!matchingBanks || !bankAutocomplete$.value) && (!countryDropdownOpened.value)) return;
            const oldBankIndex = selectedBankIndex.value;

            if (countryDropdownOpened.value) { // country list
                // Ignore
            } else { // bank list
                switch (event.key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        selectedBankIndex.value = Math.max(0, Math.min(
                            visibleBanks.value.length - 1, selectedBankIndex.value + 1),
                        );
                        break;

                    case 'ArrowUp':
                        event.preventDefault();
                        selectedBankIndex.value = Math.max(0, Math.min(
                            visibleBanks.value.length - 1, selectedBankIndex.value - 1),
                        );
                        break;

                    case 'Enter':
                        selectBank(visibleBanks.value[selectedBankIndex.value]);
                        break;

                    default:
                        break;
                }

                if (selectedBankIndex.value !== oldBankIndex && bankAutocomplete$.value) {
                    bankAutocomplete$.value.children[selectedBankIndex.value].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
            }
        }

        function selectBank(bank: Bank & { tooltip?: TooltipInstance }) {
            if (bankToConfirm.value?.BIC === bank.BIC) return;

            // Only continue if the selected bank supports the wanted direction
            if (getBankSupport(bank) === SEPA_INSTANT_SUPPORT.NONE) {
                if (bankSearchInput$.value) bankSearchInput$.value.focus();
                return;
            }

            if (bank.tooltip && bank.tooltip.isShown) bank.tooltip.hide();

            if (props.direction === 'outbound') {
                // Trigger an extra confirmation step when user has to send fiat
                bankToConfirm.value = { ...bank, tooltip: undefined }; // Remove reference to unmounted tooltip
            } else {
                setBank(bank);
            }
        }

        function confirmBank() {
            if (!bankToConfirm.value) return;
            setBank(bankToConfirm.value);
        }

        function setBank(bank: Bank & { tooltip?: TooltipInstance }) {
            localValue.value = bank.name;
            context.emit('bank-selected', { ...bank, tooltip: undefined } as Bank);
        }

        /**
         * Return `true` if one of the bank network match the `instantSupportType` arg.
         * For example: if a bank fully supports TIPS (`FULL`) but does not support RT1 (`NONE`),
         * it will return `true` for `FULL` and `NONE` support.
         * To check for the higher support capability please use the `getBankSupport` function.
         */
        function checkBankSupport(
            bank: Bank,
            instantSupportType: SEPA_INSTANT_SUPPORT,
        ): boolean {
            return Object.values(BANK_NETWORK).some(
                (network) => bank.support[network] && bank.support[network]![props.direction] === instantSupportType,
            );
        }

        /**
         * Return the higher support capability of the bank, no matter the network.
         * For example: if a bank supports TIPS (`FULL`) but does not support RT1 (`NONE`),
         * it will still return `FULL` since at least one network is fully supported.
         */
        function getBankSupport(bank: Bank) {
            if (checkBankSupport(bank, SEPA_INSTANT_SUPPORT.FULL)) return SEPA_INSTANT_SUPPORT.FULL;
            if (checkBankSupport(bank, SEPA_INSTANT_SUPPORT.FULL_OR_SHARED)) return SEPA_INSTANT_SUPPORT.FULL_OR_SHARED;
            if (checkBankSupport(bank, SEPA_INSTANT_SUPPORT.PARTIAL)) return SEPA_INSTANT_SUPPORT.PARTIAL;
            if (checkBankSupport(bank, SEPA_INSTANT_SUPPORT.UNKNOWN)) return SEPA_INSTANT_SUPPORT.UNKNOWN;
            return SEPA_INSTANT_SUPPORT.NONE;
        }

        /* set a country as the currently selected one */
        function selectCountry(country: CountryInfo) {
            currentCountry.value = country;
        }

        /* Those 3 functions are used to highlight the matched string in the bank autocomplete list */
        function getMatchPrefix(s: string) {
            const normalizedStr = unicodeNormalize(s);
            const rgx = new RegExp(`^(.*?)${normalizedLocalValue.value}`, 'i');
            const match = normalizedStr.match(rgx);

            if (!match) return '';

            return s.substr(0, match[1].length);
        }
        function getMatch(s: string) {
            const normalizedStr = unicodeNormalize(s);
            const rgx = new RegExp(normalizedLocalValue.value, 'i');
            const match = normalizedStr.match(rgx);
            const maxlen = 23;
            let i = 2;

            if (!match) return '';

            const originalMatch = s.substr(normalizedStr.indexOf(match[0]), match[0].length);

            if (originalMatch.length <= 4 || s.length < maxlen) return originalMatch;
            if (s.length - (originalMatch.length - 4) <= maxlen) {
                i = 2 + (maxlen - (s.length - (originalMatch.length - 4)));
            }

            return `${originalMatch.substr(0, 2)}...${originalMatch.substr(originalMatch.length - i, i)}`;
        }
        function getMatchSuffix(s: string) {
            const normalizedStr = unicodeNormalize(s);
            const rgx = new RegExp(`${normalizedLocalValue.value}(.*?)$`, 'i');
            const match = normalizedStr.match(rgx);

            if (!match) return '';

            const tmp = s.substr(normalizedStr.lastIndexOf(match[1]));

            return tmp;
        }

        /* if the search match the bank name: return true. Otherwise it's probably a BIC search: return false */
        function shouldHighlightMatch(bankName: string) {
            const rgx = new RegExp(normalizedLocalValue.value, 'i');
            return rgx.test(unicodeNormalize(bankName));
        }

        return {
            focus, // exposed for use from other components

            SEPA_INSTANT_SUPPORT,

            bankSearchInput$,
            bankAutocomplete$,
            tooltips$,

            localValue,
            matchingBanks,
            visibleBanks,
            selectedBankIndex,

            onKeyDown,
            selectBank,
            bankToConfirm,
            confirmBank,
            checkBankSupport,
            getBankSupport,

            showWarning,
            getMatchPrefix,
            getMatch,
            getMatchSuffix,
            shouldHighlightMatch,

            SEPA_COUNTRY_CODES,
            countryDropdownOpened,
            selectCountry,

            isScrollable,
        };
    },
    components: {
        LabelInput,
        CaretRightSmallIcon,
        BankIcon,
        CircledQuestionMarkIcon,
        ForbiddenIcon,
        Tooltip,
        CountrySelector,
        AlertTriangleIcon,
        CrossIcon,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type BankCheckInput = InstanceType<typeof BankCheckInput>;
export default BankCheckInput;
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.bank-check-input {
    width: 35.5rem;
    margin: 0 auto;

    position: relative;
    font-weight: 600;

    .label-input {
        font-size: 3rem !important;

        ::v-deep input {
            width: 100% !important;
            padding: 1.75rem 2rem;
            padding-right: 6.5rem;

            &::placeholder {
                transition: color 200ms var(--nimiq-ease);
                mask: linear-gradient(90deg,
                    white,
                    white calc(100% - 5rem),
                    rgba(255,255,255, 0) calc(100% - .25rem),
                );
            }

            .disabled & {
                color: var(--text-50);
            }
        }
    }
}

.country-selector {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);

    ::v-deep .trigger {
        padding: 1.5rem 1rem;
    }

    ::v-deep .dropdown {
        left: unset;
        right: 0.25rem;
        top: 0;
        transform: none;
    }

    .info {
        font-size: var(--small-size) !important;
        color: rgba(white, .5);
        padding-bottom: 2.5rem !important;
    }
}

.bank-autocomplete {
    @extend %custom-scrollbar-inverse;

    display: flex;
    flex-direction: column;
    overflow: visible;

    width: 42.5rem;
    margin: 0;
    margin-top: -.25rem;
    padding: .5rem;

    position: absolute;
    z-index: 4;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);

    background: var(--nimiq-blue-bg);
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0px 1.125rem 2.25rem rgba(0, 0, 0, 0.1);
    list-style-type: none;
    text-align: left;
    user-select: none;

    &.scroll {
        max-height: 37.5rem;
        overflow-y: auto;
        overflow-x: hidden;
    }

    li.bank {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-shrink: 0;
        padding: 1rem 1.5rem;
        border-radius: 0.25rem;
        font-weight: 400;
        cursor: pointer;
        height: 7rem;
        overflow: visible;

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

        & > div.flex-column {
            flex-grow: 1;
            transform: translateY(10px);
            white-space: nowrap;
            overflow: hidden;

            mask: linear-gradient(90deg,
                white,
                white calc(100% - 5rem),
                rgba(255,255,255, 0) calc(100% - .5rem),
            );

            transition: transform 200ms cubic-bezier(0.5, 0, 0.15, 1);

            span {
                font-size: 2.25rem;
            }
        }

        .bic {
            opacity: 0;
            font-weight: 500;
            font-size: 1.625rem;
            line-height: 110%;
            letter-spacing: 0.0625rem;
            margin-top: 0.5rem;
            font-weight: 500;
            font-family: 'Fira Mono';

            transition: opacity 200ms cubic-bezier(0.5, 0, 0.15, 1);
        }

        &:hover,
        &.selected {
            & > div.flex-column {
                transform: translateY(0);
            }

            .bic {
                opacity: .5;
            }
        }

        .caret-right-small-icon {
            opacity: 0.3;
            transition: opacity 200ms var(--nimiq-ease);
        }

        .circled-question-mark,
        .alert-triangle-icon {
            flex-shrink: 0;
            flex-grow: 0;

            &.tooltip ::v-deep .tooltip-box {
                width: 32rem;
                box-shadow:
                    0px 18px 38px nimiq-blue(0.14),
                    0px 7px 8.5px nimiq-blue(0.08),
                    0px 2px 2.5px nimiq-blue(0.04);
            }

            svg {
                color: var(--nimiq-orange);
            }

            p {
                line-height: 130%;
            }

            p:first-child {
                color: var(--text-100);
                margin-bottom: 1rem;
            }

            p:not(:first-child) {
                color: var(--text-60);
                margin-top: 0;
                margin-bottom: .5rem;
                font-size: var(--small-size);
            }

            p:last-child {
                margin-bottom: 0;
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

    .forbidden-icon {
        height: 2.5rem;
        width: 2.5rem;
        margin: 0.25rem 1.25rem 0.25rem 0.25rem;
    }

    li.more-count {
        font-size: var(--small-size);
        margin-left: 1.5rem;
        margin-bottom: 1.75rem;

        a {
            opacity: .5;
            cursor: pointer;

            &:hover,
            &:focus {
                opacity: .75;
            }
        }
    }

    .cancel-bank {
        width: 3.5rem;
        height: 3.5rem;
        flex-shrink: 0;
        margin-left: -0.5rem;
        margin-right: -0.75rem;
        padding: 0.75rem;
        border-radius: 50%;
        transition: background 0.2s var(--nimiq-ease);

        .nq-icon {
            width: 100%;
            height: 100%;
        }

        &:hover,
        &:focus {
            background: rgba(white, 0.1);
        }
    }

    li.confirm-bank {
        padding: 1rem;
        font-size: var(--body-size);
        color: rgba(white, 0.6);
        white-space: pre-line;

        p {
            margin-top: 0;
        }

        strong {
            color: white;
            white-space: pre;
        }
    }

    li.warning {
        font-size: var(--small-size);
        line-height: 130%;
        margin: 0.5rem;
        padding: 1rem;
        border-top: 1px solid rgba(white, 0.2);
        opacity: 0.6;
    }
}

@media (max-width: 450px) { // Vue-components breakpoint
    .bank-check-input {
        width: 90%;
    }

    .bank-autocomplete {
        width: 120%;

        li.bank {
            & > div.flex-column {
                transform: translateY(0);
            }

            .bic {
                opacity: .5;
            }
        }
    }
}

@media (hover: none) {
    .bank-autocomplete li.bank {
        & > div.flex-column {
            transform: translateY(0);
        }

        .bic {
            opacity: .5;
        }
    }
}

</style>

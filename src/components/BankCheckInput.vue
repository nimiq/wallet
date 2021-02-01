<template>
    <div class="bank-check-input"
        :class="{
            disabled,
            autocomplete: matchingBanks && matchingBanks.length > 0 && localValue.length >= 2,
            writing: localValue.length > 0,
        }"
        @keydown="onKeyDown"
    >
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled" ref="$bankSearchInput"/>
        <div class="country-selector" v-click-outside="() => countryDropdownOpened = false">
            <button class="reset trigger" @click="countryDropdownOpened = true">
                <FlagIcon v-if="currentCountry && currentCountry.code === 'all'"/>
                <CountryFlag v-else-if="currentCountry" :code="currentCountry.code" />
                <img src="../assets/arrow-down.svg" />
            </button>
            <div v-if="countryDropdownOpened" class="country-dropdown">
                <div class="country-search">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
                        <g fill="none" stroke="#FFF" stroke-linecap="round"
                            stroke-linejoin="round" stroke-width="1.5px">
                            <circle cx="5.5" cy="5.5" r="4.5" />
                            <line x1="13" y1="13" x2="9" y2="9" />
                        </g>
                    </svg>
                    <input class="nq-input"
                        :placeholder="$t('Search')"
                        v-model="countrySearch"
                        ref="$countrySearchInput"/>
                </div>
                <ul class="country-list" ref="$countryAutocomplete">
                    <li v-for="(country, index) in countries"
                        :key="country.code"
                        :class="{ selected: index === selectedCountryIndex }"
                        @click="selectCountry(country)"
                        @mouseenter="selectedCountryIndex = index"
                    >
                        <FlagIcon v-if="country.code === 'all'"/>
                        <CountryFlag v-else :code="country.code" />
                        {{ country.name }}
                    </li>
                    <li class="info">{{ $t('More locations will be supported soon.') }}</li>
                </ul>
            </div>
        </div>
        <ul class="bank-autocomplete" v-if="matchingBanks && matchingBanks.length > 0" ref="$bankAutocomplete">
            <li class="bank"
                v-for="(bank, index) in visibleBanks" :key="index"
                :class="{ selected: selectedBankIndex === index }"
                :disabled="bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.NONE"
                :title="bank.name"
                @mouseenter="selectedBankIndex = index"
                @click="selectBank(bank)"
                @mousedown.prevent
            >
                <BankIcon v-if="bank.support.sepa.outbound !== SEPA_INSTANT_SUPPORT.NONE"/>
                <ForbiddenIcon v-else />

                <span v-if="shouldHighlightMatch(bank.name)">{{
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
                    + ' Some banks don’t support it yet, but are likely to do so in the future.') }}
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted } from '@vue/composition-api';
import { LabelInput, CaretRightSmallIcon, Tooltip } from '@nimiq/vue-components';
import { SEPA_INSTANT_SUPPORT, BankInfos } from '@/stores/Swaps';
// @ts-expect-error Could not find a declaration file for module 'v-click-outside'.
import vClickOutside from 'v-click-outside';
import loadBankList from '@/data/banksList';
import I18nDisplayNames from '@/lib/I18nDisplayNames';
import BankIcon from './icons/BankIcon.vue';
import CircledQuestionMarkIcon from './icons/CircledQuestionMark.vue';
import ForbiddenIcon from './icons/ForbiddenIcon.vue';
import CountryFlag from './CountryFlag.vue';
import FlagIcon from './icons/FlagIcon.vue';

const MAX_VISIBLE_ITEMS = 3;

type CountryInfo = {
    name: string,
    code: string,
}

function unicodeNormalize(s: string) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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
        const normalizedLocalValue = computed(() =>
            unicodeNormalize(localValue.value
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue'),
            ),
        );

        const $bankSearchInput = ref<LabelInput | null>(null);
        const $countrySearchInput = ref<HTMLInputElement | null>(null);
        const $bankAutocomplete = ref<HTMLUListElement | null>(null);
        const $countryAutocomplete = ref<HTMLUListElement | null>(null);

        const selectedBankIndex = ref(0);
        const selectedCountryIndex = ref(0);
        const currentCountry = ref<CountryInfo | null>(null);
        const countryDropdownOpened = ref(false);
        const countrySearch = ref<string>();

        const i18nCountryName = new I18nDisplayNames('region');
        const intlCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

        /* Lazy-load the complete bank lists */
        const banks = ref<BankInfos[]>([]);
        onMounted(() => {
            selectCountry(countries.value[0]);
            loadBankList().then((BANKS) => banks.value = BANKS);
        });

        /* List of country there's an available bank in. Filtered by country name from countrySearch */
        const countries = computed(() => {
            const rgx = RegExp(countrySearch.value || '', 'i');
            const countryCodes: string[] = [];

            banks.value.forEach(({ country }) => {
                if (!countryCodes.includes(country)) {
                    countryCodes.push(country);
                }
            });

            const unfilteredCountries = countryCodes.map((code) => ({
                code,
                name: i18nCountryName.of(code) || '',
            }));

            unfilteredCountries.unshift({
                code: 'all',
                name: context.root.$t('All countries') as string,
            });

            const filteredCountries = unfilteredCountries
                .filter((country) => country.name && rgx.test(country.name));

            return filteredCountries
                .sort((a, b) => {
                    if (a.code === 'all') return -1;
                    if (b.code === 'all') return 1;
                    return intlCollator.compare(a.name, b.name);
                });
        });

        /* List of available banks in the currently selected country */
        const availableBanks = computed(() => {
            if (currentCountry.value?.code === 'all') return banks.value;
            return banks.value.filter((bank) => bank.country === currentCountry.value?.code);
        });

        /* List of banks matching the BIC or Name search */
        const matchingBanks = computed(() => {
            if (!localValue.value) return [];

            const rgx = RegExp(normalizedLocalValue.value, 'i');

            return Object.values(availableBanks.value).filter((bank) => {
                const normalizedBankName = unicodeNormalize(bank.name);

                return (normalizedBankName && rgx.test(normalizedBankName)) || (bank.BIC && rgx.test(bank.BIC));
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

        /* List of banks displayed to the user. Based on MAX_VISIBLE_ITEMS */
        const visibleBanks = computed(() => matchingBanks.value.slice(0, MAX_VISIBLE_ITEMS));

        /* Reset the selectedBankIndex to 0 on text input */
        watch(localValue, () => selectedBankIndex.value = 0);

        /* Reset the selectedCountryIndex to 0 on text input */
        watch(countrySearch, () => selectedCountryIndex.value = 0);

        /* Keyboard navigation */
        function onKeyDown(event: KeyboardEvent) {
            if ((!matchingBanks || !$bankAutocomplete.value) && (!countryDropdownOpened.value)) return;
            const oldCountryIndex = selectedCountryIndex.value;
            const oldBankIndex = selectedBankIndex.value;

            if (countryDropdownOpened.value) { // country list
                switch (event.key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        selectedCountryIndex.value = Math.max(0, Math.min(
                            countries.value.length - 1, selectedCountryIndex.value + 1),
                        );
                        break;

                    case 'ArrowUp':
                        event.preventDefault();
                        selectedCountryIndex.value = Math.max(0, Math.min(
                            countries.value.length - 1, selectedCountryIndex.value - 1),
                        );
                        break;

                    case 'Enter':
                        if (countries.value[selectedCountryIndex.value]) {
                            selectCountry(countries.value[selectedCountryIndex.value]);
                        } else if (countries.value.length > 0) {
                            selectCountry(countries.value[0]);
                        }
                        break;

                    default:
                        break;
                }

                if (selectedCountryIndex.value !== oldCountryIndex && $countryAutocomplete.value) {
                    $countryAutocomplete.value.children[selectedCountryIndex.value].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
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

                if (selectedBankIndex.value !== oldBankIndex && $bankAutocomplete.value) {
                    $bankAutocomplete.value.children[selectedBankIndex.value].scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }
            }
        }

        /* Emit a bank-selected with the choosen bank as arg, if this one have sepa outbound support */
        function selectBank(bank: BankInfos) {
            if (bank.support.sepa.outbound === SEPA_INSTANT_SUPPORT.NONE) {
                if ($bankSearchInput.value) $bankSearchInput.value.focus();
                return;
            }
            localValue.value = bank.name;
            context.emit('bank-selected', bank);
        }

        /* Show warning if any visible bank is not fully supporting SEPA instant */
        const showWarning = computed(() =>
            matchingBanks.value.some((bank: BankInfos) => bank.support.sepa.outbound !== SEPA_INSTANT_SUPPORT.FULL),
        );

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
            const maxlen = 25;
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

        /* if the search match the bank name: return true. Otherwise it's probaly a BIC search: return false */
        function shouldHighlightMatch(bankName: string) {
            const rgx = new RegExp(normalizedLocalValue.value, 'i');
            return rgx.test(unicodeNormalize(bankName));
        }

        /* set a country as the currently selected one */
        function selectCountry(country: CountryInfo) {
            currentCountry.value = country;

            if (countryDropdownOpened.value) {
                countryDropdownOpened.value = false;
            }
        }

        /* Country dropdown watch: onOpen -> focus input | onClose -> clear input & focus bank search */
        watch(countryDropdownOpened, (newBool, oldBool) => {
            if (newBool && !oldBool && $countrySearchInput.value) { // onOpen
                $countrySearchInput.value.focus();
            } else if (!newBool && oldBool) { // onClose
                countrySearch.value = '';

                if ($bankSearchInput.value) {
                    $bankSearchInput.value.focus();
                }
            }
        });

        return {
            SEPA_INSTANT_SUPPORT,

            $bankSearchInput,
            $countrySearchInput,
            $bankAutocomplete,
            $countryAutocomplete,

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
            shouldHighlightMatch,

            countries,
            currentCountry,
            countryDropdownOpened,
            selectCountry,
            selectedCountryIndex,
            countrySearch,
        };
    },
    methods: {
        focus() {
            (this.$refs.$bankSearchInput as LabelInput).focus();
        },
    },
    components: {
        LabelInput,
        CaretRightSmallIcon,
        BankIcon,
        CircledQuestionMarkIcon,
        ForbiddenIcon,
        Tooltip,
        CountryFlag,
        FlagIcon,
    },
    directives: {
        ClickOutside: vClickOutside.directive,
    },
});
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

        /deep/ input {
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

.flag-icon {
    display: block;
    width: 2.875rem;
    height: 2.875rem;
    background: var(--text-10);
    border-radius: 50%;
    padding: 0.5rem;
}

.country-selector {
    .trigger {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        position: absolute;
        right: 1.5rem;
        top: 50%;
        transform: translateY(-50%);

        .flag-icon,
        .country-flag {
            margin-right: 0.625rem;
        }
    }

    .country-dropdown {
        @extend %custom-scrollbar-inverse;

        display: flex;
        flex-direction: column;
        width: 22.25rem;

        position: absolute;
        right: -.5rem;
        top: -.5rem;

        background: var(--nimiq-blue-bg);
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0px 1.125rem 2.25rem rgba(0, 0, 0, 0.1);
        list-style-type: none;
        text-align: left;
        user-select: none;
    }

    .country-search {
        display: flex;
        flex-direction: row;
        align-items: center;

        padding: 1rem;
        border-bottom: 1.5px solid rgba(white, .15);

        svg {
            width: 1.75rem;
            height: 1.75rem;
            flex-shrink: 0;
            opacity: .4;
            margin-left: 0.75rem;
            margin-right: 1rem;
        }

        input {
            --border-color: transparent;
            width: auto;
            padding: 0.625rem;
            color: rgba(white, .6);
            min-width: 0;

            &:focus {
                color: white;
            }

            &::placeholder {
                color: rgba(white, .4);
            }
        }
    }

    .country-list {
        max-height: 25rem;
        padding: .5rem;
        padding-top: 1.5rem;
        padding-bottom: 0;
        margin: 0;
        overflow-y: auto;

        mask: linear-gradient(180deg,
            rgba(255, 255, 255, 0) 2%,
            #FFFFFF 12%,
            #FFFFFF 83%,
            rgba(255, 255, 255, 0) 98%
        );

        li {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 1rem;
            border-radius: 0.25rem;
            font-weight: 400;
            font-size: var(--body-size);

            &:not(.country-search):not(.info) {
                cursor: pointer;
                background-color: rgba(#FFFFFF, 0);
                transition: background-color 200ms var(--nimiq-ease);

                &:hover,
                &.selected {
                    background-color: rgba(#FFFFFF, .12);
                }
            }

            .flag-icon {
                background: rgba(255, 255, 255, 0.1);
                margin-right: 0.75rem;
            }

            .country-flag {
                margin-right: 1rem;
            }

            &.info {
                font-size: var(--small-size);
                color: rgba(white, .5);
                padding-bottom: 2.5rem;
            }
        }
    }
}

.bank-autocomplete {
    @extend %custom-scrollbar-inverse;

    display: none;
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
            mask: linear-gradient(90deg,
                white,
                white calc(100% - 5rem),
                rgba(255,255,255, 0) calc(100% - .5rem),
            );
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
                box-shadow:
                    0px 18px 38px rgba(31, 35, 72, 0.14),
                    0px 7px 8.5px rgba(31, 35, 72, 0.08),
                    0px 2px 2.5px rgba(31, 35, 72, 0.04);
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
        border-top: 1px solid rgba(white, 0.2);
        opacity: 0.6;
    }
}

@media (max-width: 450px) { // Vue-components breakpoint
    .bank-check-input {
        width: 80%;
    }

    .bank-autocomplete {
        width: 130%;
    }
}

</style>

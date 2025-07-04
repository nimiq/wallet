<template>
    <div class="country-selector" v-click-outside="() => setOpen(false)" @keydown="onKeyDown">
        <button class="reset trigger" @click="setOpen(true)">
            <slot name="trigger">
                <div class="flex-row">
                    <CountryFlag :code="currentCountryCode || 'all'" />
                    <img src="../assets/mini-arrow-down.svg" alt="open"/>
                </div>
            </slot>
        </button>
        <div v-if="isOpen" class="dropdown">
            <div class="search">
                <!-- Search icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
                    <g fill="none" stroke="#FFF" stroke-linecap="round"
                        stroke-linejoin="round" stroke-width="1.5px">
                        <circle cx="5.5" cy="5.5" r="4.5" />
                        <line x1="13" y1="13" x2="9" y2="9" />
                    </g>
                </svg>
                <input class="nq-input"
                    :placeholder="$t('Search')"
                    v-model="searchTerm"
                    ref="input$"/>
            </div>
            <ul class="list" ref="list$">
                <li v-for="(country, index) in sortedCountries"
                    :key="country.code"
                    :class="{ selected: index === selectedIndex }"
                    @click="selectCountry(country)"
                    @mouseenter="selectedIndex = index"
                    @focusin="selectedIndex = index"
                >
                    <CountryFlag :code="country.code" />
                    {{ country.name }}
                </li>
                <slot name="info"/>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, nextTick } from 'vue';
// @ts-expect-error Could not find a declaration file for module 'v-click-outside'.
import vClickOutside from 'v-click-outside';
import { useI18n } from '@/lib/useI18n';
import I18nDisplayNames from '../lib/I18nDisplayNames';
import CountryFlag from './CountryFlag.vue';
import { ALL_COUNTRY_CODES } from '../lib/Countries';

type Country = {
    code: string,
    name: string,
}

function normalize(str: string) {
    return str
        .replace(/ä/ig, 'a')
        .replace(/ö/ig, 'o')
        .replace(/ü/ig, 'u');
}

export default defineComponent({
    props: {
        countryCodes: {
            type: Array as () => string[],
            default: () => ALL_COUNTRY_CODES,
        },
        includeAllOption: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const { $t } = useI18n();
        const isOpen = ref(false);

        const selectedIndex = ref(0);

        const currentCountryCode = ref(props.includeAllOption ? 'all' : props.countryCodes[0]);

        const searchTerm = ref('');

        const input$ = ref<HTMLInputElement | null>(null);
        const list$ = ref<HTMLUListElement | null>(null);

        async function setOpen(open: boolean) {
            isOpen.value = open;
            context.emit(open ? 'open' : 'close');

            if (!open) {
                searchTerm.value = '';
                selectedIndex.value = 0;
            }

            await nextTick();
            if (open && input$.value) input$.value.focus();
        }

        function selectCountry(country: Country) {
            currentCountryCode.value = country.code;
            context.emit('select', country);
            setOpen(false);
        }

        const i18nCountryName = new I18nDisplayNames('region');
        const filteredCountries = computed(() => {
            const rgx = RegExp(normalize(searchTerm.value || ''), 'i');

            const countries: Country[] = props.countryCodes.map((code) => ({
                code,
                name: i18nCountryName.of(code) || '',
            }));

            if (props.includeAllOption) {
                countries.unshift({
                    code: 'all',
                    name: $t('All countries') as string,
                });
            }

            return countries.filter((country) => country.name && rgx.test(normalize(country.name)));
        });

        const intlCollator = new Intl.Collator(undefined, { sensitivity: 'base' });
        const sortedCountries = computed(() => [...filteredCountries.value].sort((a, b) => {
            if (a.code === 'all') return -1;
            if (b.code === 'all') return 1;
            return intlCollator.compare(a.name, b.name);
        }));

        watch(searchTerm, () => selectedIndex.value = 0);

        function onKeyDown(event: KeyboardEvent) {
            if (!isOpen.value) return;
            const oldIndex = selectedIndex.value;
            const countryCount = sortedCountries.value.length;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    selectedIndex.value = Math.max(0, Math.min(
                        countryCount - 1, selectedIndex.value + 1),
                    );
                    break;

                case 'ArrowUp':
                    event.preventDefault();
                    selectedIndex.value = Math.max(0, Math.min(
                        countryCount - 1, selectedIndex.value - 1),
                    );
                    break;

                case 'Enter':
                    if (sortedCountries.value[selectedIndex.value]) {
                        selectCountry(sortedCountries.value[selectedIndex.value]);
                    } else if (countryCount > 0) {
                        selectCountry(sortedCountries.value[0]);
                    }
                    break;

                default:
                    break;
            }

            if (selectedIndex.value !== oldIndex && list$.value) {
                list$.value.children[selectedIndex.value].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }

        return {
            isOpen,
            selectedIndex,
            currentCountryCode,
            searchTerm,
            setOpen,
            selectCountry,
            sortedCountries,
            onKeyDown,
            input$,
            list$,
        };
    },
    components: {
        CountryFlag,
    },
    directives: {
        ClickOutside: vClickOutside.directive,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.country-selector {
    position: relative;

    .trigger {
        display: block;

        .flex-row {
            justify-content: space-between;
            align-items: center;

            // position: absolute;
            // right: 1.5rem;
            // top: 50%;
            // transform: translateY(-50%);

            .country-flag {
                margin-right: 0.625rem;
            }
        }
    }

    .dropdown {
        display: flex;
        flex-direction: column;
        width: 22.25rem;

        position: absolute;
        left: 50%;
        top: -0.5rem;
        transform: translateX(-50%);

        background: var(--nimiq-blue-bg);
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0px 1.125rem 2.25rem rgba(0, 0, 0, 0.1);
        list-style-type: none;
        text-align: left;
        user-select: none;
    }

    .search {
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

    .list {
        max-height: 25rem;
        padding: 1.5rem 0.5rem 0.5rem;
        margin: 0;
        overflow-y: auto;

        mask: linear-gradient(180deg,
            rgba(255, 255, 255, 0) 2%,
            white 12%,
            white 83%,
            rgba(255, 255, 255, 0) 98%
        );

        @extend %custom-scrollbar-inverse;

        li {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 1rem;
            border-radius: 0.25rem;
            font-weight: 400;
            font-size: var(--body-size);

            &:not(.info) {
                cursor: pointer;
                background-color: rgba(white, 0);
                transition: background-color 200ms var(--nimiq-ease);

                &:hover,
                &.selected {
                    background-color: rgba(white, .12);
                }
            }

            .country-flag {
                margin-right: 1rem;
                flex-shrink: 0;
            }
        }
    }
}
</style>

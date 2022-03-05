<template>
    <div class="selector">
        <button class="reset trigger" @click="setOpen(true)" @focus="setOpen(true)" @blur="setOpen(false)">
            <slot name="trigger">
                <!-- FIXME: Trigger has no default UI for now -->
            </slot>
        </button>
        <div v-if="isOpen" class="dropdown">
            <div class="search" v-if="searchable">
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
                    ref="$input"/>
            </div>
            <ul class="list" ref="$list" :class="{ 'searchable': searchable }">
                <li
                    v-for="(option, index) in sortedOptions"
                    :key="index"
                    :class="{ selected: index === selectedIndex }"
                    @click="selectOption(option)"
                    @mouseenter="selectedIndex = index"
                >
                    <slot name="nimiq-option" :option="option">
                        {{ option }}
                    </slot>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import { useKeys } from '../composables/useKeys';
import { useOutsideClick } from '../composables/useOutsideClick';

function normalize(str: string) {
    return str
        .replace(/ä/ig, 'a')
        .replace(/ö/ig, 'o')
        .replace(/ü/ig, 'u');
}

type NimiqSelectOptions = string[] | any[]
export default defineComponent({
    props: {
        options: {
            type: Array as () => NimiqSelectOptions,
            default: () => [],
        },
        searchable: {
            type: Boolean,
            default: false,
        },
        filterFunction: {
            type: Function as unknown as () =>
                (options: Readonly<NimiqSelectOptions>, searchItem: string) => NimiqSelectOptions,
        },
        sortFunction: {
            type: Function as unknown as () => (options: Readonly<NimiqSelectOptions>) => NimiqSelectOptions,
        },
    },
    setup(props, context) {
        const isOpen = ref(false);
        useOutsideClick(['.selector .dropdown'], () => setOpen(false));

        const selectedIndex = ref(0);

        const searchTerm = ref('');

        const $input = ref<HTMLInputElement>(null);
        const $list = ref<HTMLUListElement>(null);

        async function setOpen(open: boolean) {
            isOpen.value = open;
            context.emit(open ? 'open' : 'close');

            if (!open) {
                searchTerm.value = '';
                selectedIndex.value = 0;
            }

            await context.root.$nextTick();
            if (open && $input.value) $input.value.focus();
            if (open) handleMask();
        }

        function selectOption(option: string | any) {
            selectedIndex.value = props.options.indexOf(option);
            context.emit('select', option);
            setOpen(false);
        }

        function handleMask() {
            // Remove mask rule from CSS if user is scroll is not visible
            const list = document.querySelector('.selector .list') as HTMLDivElement;
            if (!list) return;

            const mask = list.scrollHeight > list.clientHeight
                ? `linear-gradient(180deg,
                    rgba(255, 255, 255, 0) 2%,
                    white 12%,
                    white 83%,
                    rgba(255, 255, 255, 0) 98%
                )`
                : 'none';
            list.style.mask = mask;
            (list.style as any)['-webkit-mask'] = mask;
        }

        const filteredOptions = computed(() => {
            if (!props.searchable) {
                return props.options;
            }
            if (!props.filterFunction) {
                const rgx = RegExp(normalize(searchTerm.value || ''), 'i');
                return props.options.filter((option) => rgx.test(normalize(option)));
            }
            return props.filterFunction(props.options, searchTerm.value);
        });

        const intlCollator = new Intl.Collator(undefined, { sensitivity: 'base' });
        const sortedOptions = computed(() => {
            if (props.sortFunction) {
                return props.sortFunction(filteredOptions.value);
            }
            return [...filteredOptions.value].sort((a, b) => {
                if (typeof a === 'string' && typeof b === 'string') {
                    return normalize(a).localeCompare(normalize(b));
                }
                return intlCollator.compare(a, b);
            });
        });

        watch(searchTerm, () => {
            selectedIndex.value = 0;
            handleMask();
        });

        function scrollIntoView() {
            if ($list.value) {
                $list.value.children[selectedIndex.value].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }

        useKeys([
            {
                key: 'ArrowDown',
                handler: () => {
                    selectedIndex.value = Math.max(
                        0, Math.min(sortedOptions.value.length - 1, selectedIndex.value + 1));
                    scrollIntoView();
                },
                options: { onlyIf: isOpen },
            },
            {
                key: 'ArrowUp',
                handler: () => {
                    selectedIndex.value = Math.max(0, Math.min(
                        sortedOptions.value.length - 1, selectedIndex.value - 1));
                    scrollIntoView();
                },
                options: { onlyIf: isOpen },
            },
            {
                key: 'Enter',
                handler: () => {
                    if (sortedOptions.value[selectedIndex.value]) {
                        selectOption(sortedOptions.value[selectedIndex.value]);
                    } else if (sortedOptions.value.length > 0) {
                        selectOption(sortedOptions.value[0]);
                    }
                },
                options: { onlyIf: isOpen },
            },
            {
                key: 'Escape',
                handler: () => setOpen(false),
                options: { onlyIf: isOpen },
            },
        ]);

        return {
            isOpen,
            selectedIndex,
            searchTerm,
            setOpen,
            selectOption,
            sortedOptions,
            $input,
            $list,
        };
    },
    components: {
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.selector {
    position: relative;

    .trigger {
        display: block;
        width: max-content;

        .flex-row {
            justify-content: space-between;
            align-items: center;
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
        padding: 0.5rem;
        margin: 0;
        overflow-y: auto;

        mask: linear-gradient(180deg,
            rgba(255, 255, 255, 0) 2%,
            white 12%,
            white 83%,
            rgba(255, 255, 255, 0) 98%
        );

        @extend %custom-scrollbar-inverse;

        &.searchable {
            padding: 1.5rem 0.5rem 0.5rem;
        }

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
        }
    }
}
</style>

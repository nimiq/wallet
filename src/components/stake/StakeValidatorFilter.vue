<template>
    <div class="validator-filter">
        <div class="validator-filter-wrapper" v-if="state !== FilterState.SEARCH">
            <button class="validator-switch" :class="{ selected: state === FilterState.TRUST }"
                @click="state = FilterState.TRUST">
                {{ $t('TrustScore') }}
            </button>
            <button class="validator-switch" :class="{ selected: state === FilterState.PAYOUT }"
                @click="state = FilterState.PAYOUT">
                {{ $t('Payout Time') }}
            </button>
            <button class="validator-switch" :class="{ selected: state === FilterState.REWARD }"
                @click="state = FilterState.REWARD">
                {{ $t('Reward') }}
            </button>
            <button class="validator-search-icon" @click="enableSearch">
                <SearchIcon />
            </button>
        </div>
        <div class="validator-filter-search-wrapper" v-else>
            <span class="validator-search-icon">
                <SearchIcon />
            </span>
            <input type="text" ref="$search" class="validator-search-box"
                :placeholder="$t('Type to search...')" />
            <button class="validator-search-close-icon" @click="state = FilterState.TRUST">
                <XCloseIcon />
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import SearchIcon from '../icons/Staking/SearchIcon.vue';
import XCloseIcon from '../icons/Staking/XCloseIcon.vue';

enum FilterState {
    TRUST,
    PAYOUT,
    REWARD,
    SEARCH,
}

export default defineComponent({
    setup() {
        const state = ref(FilterState.TRUST);
        const $search = ref<HTMLInputElement>();

        return {
            state,
            FilterState,
            $search,
            enableSearch: () => {
                state.value = FilterState.SEARCH;
                setTimeout(() => $search.value?.focus(), 0);
            },
        };
    },
    props: {
    },
    components: {
        SearchIcon,
        XCloseIcon,
    },
});
</script>

<style lang="scss" scoped>
.validator-filter {
    width: 38rem;
    height: 3.75rem;
    margin: auto;
    margin-bottom: 1.5rem;
    .validator-filter-wrapper {
        background-color: #f2f2f4;
        height: 3.75rem;
        border-radius: 2rem;
        padding: 0;
        padding-top: .25rem;

        .validator-switch {
            padding: .75rem 1.25rem;
            margin-right: 0.375rem;
            height: 3.25rem;

            border: 0;
            background: transparent;
            box-shadow: none;
            border-radius: 2rem;

            font-style: normal;
            font-weight: bold;

            font-size: 1.75rem;
            line-height: 1.75rem;
            text-align: center;

            color: #9c9eae;
            cursor: pointer;
            * {
                select: none;
            }

            &.selected {
                color: var(--nimiq-blue);
                background: white;
                box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.07),
                            0px 1.875px 3.75px rgba(0, 0, 0, 0.05),
                            0px 0.421263px 2.5px rgba(0, 0, 0, 0.0254662);
                border-radius: 22rem;
            }
        }

        .validator-search-icon {
            cursor: pointer;
            margin-left: -.5rem;
            border: 0;
            background: transparent;
            box-shadow: none;
            svg {
                width: 1.5rem;
                height: 1.5rem;
                circle {
                    stroke: rgba(31, 35, 72, 0.5);
                }
                line {
                    stroke: rgba(31, 35, 72, 0.5);
                }
            }
        }
    }
    .validator-filter-search-wrapper {
        display: flex;
        width: 22.875rem;
        height: 4rem;
        padding: 0.25rem;
        margin: auto;
        padding-top: 0.125rem;
        flex-direction: row;
        align-items: center;

        text-align: center;
        border: 0.1875rem solid rgba(5, 130, 202, 0.4);
        box-sizing: border-box;
        border-radius: 10.9375rem;

        .validator-search-icon {
            display: flex;
            height: 3.5rem;
            align-items: center;
            margin-left: 1rem;
            margin-right: .25rem;
            svg {
                width: 1.75rem;
                height: 1.75rem;
                circle {
                    stroke: rgba(5, 130, 202, .4);
                }
                line {
                    stroke: rgba(5, 130, 202, .4);
                }
            }
        }

        .validator-search-box {
            width: 15.125rem;
            font-size: 2rem;
            line-height: 1.75rem;
            color: #0582CA;
            opacity: 0.4;
            border: 0;
            &::placeholder { /* Chrome, Firefox, Opera, Safari 10.1+ */
                color: #0582CA;
            }
            &:-ms-input-placeholder { /* Internet Explorer 10-11 */
                color: #0582CA;
            }
        }

        .validator-search-close-icon {
            display: flex;
            height: 3.5rem;
            align-items: center;
            cursor: pointer;
            border: 0;
            background: transparent;
        }
    }
}
</style>

<template>
    <div class="stake-validator-filter">
        <SliderToggle class="validator-filter-wrapper" v-if="state !== FilterState.SEARCH"
            name="validator-filter" v-model="state">
            <template #[FilterState.TRUST]>
                <button class="validator-switch">
                    {{ $t('TrustScore') }}
                </button>
            </template>
            <template #[FilterState.REWARD]>
                <button class="validator-switch">
                    {{ $t('Reward') }}
                </button>
            </template>
            <template #[FilterState.SEARCH]>
                <button class="validator-search-icon">
                    <FatSearchIcon />
                </button>
            </template>
        </SliderToggle>
        <div class="validator-filter-search-wrapper" v-else>
            <span class="validator-search-icon">
                <FatSearchIcon />
            </span>
            <input type="text" ref="$search" class="validator-search-box"
                :placeholder="$t('Type to search...')" v-model="searchValue" />
            <button class="validator-search-close-icon" @click="state = FilterState.TRUST">
                <XCloseIcon />
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, watch, ref } from 'vue';
import { SliderToggle } from '@nimiq/vue-components';
import { nextTick } from '@/lib/nextTick';
import { FilterState } from '../../lib/StakingUtils';
import FatSearchIcon from '../icons/Staking/FatSearchIcon.vue';
import XCloseIcon from '../icons/Staking/XCloseIcon.vue';

export default defineComponent({
    setup(props, context) {
        const state = ref(FilterState.TRUST);
        const $search = ref<HTMLInputElement>();
        const searchValue = ref('');

        watch(state, () => {
            context.emit('changed', state.value);

            if (state.value === FilterState.SEARCH) {
                nextTick(() => $search.value?.focus());
            }
        });

        watch(searchValue, () => {
            context.emit('search', searchValue.value);
        });

        return {
            state,
            FilterState,
            $search,
            searchValue,
        };
    },
    components: {
        FatSearchIcon,
        XCloseIcon,
        SliderToggle,
    },
});
</script>

<style lang="scss" scoped>
.stake-validator-filter {
    // width: 38rem;
    width: fit-content;
    height: 3.75rem;
    margin: auto;
    margin-bottom: 1.5rem;
    white-space: nowrap;

    .validator-filter-wrapper {
        --horizontalPadding: 0.25rem;
        --verticalPadding: 0;
        --inactiveOpacity: 0.5;
        --padding: 0.25rem;

        white-space: nowrap;
        overflow: hidden;

        .validator-switch {
            font-family: inherit;
            padding-left: 1.25rem;
            padding-right: 1.25rem;
            height: 3.25rem;

            border: 0;
            background: transparent;
            box-shadow: none;

            font-style: normal;
            font-weight: 700;
            font-size: 1.75rem;

            color: var(--nimiq-blue);

            * { select: none }
        }

        .validator-search-icon {
            border: 0;
            background: transparent;
            box-shadow: none;

            svg {
                width: 2.375rem;
                height: 2.375rem;

                * {
                    stroke: currentColor;
                }

                line, circle {
                    stroke: rgb(31, 35, 72);
                    stroke-width: 2.0;
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
                opacity:  .7;

                line, circle {
                    stroke: rgb(5, 130, 202);
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
            color: #0582CA;
        }
    }
}
</style>

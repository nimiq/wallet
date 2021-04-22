<template>
    <div class="validator-filter">
        <div class="validator-filter-wrapper">
            <button class="validator-switch" :class="{ selected: state === FilterState.TRUST }"
                @click="ctrl.stateChange(FilterState.TRUST)">
                {{ $t('TrustScore') }}
            </button>
            <button class="validator-switch" :class="{ selected: state === FilterState.PAYOUT }"
                @click="ctrl.stateChange(FilterState.PAYOUT)">
                {{ $t('Payout Time') }}
            </button>
            <button class="validator-switch" :class="{ selected: state === FilterState.REWARD }"
                @click="ctrl.stateChange(FilterState.REWARD)">
                {{ $t('Reward') }}
            </button>
            <span class="validator-search" @click="ctrl.stateChange(FilterState.SEARCH)">
                <SearchIcon/>
            </span>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import SearchIcon from '../icons/Staking/SearchIcon.vue';

enum FilterState {
    TRUST,
    PAYOUT,
    REWARD,
    SEARCH,
}

export default defineComponent({
    setup() {
        const state = ref(FilterState.TRUST);

        return {
            state,
            FilterState,
            ctrl: {
                stateChange: (newState: FilterState) => {
                    state.value = newState;
                },
            },
        };
    },
    props: {
    },
    components: {
        SearchIcon,
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
                // box-shadow: 1px #555;
                color: var(--nimiq-blue);
                background: white;
                box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.07),
                            0px 1.875px 3.75px rgba(0, 0, 0, 0.05),
                            0px 0.421263px 2.5px rgba(0, 0, 0, 0.0254662);
                border-radius: 182.5px;
            }
        }

        .validator-search {
            cursor: pointer;
            background: transparent;
            svg {
                position: relative;
                top: .25rem;
                margin-left: .25rem;
            }
        }
    }
}
</style>

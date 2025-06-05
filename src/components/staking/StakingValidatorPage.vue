<template>
    <div class="staking-validator-page flex-column">
        <PageHeader @back="$emit('back')" :backArrow="backArrow">
            <template #default>
                {{ $t('Choose a Validator') }}
            </template>
            <!-- <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Earn rewards by locking NIM with a validator. Locked NIM stay under your control.') }}
                </p>
            </template> -->
        </PageHeader>
        <PageBody>
            <!-- <ValidatorFilter @changed="changeFilter" @search="onSearch"/> -->
            <div class="search flex-row">
                <input type="text" class="search-field nq-input flex-grow"
                    v-model="searchValue" :placeholder="$t('Search for validators...')"
                />
                <FatSearchIcon />
            </div>
            <div class="validator-list" ref="validatorList$">
                <div class="scroll-mask top"></div>
                <LoadingList v-if="validatorsList.length === 0" :length="5" :type="LoadingListType.VALIDATOR" />
                <ValidatorListItem
                    v-for="validator in sortedList" :key="validator.address"
                    :validator="validator"
                    :container="validatorList$"
                    @click.native="$emit('selectValidator', validator)"
                />
                <div class="scroll-mask bottom"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';

// import ValidatorFilter from './ValidatorFilter.vue';
import ValidatorListItem from './ValidatorListItem.vue';
import { FilterState } from '../../lib/StakingUtils';
import LoadingList, { LoadingListType } from '../LoadingList.vue';
import FatSearchIcon from '../icons/Staking/FatSearchIcon.vue';

export default defineComponent({
    props: {
        backArrow: {
            type: Boolean,
            default: true,
        },
    },
    setup() {
        const { validatorsList } = useStakingStore();

        const validatorList$ = ref<HTMLElement | null>(null);

        const filter = ref(FilterState.TRUST);
        const changeFilter = (newFilter: FilterState) => filter.value = newFilter;

        const sortedList = computed(() => {
            switch (filter.value) {
                // case FilterState.SEARCH:
                //     return validatorsList.value.filter((validator) => {
                //         if (searchValue.value.length < 3) {
                //             // Only show pools by default when search string is less than 3 characters
                //             return 'name' in validator;
                //         }

                //         const searchTerm = searchValue.value.toLowerCase().replace(/\s+/g, '');
                //         const validatorLabel = ('name' in validator ? validator.name : '')
                //             .toLowerCase().replace(/\s+/g, '');
                //         const validatorAddress = validator.address.toLowerCase().replace(/\s+/g, '');
                //         return validatorLabel.includes(searchTerm) || validatorAddress.includes(searchTerm);
                //     });
                // case FilterState.REWARD:
                //     return validatorsList.value.slice()
                //         .filter((validator) => 'name' in validator) // Only show pools
                //         .sort((a, b) => {
                //             const rewardA = 'annualReward' in a ? a.annualReward : 0;
                //             const rewardB = 'annualReward' in b ? b.annualReward : 0;
                //             const cmp = rewardB - rewardA;
                //             if (cmp) return cmp;
                //             return a.address < b.address ? -1 : 1;
                //         });
                default: {
                    // Only show pools by default when search string is less than 3 characters
                    const showDefaultList = searchValue.value.length < 3;

                    return validatorsList.value.slice()
                        .filter((validator) => {
                            if (showDefaultList) {
                                // Filter to show only pools
                                return 'payoutType' in validator && validator.payoutType !== 'none';
                            }

                            const searchTerm = searchValue.value.toLowerCase().replace(/\s+/g, '');
                            const validatorLabel = ('name' in validator ? validator.name : '')
                                .toLowerCase().replace(/\s+/g, '');
                            const validatorAddress = validator.address.toLowerCase().replace(/\s+/g, '');

                            return validatorLabel.includes(searchTerm) || validatorAddress.includes(searchTerm);
                        })
                        .sort((a, b) => {
                            const scoreA = 'score' in a ? a.score.total || 0 : 0;
                            const scoreB = 'score' in b ? b.score.total || 0 : 0;
                            return (scoreB - scoreA) || (a.address < b.address ? -1 : 1);
                        });
                }
            }
        });

        const searchValue = ref('');
        function onSearch(search: string) {
            filter.value = search ? FilterState.SEARCH : FilterState.TRUST;
            searchValue.value = search;
        }

        return {
            LoadingListType,
            validatorList$,
            changeFilter,
            validatorsList,
            sortedList,
            onSearch,
            searchValue,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorListItem,
        // ValidatorFilter,
        LoadingList,
        FatSearchIcon,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

    @include scroll-mask(true, true, true);

    .staking-validator-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        padding: 1rem 0;

        .search {
            flex-direction: row-reverse;
            margin: 0 4rem;
            margin-bottom: 1rem;
            position: relative;

            input {
                padding-left: 5rem;
                border-radius: 4rem;
            }

            svg {
                width: 2.5rem;
                margin-right: -2.5rem;
                position: relative;
                left: 1.5rem;
                transition: color 200ms ease;

                line, circle {
                    stroke-width: 2.0;
                }
            }

            input:focus + svg,
            input:hover + svg {
                color: var(--nimiq-light-blue);
            }
        }

        .loading-list {
            margin: 0 3.25rem;
        }

        .validator-list {
            display: flex;
            flex-direction: column;
            position: relative;
            overflow-y: auto;
            width: 100%;
            // height: 46.5rem;
            height: 54rem;

            @extend %custom-scrollbar;

            .validator-list-item {
                margin: 0 auto;
            }
        }
    }
    .nq-text {
        margin-top: .875rem;
        margin-bottom: 0.5rem;
        line-height: 1.4;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

<template>
    <div class="prestaking-validator-page flex-column">
        <PageHeader @back="$emit('back')" :backArrow="true">
            <template #default>
                {{ $t('Choose a Validator') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Earn rewards by locking NIM with a validator. Locked NIM stay under your control.') }}
                </p>
            </template>
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
                <LoadingList v-if="!stakeFetched" :length="4" :type="LoadingListType.VALIDATOR" />
                <template v-else>
                    <ValidatorListItem
                        v-for="validator in sortedList"
                        :key="validator.address"
                        :validator="validator"
                        :container="validatorList$"
                        @click.native="selectValidator(validator)"
                    />
                </template>
                <div class="scroll-mask bottom"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { captureException } from '@sentry/vue';
import { computed, defineComponent, onBeforeUnmount, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { Validator, usePrestakingStore } from '../../stores/Prestaking';
import { useConfig } from '../../composables/useConfig';

import ValidatorListItem from './ValidatorListItem.vue';
import { useAddressStore } from '../../stores/Address';
import { FilterState } from '../../lib/PrestakingUtils';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';
import { StatusChangeType } from './PrestakingModal.vue';
import LoadingList, { LoadingListType } from '../LoadingList.vue';
import FatSearchIcon from '../icons/Prestaking/FatSearchIcon.vue';

export default defineComponent({
    setup(props, context) {
        const { config } = useConfig();
        const { activeAddress } = useAddressStore();
        const { validatorsList, activePrestake, setPrestake, globalStake: totalStake } = usePrestakingStore();

        const validatorList$ = ref<HTMLElement | null>(null);
        const stakeFetched = ref(false);

        async function fetchValidators() {
            const stakes = await fetch(config.prestaking.validatorsEndpoint).then((res) => res.json()) as {
                address: string,
                deposit: number,
                delegatedStake: number,
            }[];

            let globalStake = 0;

            const { validators } = usePrestakingStore().state;
            for (const stake of stakes) {
                const validatorStake = stake.deposit + stake.delegatedStake;
                validators[stake.address].stake = validatorStake;
                globalStake += validatorStake;
            }
            usePrestakingStore().patch({
                validators,
                globalStake,
            });
        }
        fetchValidators().finally(() => {
            stakeFetched.value = true;
        });
        const validatorFetchInterval = window.setInterval(fetchValidators, 10 * 1e3);
        onBeforeUnmount(() => {
            window.clearInterval(validatorFetchInterval);
        });

        const filter = ref(FilterState.TRUST);
        const changeFilter = (newFilter: FilterState) => filter.value = newFilter;

        const sortedList = computed(() => { // eslint-disable-line arrow-body-style
            switch (filter.value) {
                // case FilterState.SEARCH:
                //     return validatorsList.value.filter((validator) =>
                //         'label' in validator
                //             ? validator.label.toLowerCase().includes(searchValue.value.toLowerCase())
                //             : validator.address.toLowerCase().includes(searchValue.value.toLowerCase()),
                //     );
                // case FilterState.REWARD:
                //     return validatorsList.value.slice()
                //         .sort((a, b) => {
                //             const cmp = ('reward' in b ? b.reward : 0) - ('reward' in a ? a.reward : 0);
                //             if (cmp) return cmp;
                //             return a.address < b.address ? -1 : 1;
                //         });
                default: {
                    const list = validatorsList.value
                        .filter((validator) => {
                            if (searchValue.value.length < 3) {
                                // Only show pools by default when search string is less than 3 characters
                                return 'label' in validator;
                            }

                            const searchTerm = searchValue.value.toLowerCase().replace(/\s+/g, '');
                            const validatorLabel = ('label' in validator ? validator.label : '')
                                .toLowerCase().replace(/\s+/g, '');
                            const validatorAddress = validator.address.toLowerCase().replace(/\s+/g, '');

                            return validatorLabel.includes(searchTerm) || validatorAddress.includes(searchTerm);
                        })
                        .sort((a, b) => {
                            const cmp = (a.stake ? a.stake : 0) - (b.stake ? b.stake : 0);
                            if (cmp) return cmp;
                            return a.address < b.address ? -1 : 1;
                        });

                    if (searchValue.value.length >= 3) {
                        // Don't calculate underdog status for search results
                        return list;
                    }

                    const hasUnderdog = list.some((v) => (v.stake || 0) / totalStake.value < 0.1);

                    return list.map((validator) => ({
                        ...validator,
                        isUnderdog: 'label' in validator
                            && ((validator.stake || 0) / totalStake.value < 0.1
                                || (!hasUnderdog && validator === list[0])),
                    }));
                }
            }
        });

        async function selectValidator(validator: Validator) {
            const validatorLabelOrAddress = 'label' in validator ? validator.label : validator.address;

            try {
                if (!activePrestake.value || (!activePrestake.value.balance)) {
                    setPrestake({
                        balance: 0,
                        address: activeAddress.value!,
                        validator: validator.address,
                    });

                    context.emit('next');
                } else {
                    context.emit('statusChange', {
                        type: StatusChangeType.VALIDATOR,
                        state: State.LOADING,
                        title: context.root.$t('Changing validator') as string,
                    });

                    const txs = true;

                    if (!txs) {
                        context.emit('statusChange', { type: StatusChangeType.NONE });
                        return;
                    }

                    context.emit('statusChange', {
                        state: State.SUCCESS,
                        title: context.root.$t(
                            'Successfully changed validator to {validator}',
                            { validator: validatorLabelOrAddress },
                        ),
                    });

                    window.setTimeout(() => {
                        context.emit('statusChange', { type: StatusChangeType.NONE });
                        context.emit('next');
                    }, SUCCESS_REDIRECT_DELAY);
                }
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

                // Show error screen
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: context.root.$t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

        const searchValue = ref('');
        function onSearch(search: string) {
            filter.value = search ? FilterState.SEARCH : FilterState.TRUST;
            searchValue.value = search;
        }

        return {
            stakeFetched,
            LoadingListType,
            validatorList$,
            changeFilter,
            validatorsList,
            sortedList,
            selectValidator,
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

    .prestaking-validator-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        padding: 1rem 0;

        .prestake-validator-filter {
            margin: 0 auto;
            margin-bottom: 0.5rem;
        }

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
            height: 52.5rem;

            .validator-list-item {
                margin: 0 auto;
            }
        }
    }
    .nq-text {
        margin-top: .875rem;
        margin-bottom: 0.5rem;
        line-height: 1.4;
        padding: 0 4rem;
    }

    @media (max-width: $tabletBreakpoint) and (min-width: ($mobileBreakpoint + 1px)) { // Tablet breakpoint
    }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    }
</style>

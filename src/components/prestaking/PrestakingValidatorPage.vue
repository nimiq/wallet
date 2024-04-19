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
            <div class="validator-list" ref="validatorList$">
                <div class="scroll-mask top"></div>
                <LoadingList v-if="validatorsList.length === 0" :length="5" :type="LoadingListType.VALIDATOR" />
                <ValidatorListItem
                    v-for="validator in sortedList" :key="validator.address"
                    :validator="validator"
                    :container="validatorList$"
                    @click.native="selectValidator(validator)"
                />
                <div class="scroll-mask bottom"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { captureException } from '@sentry/vue';
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { Validator, usePrestakingStore } from '../../stores/Prestaking';
import { useConfig } from '../../composables/useConfig';

import ValidatorListItem from './ValidatorListItem.vue';
import { useAddressStore } from '../../stores/Address';
import { FilterState } from '../../lib/PrestakingUtils';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';
import { StatusChangeType } from './PrestakingModal.vue';
import LoadingList, { LoadingListType } from '../LoadingList.vue';

export default defineComponent({
    setup(props, context) {
        const { config } = useConfig();
        const { activeAddress } = useAddressStore();
        const { validatorsList, activePrestake, setPrestake } = usePrestakingStore();

        const validatorList$ = ref<HTMLElement | null>(null);

        const filter = ref(FilterState.TRUST);
        const changeFilter = (newFilter: FilterState) => filter.value = newFilter;

        const sortedList = computed(() => { // eslint-disable-line arrow-body-style
            return validatorsList.value;
            // switch (filter.value) {
            //     case FilterState.SEARCH:
            //         return validatorsList.value.filter((validator) =>
            //             'label' in validator
            //                 ? validator.label.toLowerCase().includes(searchValue.value.toLowerCase())
            //                 : validator.address.toLowerCase().includes(searchValue.value.toLowerCase()),
            //         );
            //     case FilterState.REWARD:
            //         return validatorsList.value.slice()
            //             .sort((a, b) => {
            //                 const cmp = ('reward' in b ? b.reward : 0) - ('reward' in a ? a.reward : 0);
            //                 if (cmp) return cmp;
            //                 return a.address < b.address ? -1 : 1;
            //             });
            //     default:
            //         return validatorsList.value.slice()
            //             .sort((a, b) => {
            //                 const cmp = ('trust' in b ? b.trust : 0) - ('trust' in a ? a.trust : 0);
            //                 if (cmp) return cmp;
            //                 return a.address < b.address ? -1 : 1;
            //             });
            // }
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
            LoadingListType,
            validatorList$,
            changeFilter,
            validatorsList,
            sortedList,
            selectValidator,
            onSearch,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorListItem,
        // ValidatorFilter,
        LoadingList,
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
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

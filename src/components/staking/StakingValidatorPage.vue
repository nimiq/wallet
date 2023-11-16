<template>
    <div class="staking-validator-page flex-column">
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
            <ValidatorFilter @changed="changeFilter" @search="onSearch"/>
            <div class="validator-list" ref="validatorList$">
                <div class="scroll-mask top"></div>
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
import { Validator, useStakingStore } from '../../stores/Staking';
import { useConfig } from '../../composables/useConfig';

import ValidatorFilter from './ValidatorFilter.vue';
import ValidatorListItem from './ValidatorListItem.vue';
import { useAddressStore } from '../../stores/Address';
import { sendStaking } from '../../hub';
import { StakingTransactionType, STAKING_ACCOUNT_TYPE, STAKING_CONTRACT_ADDRESS } from '../../lib/Constants';
import { useNetworkStore } from '../../stores/Network';
import { FilterState } from '../../lib/StakingUtils';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';

export default defineComponent({
    setup(props, context) {
        const { config } = useConfig();
        const { activeAddress } = useAddressStore();
        const { validatorsList, activeStake, setStake } = useStakingStore();

        const validatorList$ = ref<HTMLElement | null>(null);

        const filter = ref(FilterState.TRUST);
        const changeFilter = (newFilter: FilterState) => filter.value = newFilter;

        const sortedList = computed(() => {
            switch (filter.value) {
                case FilterState.SEARCH:
                    return validatorsList.value.filter((validator) =>
                        'label' in validator
                            ? validator.label.toLowerCase().includes(searchValue.value.toLowerCase())
                            : validator.address.toLowerCase().includes(searchValue.value.toLowerCase()),
                    );
                case FilterState.REWARD:
                    return validatorsList.value.slice()
                        .sort((a, b) => {
                            const cmp = ('reward' in b ? b.reward : 0) - ('reward' in a ? a.reward : 0);
                            if (cmp) return cmp;
                            return a.address < b.address ? -1 : 1;
                        });
                default:
                    return validatorsList.value.slice()
                        .sort((a, b) => {
                            const cmp = ('trust' in b ? b.trust : 0) - ('trust' in a ? a.trust : 0);
                            if (cmp) return cmp;
                            return a.address < b.address ? -1 : 1;
                        });
            }
        });

        async function selectValidator(validator: Validator) {
            context.emit('statusChange', {
                type: 'validator',
                state: State.LOADING,
                title: context.root.$t('Changing validator') as string,
            });

            const validatorLabelOrAddress = 'label' in validator ? validator.label : validator.address;

            try {
                if (!activeStake.value || (!activeStake.value.balance && !activeStake.value.inactiveBalance)) {
                    setStake({
                        address: activeAddress.value!,
                        balance: 0,
                        inactiveBalance: 0,
                        validator: validator.address,
                    });
                } else {
                    await sendStaking({
                        type: StakingTransactionType.UPDATE_STAKER,
                        delegation: validator.address,
                        reactivateAllStake: true,
                        value: 1, // Unused in transaction
                        sender: activeAddress.value!,
                        recipient: STAKING_CONTRACT_ADDRESS,
                        recipientType: STAKING_ACCOUNT_TYPE,
                        recipientLabel: context.root.$t('Staking Contract') as string,
                        validityStartHeight: useNetworkStore().state.height,
                    }).catch((error) => {
                        throw new Error(error.data);
                    });

                    context.emit('statusChange', {
                        state: State.SUCCESS,
                        title: context.root.$t(
                            'Successfully changed validator to {validator}',
                            { validator: validatorLabelOrAddress },
                        ),
                    });
                }

                window.setTimeout(() => {
                    context.emit('statusChange', { type: 'none' });
                    context.emit('next');
                }, SUCCESS_REDIRECT_DELAY);
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
            validatorList$,
            changeFilter,
            sortedList,
            selectValidator,
            onSearch,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorListItem,
        ValidatorFilter,
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

        .validator-list {
            display: flex;
            flex-direction: column;
            position: relative;
            overflow-y: auto;
            width: 100%;
            height: 46.5rem;
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

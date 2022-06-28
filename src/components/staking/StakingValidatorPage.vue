<template>
    <div class="stake-validator-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
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
            <ValidatorFilter @changed="changeFilter" />
            <div class="mask-container">
                <div class="scroll-mask-top" :class="{ 'disabled-mask': !masks }"></div>
                <div class="scroll-container">
                    <div class="validator-list">
                        <ValidatorListItem
                            v-for="validator in sortedList" :key="validator.address"
                            :validator="validator"
                            @click.native="selectValidator(validator.address)"
                            @focus="onValidatorFocusChange"
                            sortable
                        />
                        <div style="height: 1rem; flex-shrink: 0;"></div>
                    </div>
                </div>
                <div class="scroll-mask-bottom" :class="{ 'disabled-mask': !masks }"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';

import ValidatorFilter from './ValidatorFilter.vue';
import ValidatorListItem from './ValidatorListItem.vue';
import { useAddressStore } from '../../stores/Address';
import { sendStaking } from '../../hub';
import { StakingTransactionType, STAKING_ACCOUNT_TYPE, STAKING_CONTRACT_ADDRESS } from '../../lib/Constants';
import { useNetworkStore } from '../../stores/Network';
import { FilterState } from '../../lib/StakingUtils';

export default defineComponent({
    setup(props, context) {
        const masks = ref(true);
        const onValidatorFocusChange = (state: boolean) => {
            masks.value = !state;
        };

        const filter = ref(FilterState.TRUST);

        function changeFilter(newFilter: FilterState) {
            filter.value = newFilter;
        }

        const { activeAddress } = useAddressStore();
        const { validatorsList, activeStake, setStake } = useStakingStore();

        const sortedList = computed(() => {
            switch (filter.value) {
                case FilterState.PAYOUT:
                    return validatorsList.value.slice()
                        .sort((a, b) => {
                            const cmp = ('payoutIntervalMinutes' in a ? a.payoutIntervalMinutes || Infinity : Infinity)
                                - ('payoutIntervalMinutes' in b ? b.payoutIntervalMinutes || Infinity : Infinity);
                            if (cmp) return cmp;
                            return a.address < b.address ? -1 : 1;
                        });
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

        async function selectValidator(address: string) {
            if (!activeStake.value || activeStake.value.balance === 0) {
                setStake({
                    address: activeAddress.value!,
                    balance: 0,
                    validator: address,
                });
            } else {
                await sendStaking({
                    type: StakingTransactionType.UPDATE_STAKER,
                    delegation: address,
                    value: 1, // Unused in transaction
                    sender: activeAddress.value!,
                    recipient: STAKING_CONTRACT_ADDRESS,
                    recipientType: STAKING_ACCOUNT_TYPE,
                    recipientLabel: context.root.$t('Staking Contract') as string,
                    validityStartHeight: useNetworkStore().state.height,
                }).catch((error) => {
                    throw new Error(error.data);
                });
            }

            context.emit('next');
        }

        return {
            masks,
            changeFilter,
            sortedList,
            selectValidator,
            onValidatorFocusChange,
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

    .stake-validator-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        padding: 1rem 0;
        overflow: hidden;

        .mask-container {
            position: relative;
            top: -.75rem;
            overflow: hidden;
            padding-top: .75rem;
        }

        .scroll-container {
            overflow-y: auto;
            @extend %custom-scrollbar;
            &::-webkit-scrollbar {
                width: 0.75rem;
            }
            scrollbar-width: thin;
        }

        .scroll-mask-top {
            position: absolute;
            top: 0;
            left: 0.875rem;
            width: calc(100% - 2.25rem);
            height: 2.5rem;
            background: linear-gradient(0deg, rgba(244, 244, 244, 0), white);
        }

        .scroll-mask-bottom {
            position: absolute;
            left: 0.875rem;
            bottom: 0;
            width: calc(100% - 2.25rem);
            height: 2.5rem;
            background: linear-gradient(0deg, white, rgba(244, 244, 244, 0));
        }

        .disabled-mask {
            background: none;
        }

        .validator-list {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 46.5rem;
            padding-top: 1rem;
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

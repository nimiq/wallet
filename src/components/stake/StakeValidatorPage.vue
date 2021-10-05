<template>
    <div class="stake-validator-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Choose a Validator') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Earn rewards by locking NIM in a validator. Locked NIM stay in your wallet.') }}
                </p>
            </template>
        </PageHeader>
        <PageBody>
            <StakeValidatorFilter @changed="changeFilter" />
            <div class="mask-container">
                <div class="scroll-mask-top" :class="{ 'disabled-mask': !masks }"></div>
                <div class="scroll-container">
                    <div class="validator-list">
                        <StakeValidatorListItem
                            v-for="validator in sortedList" :key="validator.address"
                            :validatorData="validator"
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

import StakeValidatorFilter, { FilterState } from './StakeValidatorFilter.vue';
import StakeValidatorListItem from './StakeValidatorListItem.vue';
import { useAddressStore } from '../../stores/Address';
import { sendStaking } from '../../hub';
import { StakingTransactionType, STAKING_ACCOUNT_TYPE, STAKING_CONTRACT_ADDRESS } from '../../lib/Constants';
import { useNetworkStore } from '../../stores/Network';

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
                        .sort((a, b) => ('payout' in b ? b.payout : 0) - ('payout' in a ? a.payout : 0));
                case FilterState.REWARD:
                    return validatorsList.value.slice()
                        .sort((a, b) => ('reward' in b ? b.reward : 0) - ('reward' in a ? a.reward : 0));
                default:
                    return validatorsList.value.slice()
                        .sort((a, b) => ('trust' in b ? b.trust : 0) - ('trust' in a ? a.trust : 0));
            }
        });

        async function selectValidator(address: string) {
            if (!activeStake.value) {
                setStake({
                    address: activeAddress.value!,
                    activeStake: 0,
                    inactiveStake: 0,
                    validator: address,
                    retireTime: 0,
                });
            } else {
                await sendStaking({
                    type: StakingTransactionType.UPDATE_STAKER,
                    delegation: address,
                    value: 1, // Unused in transaction
                    sender: activeAddress.value!,
                    recipient: STAKING_CONTRACT_ADDRESS,
                    // @ts-expect-error Staking Account type not yet available
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
        StakeValidatorListItem,
        StakeValidatorFilter,
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

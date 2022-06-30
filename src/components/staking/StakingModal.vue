<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="staking-modal"
        :class="{
            'fat-modal': (page >= 3),
        }"
        :showOverlay="page === 2 && invalidAccount"
        @close-overlay="page = 1"
    >
        <template v-if="page === 1">
            <StakingInfoPage @next="page += 1" />
        </template>
        <template v-if="page === 2">
            <StakingValidatorPage @back="page += isStaking ? 2 : -1" @next="page += isStaking ? 2 : 1"/>
        </template>
        <template v-if="page === 3">
            <StakingGraphPage @back="page += isStaking ? 1 : -1" @next="page += 1" />
        </template>
        <template v-if="page === 4">
            <StakingAlreadyPage @back="page -= 1" @next="page += 1"
                @adjust-stake="adjustStake"
                @switch-validator="switchValidator" />
        </template>
        <template v-if="page === 5">
            <StakingRewardsHistoryPage @back="page -= 1" @next="page += 1" />
        </template>

        <SelectAccountOverlay slot="overlay" />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import Modal from '../modals/Modal.vue';
import StakingInfoPage from './StakingInfoPage.vue';
import StakingValidatorPage from './StakingValidatorPage.vue';
import StakingGraphPage from './StakingGraphPage.vue';
import StakingAlreadyPage from './StakingAlreadyPage.vue';
import StakingRewardsHistoryPage from './StakingRewardsHistoryPage.vue';
import SelectAccountOverlay from './SelectAccountOverlay.vue';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeValidator, activeStake } = useStakingStore();
        const page = ref(activeValidator.value ? 4 : 1);

        const invalidAccount = computed(() => activeAddressInfo.value
            ? !activeAddressInfo.value.balance && !activeStake.value?.balance
            : false);

        const adjustStake = () => {
            page.value = 3;
        };

        const switchValidator = () => {
            page.value = 2;
        };

        const isStaking = computed(() => activeStake.value && activeStake.value.balance);

        watch(activeStake, (stake) => {
            if (!stake) {
                page.value = 1;
            }
        }, { lazy: true });

        return {
            page,
            activeValidator,
            adjustStake,
            switchValidator,
            invalidAccount,
            isStaking,
        };
    },
    components: {
        Modal,
        StakingInfoPage,
        StakingValidatorPage,
        StakingGraphPage,
        StakingAlreadyPage,
        StakingRewardsHistoryPage,
        SelectAccountOverlay,
    },
});
</script>

<style lang="scss" scoped>
    .modal {
        &.fat-modal {
            ::v-deep .small-page {
                width: 63.5rem;
                // height: 74.875rem;
                // transition: width 1.5s ease-out;
            }
            // transition: width 0.75s ease-out;
        }
    }
</style>

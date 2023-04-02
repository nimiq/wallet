<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="staking-modal"
        :class="{ 'fat-modal': page >= Page.GraphPage }"
        :showOverlay="page === Page.ValidatorPage && invalidAccount"
        @close-overlay="page = Page.InfoPage"
    >
        <template v-if="page === Page.InfoPage">
            <StakingInfoPage @next="page = Page.ValidatorPage" />
        </template>
        <template v-if="page === Page.ValidatorPage">
            <StakingValidatorPage @back="page = isStaking ? Page.AlreadyPage : Page.InfoPage"
                @next="page = isStaking ? Page.AlreadyPage : Page.GraphPage"/>
        </template>
        <template v-if="page === Page.GraphPage">
            <StakingGraphPage @back="page = isStaking ? Page.ValidatorPage : Page.InfoPage"
                @next="page = Page.AlreadyPage" />
        </template>
        <template v-if="page === Page.AlreadyPage">
            <StakingAlreadyPage @back="page = Page.GraphPage" @next="page = Page.RewardsHistoryPage"
                @adjust-stake="adjustStake"
                @switch-validator="switchValidator" />
        </template>
        <template v-if="page === Page.RewardsHistoryPage">
            <StakingRewardsHistoryPage @back="page = Page.AlreadyPage" />
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

enum Page {
    InfoPage,
    ValidatorPage,
    GraphPage,
    AlreadyPage,
    RewardsHistoryPage,
}

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeValidator, activeStake } = useStakingStore();
        const page = ref(activeValidator.value ? Page.AlreadyPage : Page.InfoPage);

        const invalidAccount = computed(() => activeAddressInfo.value
            ? !activeAddressInfo.value.balance && !activeStake.value?.balance
            : false);

        const adjustStake = () => { page.value = Page.GraphPage; };
        const switchValidator = () => { page.value = Page.ValidatorPage; };

        const isStaking = computed(() => activeStake.value && activeStake.value.balance);

        watch(activeStake, (stake) => {
            if (!stake) page.value = Page.InfoPage;
        }, { lazy: true });

        return {
            page,
            activeValidator,
            adjustStake,
            switchValidator,
            invalidAccount,
            isStaking,
            Page,
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

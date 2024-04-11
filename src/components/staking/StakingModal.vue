<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="staking-modal"
        :class="{ 'large-modal': [Page.Graph, Page.Already].includes(page) }"
        :showOverlay="overlay === Overlay.SelectAccount || statusType !== StatusChangeType.NONE"
        @close-overlay="closeOverlay"
    >
        <template v-if="page === Page.Info">
            <StakingWelcomePage @next="switchValidator" />
        </template>
        <template v-else-if="page === Page.Graph">
            <StakingGraphPage
                @back="page = isStaking ? Page.Already : Page.Validator"
                @next="page = Page.Already"
                @changeValidator="switchValidator"
                @statusChange="onStatusChange"
            />
        </template>
        <template v-else-if="page === Page.Already">
            <!-- <StakingInfoPage
                @back="page = Page.Graph" @next="page = Page.RewardsHistory"
                @adjust-stake="adjustStake"
                @switch-validator="switchValidator"
                @statusChange="onStatusChange"
            /> -->
        </template>
        <!-- <template v-else-if="page === Page.RewardsHistory">
            <StakingRewardsHistoryPage @back="page = Page.Already" />
        </template> -->
        <template v-else-if="page === Page.Validator">
            <StakingValidatorPage
                @back="page = isStaking ? Page.Already : Page.Info"
                @next="page = isStaking ? Page.Already : Page.Graph; closeOverlay()"
                @statusChange="onStatusChange"
            />
        </template>
        <template slot="overlay">
            <!-- <SelectAccountOverlay v-if="overlay === Overlay.SelectAccount"
                @selected="switchValidator"
            />
            <StatusScreen v-else-if="statusType !== 'none'"
                :state="statusState"
                :title="statusTitle"
                :message="statusMessage"
            /> -->
                <!-- :mainAction="$t('Cancel')"
                @main-action="onStatusMainAction" -->
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onBeforeUnmount } from '@vue/composition-api';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import Modal from '../modals/Modal.vue';
import StakingWelcomePage from './StakingWelcomePage.vue';
import StakingValidatorPage from './StakingValidatorPage.vue';
import StakingGraphPage from './StakingGraphPage.vue';
// import StakingInfoPage from './StakingInfoPage.vue';
// import StakingRewardsHistoryPage from './StakingRewardsHistoryPage.vue';
// import SelectAccountOverlay from './SelectAccountOverlay.vue';
// import StatusScreen, { State } from '../StatusScreen.vue';
import { State } from '../StatusScreen.vue';

enum Page {
    Info,
    Graph,
    Already,
    RewardsHistory,
    Validator,
}

enum Overlay {
    SelectAccount,
    Validator,
}

export enum StatusChangeType {
    NONE,
    STAKING,
    UNSTAKING,
    VALIDATOR,
    DEACTIVATING,
}

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeValidator, activeStake } = useStakingStore();
        const page = ref(activeValidator.value ? Page.Already : Page.Info);
        const overlay = ref<Overlay | null>(null);

        const isStaking = computed(() => !!(activeStake.value?.activeBalance || activeStake.value?.inactiveBalance));
        const invalidAccount = computed(() => activeAddressInfo.value
            ? !activeAddressInfo.value.balance && !isStaking.value
            : false);

        const adjustStake = () => { page.value = Page.Graph; };
        const switchValidator = () => { page.value = Page.Validator; };
        const closeOverlay = () => { overlay.value = null; };

        /**
         * Status Screen
         */
        const statusType = ref<StatusChangeType>(StatusChangeType.NONE);
        const statusState = ref<State>(State.LOADING);
        const statusTitle = ref('');
        const statusMessage = ref('');

        const statusMainAction = ref('');
        const statusAlternativeAction = ref('');

        type StatusChangeParams = {
            type?: StatusChangeType,
            state?: State,
            title?: string,
            message?: string,
            timeout?: number,
        };

        let statusChangeTimeout: number | null = null;

        function updateStatusScreen({ type, state, title, message }: StatusChangeParams) {
            if (type !== undefined) statusType.value = type;
            if (state !== undefined) statusState.value = state;
            if (title !== undefined) statusTitle.value = title;
            if (message !== undefined) statusMessage.value = message;
        }

        async function onStatusChange(statusChangeObj: StatusChangeParams) {
            if (statusChangeTimeout) clearTimeout(statusChangeTimeout);

            if (statusChangeObj.timeout) {
                statusChangeTimeout = window.setTimeout(() =>
                    updateStatusScreen(statusChangeObj),
                statusChangeObj.timeout);
            } else {
                updateStatusScreen(statusChangeObj);
            }
        }

        // function onStatusMainAction() {
        //     // Handle main action here
        // }

        watch(activeStake, (stake) => {
            if (!stake) page.value = Page.Info;
        }, { lazy: true });

        function showOverlayIfInvalidAccount(newPath: Overlay | Page) {
            if (newPath === Page.Validator && invalidAccount.value) {
                overlay.value = Overlay.SelectAccount;
            }
        }

        watch(page, (newPage) => showOverlayIfInvalidAccount(newPage as Page));
        watch(overlay, (newOverlay) => showOverlayIfInvalidAccount(newOverlay as Overlay));

        onBeforeUnmount(() => {
            if (!activeStake.value?.activeBalance && !activeStake.value?.inactiveBalance) {
                useStakingStore().removeStake(activeAddressInfo.value!.address);
            }
        });

        return {
            page,
            overlay,
            activeValidator,
            adjustStake,
            switchValidator,
            closeOverlay,
            invalidAccount,
            isStaking,
            Page,
            Overlay,

            // StatusScreen
            statusType,
            statusState,
            statusTitle,
            statusMessage,
            statusMainAction,
            statusAlternativeAction,
            onStatusChange,
            StatusChangeType,
            // onStatusMainAction,
        };
    },
    components: {
        Modal,
        StakingWelcomePage,
        StakingValidatorPage,
        StakingGraphPage,
        // StakingInfoPage,
        // StakingRewardsHistoryPage,
        // SelectAccountOverlay,
        // StatusScreen,
    },
});
</script>

<style lang="scss" scoped>
    .modal {
        &.large-modal {
            ::v-deep .small-page {
                // transition: transform var(--transition-time) var(--nimiq-ease),
                //             width 200ms var(--nimiq-ease);
                width: 63.5rem;
                // height: 74.875rem;
                // transition: width 1.5s ease-out;
            }
            // transition: width 0.75s ease-out;
        }
    }
</style>

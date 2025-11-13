<template>
    <Modal v-bind="$attrs" v-on="$listeners" class="staking-modal"
        :class="{ 'large-modal': [Page.Graph, Page.Info].includes(page) }"
        :showOverlay="shouldShowOverlay"
        @close-overlay="closeOverlay"
    >
        <transition name="fade" mode="out-in">
            <template v-if="page === Page.Welcome">
                <StakingWelcomePage @next="switchValidator" />
            </template>
            <template v-else-if="page === Page.Graph">
                <StakingGraphPage
                    @back="page = isStaking ? Page.Info : Page.ValidatorList"
                    @next="page = Page.Info"
                    @selectValidator="onSelectValidator"
                    @statusChange="onStatusChange"
                />
            </template>
            <template v-else-if="page === Page.Info">
                <StakingInfoPage
                    @back="page = Page.Graph"
                    @adjust-stake="adjustStake"
                    @switch-validator="switchValidator"
                    @selectValidator="onSelectValidator"
                    @statusChange="onStatusChange"
                />
            </template>
            <template v-else-if="page === Page.ValidatorList">
                <StakingValidatorPage
                    :backArrow="totalAccountStake === 0"
                    @back="page = isStaking ? Page.Info : Page.Welcome"
                    @selectValidator="onSelectValidator"
                    @statusChange="onStatusChange"
                />
                    <!-- @next="page = isStaking ? Page.Info : Page.Graph; closeOverlay()" -->
            </template>
            <template v-else-if="page === Page.Rewards">
                <StakingRewardsPage
                    v-if="hasRewardDataForMonth"
                    :month="selectedRewardsMonth"
                    :showBackArrow="showRewardsBackArrow"
                    @back="goBackFromRewards"
                />
            </template>
        </transition>
        <template slot="overlay">
            <SelectAccountOverlay v-if="overlay === Overlay.SelectAccount"
                @selected="switchValidator"
            />
            <StatusScreen v-else-if="statusType !== StatusChangeType.NONE"
                :state="statusState"
                :title="statusTitle"
                :message="statusMessage"
                :main-action="statusMainAction"
                :light-blue="true"
                status=""
                :alternative-action="statusAlternativeAction"
                :small="false"
            />
            <ValidatorDetailsOverlay v-else-if="overlay === Overlay.ValidatorDetails"
                :noButton="page !== Page.ValidatorList"
                :validator="selectedValidator"
                @statusChange="onStatusChange"
                @next="onConfirmValidator"
            />
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onBeforeUnmount } from '@vue/composition-api';
import { useI18n } from '@/lib/useI18n';
import { RouteName, useRouter } from '@/router';
import { useStakingStore, Validator } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import Modal from '../modals/Modal.vue';
import StakingWelcomePage from './StakingWelcomePage.vue';
import StakingValidatorPage from './StakingValidatorPage.vue';
import StakingGraphPage from './StakingGraphPage.vue';
import StakingInfoPage from './StakingInfoPage.vue';
import StakingRewardsPage from './StakingRewardsPage.vue';
import SelectAccountOverlay from './SelectAccountOverlay.vue';
import StatusScreen, { State } from '../StatusScreen.vue';
import ValidatorDetailsOverlay from './ValidatorDetailsOverlay.vue';

enum Page {
    Welcome, // StakingWelcomePage
    Graph, // StakingGraphPage
    Info, // StakingInfoPage
    ValidatorList, // StakingValidatorPage
    Rewards, // StakingRewardsPage
}

enum Overlay {
    SelectAccount,
    ValidatorDetails,
}

export enum StatusChangeType {
    NONE,
    STAKING,
    UNSTAKING,
    VALIDATOR,
    DEACTIVATING,
}

type StatusChangeParams = {
    type?: StatusChangeType,
    state?: State,
    title?: string,
    message?: string,
    timeout?: number,
};

export default defineComponent({
    props: {
        month: {
            type: String,
            default: undefined,
        },
    },
    setup(props) {
        const { $t } = useI18n();
        const { activeAddressInfo } = useAddressStore();
        const { activeValidator, activeStake, totalAccountStake, monthlyRewards } = useStakingStore();

        // Store selected rewards month
        const selectedRewardsMonth = ref<string | undefined>(props.month);

        // Track if rewards page should show back arrow (only when navigated from Info page internally)
        const showRewardsBackArrow = ref<boolean>(false);

        // Determine initial page based on route
        const page = ref(props.month
            ? Page.Rewards
            : activeValidator.value
                ? Page.Info
                : totalAccountStake.value
                    ? Page.ValidatorList
                    : Page.Welcome);
        const overlay = ref<Overlay | null>(null);

        const isStaking = computed(() => !!(activeStake.value?.activeBalance || activeStake.value?.inactiveBalance));
        const invalidAccount = computed(() => activeAddressInfo.value
            ? !activeAddressInfo.value.balance && !isStaking.value
            : false);

        // Check if selected rewards month has data
        const hasRewardDataForMonth = computed(() =>
            selectedRewardsMonth.value && monthlyRewards.value.has(selectedRewardsMonth.value),
        );

        const router = useRouter();

        const adjustStake = () => { page.value = Page.Graph; };
        const switchValidator = () => { page.value = Page.ValidatorList; };
        const closeOverlay = () => { overlay.value = null; };

        // Rewards navigation - goBackFromRewards is called when user clicks back arrow on rewards page
        const goBackFromRewards = () => {
            selectedRewardsMonth.value = undefined;
            showRewardsBackArrow.value = false;
            page.value = Page.Info;
            router.replace({ name: RouteName.Staking }).catch(() => { /* route already at target */ });
        };

        /* Status Screen */
        const statusType = ref<StatusChangeType>(StatusChangeType.NONE);
        const statusState = ref<State>(State.LOADING);
        const statusTitle = ref('');
        const statusMessage = ref('');

        const statusMainAction = ref('');
        const statusAlternativeAction = ref('');

        function updateStatusScreen({ type, state, title, message }: StatusChangeParams) {
            if (type !== undefined) statusType.value = type;
            if (state !== undefined) statusState.value = state;
            if (title !== undefined) statusTitle.value = title;
            if (message !== undefined) statusMessage.value = message;
        }

        let statusChangeTimeout: number | null = null;
        async function onStatusChange(statusChangeObj: StatusChangeParams) {
            if (statusChangeTimeout) clearTimeout(statusChangeTimeout);

            if (statusChangeObj.timeout) {
                statusChangeTimeout = window.setTimeout(() =>
                    updateStatusScreen(statusChangeObj),
                statusChangeObj.timeout);
            } else {
                updateStatusScreen(statusChangeObj);
            }

            if (statusChangeObj.state === State.ERROR || statusChangeObj.state === State.WARNING) {
                statusMainAction.value = $t('Close') as string;
            }
        }

        function onStatusMainAction() {
            updateStatusScreen({
                type: StatusChangeType.NONE,
                state: State.LOADING,
                title: '',
                message: '',
            });
        }

        /* Overlays */
        function showOverlayIfInvalidAccount(newPath: Overlay | Page) {
            if (newPath === Page.ValidatorList && invalidAccount.value) {
                overlay.value = Overlay.SelectAccount;
            }
        }

        const shouldShowOverlay = computed(() =>
            overlay.value === Overlay.SelectAccount
            || statusType.value !== StatusChangeType.NONE
            || overlay.value === Overlay.ValidatorDetails,
        );

        /* Event Handlers */
        const selectedValidator = ref<Validator | null>(null);
        function onSelectValidator(validator: Validator) {
            selectedValidator.value = validator;
            overlay.value = Overlay.ValidatorDetails;
        }

        function onConfirmValidator() {
            selectedValidator.value = null;
            overlay.value = null;
            page.value = Page.Graph;
        }

        /* Watchers */
        watch(activeStake, (stake) => {
            if (!stake) page.value = totalAccountStake.value ? Page.ValidatorList : Page.Welcome;
        }, { lazy: true });

        watch(page, (newPage) => showOverlayIfInvalidAccount(newPage as Page));
        watch(overlay, (newOverlay) => showOverlayIfInvalidAccount(newOverlay as Overlay));

        // Watch for route changes to sync page with URL
        watch(() => props.month, (month) => {
            if (month) {
                // Check if we're navigating from Info page (internal navigation)
                // If so, show back arrow. Otherwise (external entry), don't show it.
                showRewardsBackArrow.value = page.value === Page.Info;
                selectedRewardsMonth.value = month;
                page.value = Page.Rewards;
            } else if (page.value === Page.Rewards) {
                // If we were on rewards page and month is removed, go back to info
                showRewardsBackArrow.value = false;
                page.value = activeValidator.value ? Page.Info : Page.ValidatorList;
            }
        });

        /* Component Lifecycle */
        onBeforeUnmount(() => {
            if (!activeStake.value?.activeBalance && !activeStake.value?.inactiveBalance) {
                useStakingStore().removeStake(activeAddressInfo.value!.address);
            }
        });

        return {
            // Enums
            Page,
            Overlay,

            // General
            page,
            overlay,
            closeOverlay,
            shouldShowOverlay,

            // Staking refs / computed
            activeValidator,
            totalAccountStake,
            invalidAccount,
            isStaking,
            selectedValidator,

            // Staking methods / handlers
            adjustStake,
            switchValidator,
            onSelectValidator,
            onConfirmValidator,

            // Rewards
            selectedRewardsMonth,
            hasRewardDataForMonth,
            showRewardsBackArrow,
            goBackFromRewards,

            // StatusScreen
            statusType,
            statusState,
            statusTitle,
            statusMessage,
            statusMainAction,
            statusAlternativeAction,
            onStatusChange,
            StatusChangeType,
            onStatusMainAction,
        };
    },
    components: {
        Modal,
        StakingWelcomePage,
        StakingValidatorPage,
        StakingGraphPage,
        StakingInfoPage,
        StakingRewardsPage,
        SelectAccountOverlay,
        StatusScreen,
        ValidatorDetailsOverlay,
    },
});
</script>

<style lang="scss" scoped>
    .modal {
        ::v-deep .small-page {
            overflow: hidden;

            transition:
                width var(--transition-time) var(--nimiq-ease),
                transform var(--transition-time) var(--nimiq-ease);

            &:first-child {
                height: 37.5rem;
            }
        }

        &.large-modal {
            ::v-deep .small-page {
                width: 63.5rem;
            }
        }
    }

    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 250ms var(--nimiq-ease);
    }

    .fade-enter,
    .fade-leave-to {
        opacity: 0;
    }
</style>

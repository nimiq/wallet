<template>
    <Modal
        v-bind="$attrs"
        v-on="$listeners"
        class="staking-modal"
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
                    @show-validators="onShowValidators"
                    @show-validator="onSelectValidator"
                />
            </template>
        </transition>
        <template #overlay>
            <SelectAccountOverlay v-if="overlay === Overlay.SelectAccount" @selected="switchValidator" />
            <template v-else>
                <!-- Keep mounted under StatusScreen so async operations can keep emitting events.
                     v-show on the wrapper avoids triggering the inner fade transition. -->
                <div v-show="statusType === StakingOperationType.NONE" class="overlay-content-wrapper">
                    <transition name="fade" mode="out-in">
                        <ValidatorDetailsOverlay
                            v-if="overlay === Overlay.ValidatorDetails && selectedValidator"
                            :key="'details'"
                            :showBackArrow="showValidatorDetailsBackArrow"
                            :validator="selectedValidator"
                            @statusChange="onStatusChange"
                            @next="onConfirmValidator"
                            @switch-validator="onOverlaySwitchValidator"
                            @back="goBackFromValidatorDetails"
                        />
                        <ValidatorsListOverlay
                            v-else-if="overlay === Overlay.ValidatorsList"
                            :key="'list'"
                            :validators="selectedValidators"
                            :month="selectedRewardsMonth"
                            @select-validator="onSelectValidatorFromList"
                        />
                    </transition>
                </div>
                <StatusScreen
                    v-if="statusType !== StakingOperationType.NONE"
                    :state="statusState"
                    :title="statusTitle"
                    :message="statusMessage"
                    :main-action="statusMainAction"
                    :light-blue="true"
                    status=""
                    :alternative-action="statusAlternativeAction"
                    :small="false"
                    @main-action="onStatusMainAction"
                />
            </template>
        </template>
    </Modal>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia';
import { defineComponent, ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router/composables';
import { useI18n } from '@/lib/useI18n';
import { RouteName, STAKING_QUERY_SHOW_VALIDATORS } from '@/router';
import { StakingOperationType } from '../../lib/StakingUtils';
import { useAddressStore } from '../../stores/Address';
import { useStakingStore, Validator } from '../../stores/Staking';
import Modal from '../modals/Modal.vue';
import StatusScreen, { State } from '../StatusScreen.vue';
import SelectAccountOverlay from './SelectAccountOverlay.vue';
import StakingGraphPage from './StakingGraphPage.vue';
import StakingInfoPage from './StakingInfoPage.vue';
import StakingRewardsPage from './StakingRewardsPage.vue';
import StakingValidatorPage from './StakingValidatorPage.vue';
import StakingWelcomePage from './StakingWelcomePage.vue';
import ValidatorDetailsOverlay from './ValidatorDetailsOverlay.vue';
import ValidatorsListOverlay from './ValidatorsListOverlay.vue';

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
    ValidatorsList,
}

type StatusChangeParams = {
    type?: StakingOperationType;
    state?: State;
    title?: string;
    message?: string;
    timeout?: number;
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
        const { activeAddressInfo } = storeToRefs(useAddressStore());
        const { activeValidator, activeStake, totalAccountStake, totalActiveStake, monthlyRewards } =
            storeToRefs(useStakingStore());

        const router = useRouter();

        const startOnValidatorList = router.currentRoute.query.page === STAKING_QUERY_SHOW_VALIDATORS.page;

        // Store selected rewards month
        const selectedRewardsMonth = ref<string | undefined>(props.month);

        // Track if rewards page should show back arrow (only when navigated from Info page internally)
        const showRewardsBackArrow = ref<boolean>(false);

        // Determine initial page based on route
        const page = ref(
            props.month
                ? Page.Rewards
                : startOnValidatorList
                  ? Page.ValidatorList
                  : activeValidator.value
                    ? Page.Info
                    : totalAccountStake.value
                      ? Page.ValidatorList
                      : Page.Welcome,
        );
        const overlay = ref<Overlay | null>(null);

        const isStaking = computed(() => !!(activeStake.value?.activeBalance || activeStake.value?.inactiveBalance));
        const invalidAccount = computed(() =>
            activeAddressInfo.value ? !activeAddressInfo.value.balance && !isStaking.value : false,
        );

        // Check if selected rewards month has data
        const hasRewardDataForMonth = computed(
            () => selectedRewardsMonth.value && monthlyRewards.value.has(selectedRewardsMonth.value),
        );

        const adjustStake = () => {
            page.value = Page.Graph;
        };
        const switchValidator = () => {
            page.value = Page.ValidatorList;
        };
        const closeOverlay = () => {
            overlay.value = null;
        };

        const onOverlaySwitchValidator = () => {
            closeOverlay();
            switchValidator();
        };

        // Rewards navigation - goBackFromRewards is called when user clicks back arrow on rewards page
        const goBackFromRewards = () => {
            selectedRewardsMonth.value = undefined;
            showRewardsBackArrow.value = false;
            page.value = Page.Info;
            router.replace({ name: RouteName.Staking }).catch(() => {
                /* route already at target */
            });
        };

        /* Status Screen */
        const statusType = ref<StakingOperationType>(StakingOperationType.NONE);
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
                statusChangeTimeout = window.setTimeout(
                    () => updateStatusScreen(statusChangeObj),
                    statusChangeObj.timeout,
                );
            } else {
                updateStatusScreen(statusChangeObj);
            }

            if (statusChangeObj.state === State.ERROR || statusChangeObj.state === State.WARNING) {
                statusMainAction.value = $t('Close') as string;
            }
        }

        function onStatusMainAction() {
            updateStatusScreen({
                type: StakingOperationType.NONE,
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

        const shouldShowOverlay = computed(
            () =>
                overlay.value === Overlay.SelectAccount
                || statusType.value !== StakingOperationType.NONE
                || overlay.value === Overlay.ValidatorDetails
                || overlay.value === Overlay.ValidatorsList,
        );

        /* Event Handlers */
        const selectedValidator = ref<Validator | null>(null);
        const selectedValidators = ref<Validator[]>([]);
        const showValidatorDetailsBackArrow = ref(false);

        function onSelectValidator(validator: Validator) {
            selectedValidator.value = validator;
            showValidatorDetailsBackArrow.value = false;
            overlay.value = Overlay.ValidatorDetails;
        }

        function onSelectValidatorFromList(validator: Validator) {
            selectedValidator.value = validator;
            showValidatorDetailsBackArrow.value = true;
            overlay.value = Overlay.ValidatorDetails;
        }

        function onShowValidators(validators: Validator[]) {
            selectedValidators.value = validators;
            showValidatorDetailsBackArrow.value = false;
            overlay.value = Overlay.ValidatorsList;
        }

        function goBackFromValidatorDetails() {
            selectedValidator.value = null;
            showValidatorDetailsBackArrow.value = false;
            overlay.value = Overlay.ValidatorsList;
        }

        function onConfirmValidator() {
            selectedValidator.value = null;
            showValidatorDetailsBackArrow.value = false;
            overlay.value = null;
            if (activeStake.value?.activeBalance || activeStake.value?.inactiveBalance) {
                page.value = Page.Info;
            } else {
                page.value = Page.Graph;
            }
        }

        /* Watchers */
        watch(activeStake, (stake) => {
            if (!stake) page.value = totalAccountStake.value ? Page.ValidatorList : Page.Welcome;
        });

        watch(page, (newPage) => showOverlayIfInvalidAccount(newPage as Page), { immediate: true });
        watch(overlay, (newOverlay) => showOverlayIfInvalidAccount(newOverlay as Overlay), { immediate: true });

        // Watch for route changes to sync page with URL
        watch(
            () => props.month,
            (month) => {
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
            },
            { immediate: true },
        );

        /* Component Lifecycle */
        onBeforeUnmount(() => {
            // Only drop the placeholder stake left behind by validator selection. Retired-but-not-removed
            // stake is real (its payout may still be pending), so it stays.
            if (!totalActiveStake.value) {
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
            selectedValidators,
            showValidatorDetailsBackArrow,

            // Staking methods / handlers
            adjustStake,
            switchValidator,
            onOverlaySwitchValidator,
            onSelectValidator,
            onSelectValidatorFromList,
            onShowValidators,
            goBackFromValidatorDetails,
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
            StakingOperationType,
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
        ValidatorsListOverlay,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    :deep(.small-page) {
        overflow: hidden;

        transition:
            width var(--transition-time) var(--nimiq-ease),
            transform var(--transition-time) var(--nimiq-ease);

        &:first-child {
            height: 37.5rem;
        }
    }

    &.large-modal {
        :deep(.small-page) {
            width: 63.5rem;
        }
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 250ms var(--nimiq-ease);
}

.fade-enter,
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

// Fade transition for validator overlays
:deep(.fade-enter-active),
:deep(.fade-leave-active) {
    transition: opacity 300ms var(--nimiq-ease);
}

:deep(.fade-enter),
:deep(.fade-enter-from),
:deep(.fade-leave-to) {
    opacity: 0;
}

.overlay-content-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}
</style>

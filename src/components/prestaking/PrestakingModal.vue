<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="prestaking-modal"
        :class="{ 'large-modal': [Page.Graph, Page.Already, Page.Validator].includes(page) }"
        :showOverlay="overlay === Overlay.SelectAccount || statusType !== StatusChangeType.NONE"
        @close-overlay="closeOverlay"
    >
        <template v-if="page === Page.Info">
            <PrestakingWelcomePage @next="switchValidator" />
        </template>
        <template v-else-if="page === Page.Graph">
            <PrestakingGraphPage
                @back="page = isPrestaking ? Page.Already : Page.Validator"
                @next="page = Page.Already"
                @changeValidator="switchValidator"
                @statusChange="onStatusChange"
            />
        </template>
        <template v-else-if="page === Page.Already">
            <PrestakingInfoPage
                @back="page = Page.Graph" @next="page = Page.RewardsHistory"
                @adjust-prestake="adjustPrestake"
                @switch-validator="switchValidator"
                @statusChange="onStatusChange"
            />
        </template>
        <!-- <template v-else-if="page === Page.RewardsHistory">
            <PrestakingRewardsHistoryPage @back="page = Page.Already" />
        </template> -->
        <template v-else-if="page === Page.Validator">
            <PrestakingValidatorPage
                @back="page = isPrestaking ? Page.Already : Page.Info"
                @next="page = isPrestaking ? Page.Already : Page.Graph; closeOverlay()"
                @statusChange="onStatusChange"
            />
        </template>
        <template slot="overlay">
            <SelectAccountOverlay v-if="overlay === Overlay.SelectAccount"
                @selected="switchValidator"
            />
            <StatusScreen v-else-if="statusType !== StatusChangeType.NONE"
                :state="statusState"
                :title="statusTitle"
                :message="statusMessage"
            />
                <!-- :mainAction="$t('Cancel')"
                @main-action="onStatusMainAction" -->
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onBeforeUnmount } from '@vue/composition-api';
import { usePrestakingStore } from '../../stores/Prestaking';
import { useAddressStore } from '../../stores/Address';
import { useConfig } from '../../composables/useConfig';
import Modal from '../modals/Modal.vue';
import PrestakingWelcomePage from './PrestakingWelcomePage.vue';
import PrestakingValidatorPage from './PrestakingValidatorPage.vue';
import PrestakingGraphPage from './PrestakingGraphPage.vue';
import PrestakingInfoPage from './PrestakingInfoPage.vue';
import StatusScreen, { State } from '../StatusScreen.vue';

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
    PRESTAKING,
    UNPRESTAKING,
    VALIDATOR,
    DEACTIVATING,
}

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeValidator, activePrestake, removePrestake, setGlobalStake } = usePrestakingStore();
        const page = ref(activeValidator.value ? Page.Already : Page.Info);
        const overlay = ref<Overlay | null>(null);

        const isPrestaking = computed(() => !!(activePrestake.value?.balance));
        const invalidAccount = computed(() => activeAddressInfo.value
            ? !activeAddressInfo.value.balance && !isPrestaking.value
            : false);

        const adjustPrestake = () => { page.value = Page.Graph; };
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

        watch(activePrestake, (prestake) => {
            if (!prestake) page.value = Page.Info;
        }, { lazy: true });

        function showOverlayIfInvalidAccount(newPath: Overlay | Page) {
            if (newPath === Page.Validator && invalidAccount.value) {
                overlay.value = Overlay.SelectAccount;
            }
        }

        watch(page, (newPage) => showOverlayIfInvalidAccount(newPage as Page));
        watch(overlay, (newOverlay) => showOverlayIfInvalidAccount(newOverlay as Overlay));

        onBeforeUnmount(() => {
            if (!activePrestake.value?.balance) {
                removePrestake(activeAddressInfo.value!.address);
            }
        });

        fetch(useConfig().config.prestaking.totalPrestakeEndpoint).then((res) => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.text();
        }).then((totalStakeString) => {
            const totalStake = Number(totalStakeString);
            setGlobalStake(totalStake);
        }).catch((error) => {
            console.error('Error fetching total prestake:', error.message); // eslint-disable-line no-console
        });

        return {
            page,
            overlay,
            activeValidator,
            adjustPrestake,
            switchValidator,
            closeOverlay,
            invalidAccount,
            isPrestaking,
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
        PrestakingWelcomePage,
        PrestakingValidatorPage,
        PrestakingGraphPage,
        PrestakingInfoPage,
        // PrestakingRewardsHistoryPage,
        // SelectAccountOverlay,
        StatusScreen,
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

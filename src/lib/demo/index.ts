/* eslint-disable max-len, consistent-return, no-console, no-async-promise-executor */

/**
 * Demo environment for trying wallet features without real blockchain connections.
 * Only activated through build commands (yarn serve:demo, yarn build:demo).
 */

import VueRouter from 'vue-router';
import { RouteName, Columns } from '@/router';
import { useConfig } from '@/composables/useConfig';
import { checkIfDemoIsActive, DemoState, DemoModal, demoRoutes, type DemoFlowType, type WalletPlaygroundMessage } from './DemoConstants';
import { insertCustomDemoStyles, setupSingleMutationObserver } from './DemoDom';
import { setupDemoAddresses, setupDemoAccount } from './DemoAccounts';
import {
    insertFakeNimTransactions,
    dangerouslyInsertFakeBuyNimTransaction,
    insertFakeBtcTransactions,
    insertFakeUsdcTransactions,
    insertFakeUsdtTransactions,
    // createStakeTransaction,
    // createSwapOutgoingTransaction,
    // createSwapIncomingTransaction,
    // completeSwapTransactions,
    // transformNimTransaction,
    // transformBtcTransaction,
    // updateNimBalance,
    // updateBtcBalance,
} from './DemoTransactions';
import { replaceBuyNimFlow, replaceStakingFlow, replaceSwapFlow } from './DemoFlows';
import { interceptFetchRequest, listenForSwapChanges } from './DemoSwaps';

let demoRouter: VueRouter;
let currentModal: DemoFlowType = 'idle';
const DemoFallbackModal = () =>
    import(
        /* webpackChunkName: 'demo-hub-fallback-modal' */
        '@/components/modals/demos/DemoModalFallback.vue'
    );

const DemoPurchaseModal = () =>
    import(
        /* webpackChunkName: 'demo-modal-buy' */
        '@/components/modals/demos/DemoModalBuy.vue'
    );

export function dangerouslyInitializeDemo(router: VueRouter): void {
    if (!checkIfDemoIsActive()) {
        console.info('[Demo] Demo mode not enabled in configuration. Skipping initialization.');
        return;
    }

    console.warn('[Demo] Initializing demo environment...');

    demoRouter = router;

    insertCustomDemoStyles();
    setupSingleMutationObserver(demoRouter);
    addDemoModalRoutes();
    interceptFetchRequest();

    setupDemoAddresses();
    setupDemoAccount();

    insertFakeNimTransactions();
    insertFakeBtcTransactions();

    if (useConfig().config.polygon.enabled) {
        insertFakeUsdcTransactions();
        insertFakeUsdtTransactions();
    }

    attachIframeListeners();
    replaceStakingFlow(demoRouter);
    replaceBuyNimFlow(demoRouter);
    replaceSwapFlow(demoRouter);

    listenForSwapChanges();

    // Send initial ready message to parent frame
    sendInitialReadyMessage();
}

/**
 * Sends initial ready message to parent frame when demo loads
 */
function sendInitialReadyMessage(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendInitialReadyMessage);
        return;
    }

    // Small delay to ensure iframe is fully loaded
    setTimeout(() => {
        // Send ready signal to parent
        window.parent.postMessage({
            type: 'demo:ready',
            data: {
                connected: true,
                address: 'NQ57 2814 7L5B NBBD 0EU7 EL71 HXP8 M7H8 MHKD',
                selectedAction: 'idle',
            },
        }, '*');

        console.log('[Demo] Sent initial demo:ready message to parent');
    }, 500);
}

function addDemoModalRoutes(): void {
    const AccountOverview = () => import(/* webpackChunkName: "account-overview" */ '@/components/layouts/AccountOverview.vue');
    const AddressOverview = () => import(/* webpackChunkName: "address-overview" */ '@/components/layouts/AddressOverview.vue');

    demoRouter.addRoute(RouteName.Root, {
        name: DemoModal.Fallback,
        path: `/${DemoModal.Fallback}`,
        components: {
            modal: DemoFallbackModal,
            accountOverview: AccountOverview,
            addressOverview: AddressOverview,
        },
        props: { modal: true },
        meta: { column: Columns.DYNAMIC },
    });

    demoRouter.addRoute(RouteName.Root, {
        name: DemoModal.Buy,
        path: `/${DemoModal.Buy}`,
        components: {
            modal: DemoPurchaseModal,
            accountOverview: AccountOverview,
            addressOverview: AddressOverview,
        },
        props: { modal: true },
        meta: { column: Columns.DYNAMIC },
    });

    console.debug('[Demo] Demo routes added successfully');
}

function attachIframeListeners(): void {
    window.addEventListener('message', (event) => {
        if (!event.data || typeof event.data !== 'object') return;

        const message = event.data as WalletPlaygroundMessage;
        
        // Only log messages with expected types
        const expectedTypes = ['demo:ready', 'action:open-buy-modal', 'action:open-staking-modal', 'action:open-swap-modal', 'action:close-modal'];
        if (message.type && expectedTypes.includes(message.type)) {
            console.log('[Demo] Received message:', event.data, 'from:', event.origin);
        }
        
        if (!message.type || !message.type.startsWith('action:')) return;

        handleParentAction(message.type);
    });

    demoRouter.afterEach((to) => {
        const newModal = getModalTypeFromPath(to.path);
        if (newModal === currentModal) return; // Only send if state changed

        currentModal = newModal;
        sendModalStateMessage(newModal);
    });
}

function getModalTypeFromPath(path: string): DemoFlowType {
    if (path.startsWith('/swap/')) return 'swap';
    if (path === '/staking') return 'stake';
    if (path === '/demo-buy' || path === '/buy') return 'buy';
    return 'idle';
}

function sendModalStateMessage(modalType: DemoFlowType): void {
    let messageType: string;

    switch (modalType) {
        case 'buy':
            messageType = 'action:open-buy-modal';
            break;
        case 'stake':
            messageType = 'action:open-staking-modal';
            break;
        case 'swap':
            messageType = 'action:open-swap-modal';
            break;
        case 'idle':
            messageType = 'action:close-modal';
            break;
        default:
            return;
    }

    window.parent.postMessage({ type: messageType }, '*');
    console.log(`[Demo] Sent ${messageType} to parent`);
}

/**
 * Handles action messages from parent frame
 */
function handleParentAction(messageType: string): void {
    console.log('[Demo] Handling parent action:', messageType);

    let targetRoute: string;
    switch (messageType) {
        case 'action:open-buy-modal':
            targetRoute = demoRoutes.buy;
            break;
        case 'action:open-staking-modal':
            targetRoute = demoRoutes.stake;
            break;
        case 'action:open-swap-modal':
            targetRoute = demoRoutes.swap;
            break;
        case 'action:close-modal':
            targetRoute = demoRoutes.idle;
            break;
        default:
            console.warn('[Demo] Unknown action message:', messageType);
            return;
    }

    if (demoRouter.currentRoute.path !== targetRoute) {
        if (messageType.includes('modal')) { // Set active currency for financial actions
            import('@/stores/Account').then(({ useAccountStore }) => {
                import('@nimiq/utils').then(({ CryptoCurrency }) => {
                    useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
                });
            });
        }

        // eslint-disable-next-line  @typescript-eslint/no-empty-function
        demoRouter.push({ path: targetRoute }).catch(() => {}); // Ignore duplicate navigation errors
    }
}

export type { DemoState, DemoFlowType, WalletPlaygroundMessage };
export { checkIfDemoIsActive, DemoModal, demoRoutes };
export function getCurrentModal(): DemoFlowType {
    return currentModal;
}

// Export the main transaction insertion function that was exposed in the original module
export { dangerouslyInsertFakeBuyNimTransaction };

// Export transaction creation functions
export {
    createStakeTransaction,
    createSwapOutgoingTransaction,
    createSwapIncomingTransaction,
    completeSwapTransactions,
    transformNimTransaction,
    transformBtcTransaction,
    insertFakeNimTransactions,
    insertFakeBtcTransactions,
    insertFakeUsdcTransactions,
    insertFakeUsdtTransactions,
    updateNimBalance,
    updateBtcBalance,
} from './DemoTransactions';

// Export the DemoHubApi class
export { DemoHubApi } from './DemoHubApi';

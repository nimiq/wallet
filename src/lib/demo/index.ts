/* eslint-disable max-len, consistent-return, no-console, no-async-promise-executor */

/**
 * Demo Mode for the Nimiq Wallet
 * ------------------------------
 *
 * This module provides a complete demo environment for the Nimiq Wallet, allowing users to
 * try out wallet features without connecting to real blockchain networks.
 *
 * Demo mode can only be activated through build commands:
 * - yarn serve:demo (development)
 * - yarn build:demo (production build)
 * - yarn build:demo-production (production build with mainnet config)
 *
 * When active, demo mode:
 * - Creates fake accounts with demo balances
 * - Generates fake transaction history
 * - Simulates blockchain interactions like sending, receiving, and swapping
 * - Obfuscates addresses and disables certain features that wouldn't work in demo mode
 * - Redirects certain actions to explainer modals
 *
 * This is intended for demonstration, educational, and testing purposes only.
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

// Keep a reference to the router here
let demoRouter: VueRouter;

// Simple state tracking for current modal
let currentModal: DemoFlowType = 'idle';

// Track if demo has been initialized to prevent duplicate initialization
let isInitialized = false;

// Demo modal imports for dynamic loading
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

/**
 * Initializes the demo environment and sets up various routes, data, and watchers.
 */
export function dangerouslyInitializeDemo(router: VueRouter): void {
    // Check if demo is active according to the configuration
    if (!checkIfDemoIsActive()) {
        console.info('[Demo] Demo mode not enabled in configuration. Skipping initialization.');
        return;
    }

    // Prevent duplicate initialization during hot reload
    if (isInitialized && demoRouter === router) {
        console.debug('[Demo] Demo already initialized, skipping duplicate initialization.');
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

    // Mark as initialized
    isInitialized = true;
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

/**
 * Adds routes pointing to our demo modals.
 */
function addDemoModalRoutes(): void {
    // Use a flag attached to the router instance to track if routes were added
    // This persists across hot reloads since the router instance persists
    if ((demoRouter as any)._demoRoutesAdded) {
        console.debug('[Demo] Routes already added to router, skipping duplicate registration');
        return;
    }

    // Import layout components for explicit inclusion
    const AccountOverview = () => import(/* webpackChunkName: "account-overview" */ '@/components/layouts/AccountOverview.vue');
    const AddressOverview = () => import(/* webpackChunkName: "address-overview" */ '@/components/layouts/AddressOverview.vue');

    // Add demo routes with explicit layout components
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
    
    // Mark routes as added on the router instance
    (demoRouter as any)._demoRoutesAdded = true;
    console.debug('[Demo] Demo routes added successfully');
}

/**
 * Listens for messages from parent and monitors route changes for modal communication
 */
function attachIframeListeners(): void {
    // Listen for messages from parent frame
    window.addEventListener('message', (event) => {
        console.log('[Demo] Received message:', event.data, 'from:', event.origin);
        if (!event.data || typeof event.data !== 'object') return;

        const message = event.data as WalletPlaygroundMessage;
        if (!message.type || !message.type.startsWith('action:')) return;

        handleParentAction(message.type);
    });

    // Monitor route changes to send modal open/close messages
    demoRouter.afterEach((to, from) => {
        const newModal = getModalTypeFromPath(to.path);
        const oldModal = getModalTypeFromPath(from.path);

        // Only send message if modal state actually changed
        if (newModal === currentModal) return;
        
        currentModal = newModal;
        sendModalStateMessage(newModal);
    });
}

/**
 * Determines modal type from route path
 */
function getModalTypeFromPath(path: string): DemoFlowType {
    if (path.startsWith('/swap/')) return 'swap';
    if (path === '/staking') return 'stake';
    if (path === '/demo-buy' || path === '/buy') return 'buy';
    return 'idle';
}

/**
 * Sends appropriate modal state message to parent
 */
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

    // Map message types to routes
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

    // Navigate if not already on target route
    if (demoRouter.currentRoute.path !== targetRoute) {
        // Set active currency for financial actions
        if (messageType.includes('modal')) {
            import('@/stores/Account').then(({ useAccountStore }) => {
                import('@nimiq/utils').then(({ CryptoCurrency }) => {
                    useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
                });
            });
        }

        demoRouter.push({ path: targetRoute }).catch(() => {
            // Silently ignore navigation duplicated errors
        });
    }
}

// Export types and constants for backward compatibility
export type { DemoState, DemoFlowType };
export { checkIfDemoIsActive, DemoModal, demoRoutes };

// Export message type for compatibility
export type { WalletPlaygroundMessage };

// Export function to get current modal state
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

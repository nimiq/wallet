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
import { useConfig } from '@/composables/useConfig';
import { checkIfDemoIsActive, DemoState, DemoModal, demoRoutes, type DemoFlowType, type WalletPlaygroundMessage, type PlaygroundState } from './DemoConstants';
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

// Playground state for tracking current action
let playgroundState: PlaygroundState = {
    connected: false,
    address: null,
    selectedAction: 'idle',
};

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
        // Initialize playground state with demo data
        playgroundState = {
            connected: true,
            address: 'NQ57 2814 7L5B NBBD 0EU7 EL71 HXP8 M7H8 MHKD', // Demo address
            selectedAction: 'idle',
        };

        // Send ready signal to parent
        window.parent.postMessage({
            type: 'demo:ready',
            data: playgroundState,
        }, '*');

        console.log('[Demo] Sent initial demo:ready message to parent');
    }, 500);
}

/**
 * Adds routes pointing to our demo modals.
 */
function addDemoModalRoutes(): void {
    demoRouter.addRoute('root', {
        name: DemoModal.Fallback,
        path: `/${DemoModal.Fallback}`,
        components: { modal: DemoFallbackModal },
        props: { modal: true },
    });
    demoRouter.addRoute('root', {
        name: DemoModal.Buy,
        path: `/${DemoModal.Buy}`,
        components: { modal: DemoPurchaseModal },
        props: { modal: true },
    });
}

/**
 * Listens for messages from iframes (or parent frames) about changes in the user flow.
 * Extended to handle wallet playground messages for iframe communication.
 */
function attachIframeListeners(): void {
    window.addEventListener('message', (event) => {
        // Log incoming messages for debugging
        console.log('[Demo] Received message:', event.data, 'from:', event.origin);
        if (!event.data || typeof event.data !== 'object') return;

        // Handle message data
        const message = event.data as WalletPlaygroundMessage;
        const messageType = message.type;
        const messageData = message.data;

        if (!messageType) return;

        // Handle standardized action messages
        if (messageType.startsWith('action:')) {
            handleActionMessage(messageType);
            return;
        }

        // Handle wallet playground messages
        handleWalletPlaygroundMessage(messageType, messageData, event.origin);
    });

    demoRouter.afterEach((to) => {
        const match = Object.entries(demoRoutes).find(([, route]) => route === to.path);
        if (!match) return;

        const flowType = match[0] as DemoFlowType;
        playgroundState.selectedAction = flowType;

        // Send action message to parent
        let messageType = '';
        switch (flowType) {
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

        if (messageType) {
            window.parent.postMessage({ type: messageType }, '*');
        }
    });
}

/**
 * Handles action messages from parent
 */
function handleActionMessage(messageType: string): void {
    console.log('[Demo] Handling action:', messageType);

    // Dynamic import to avoid circular dependencies
    import('@/stores/Account').then(({ useAccountStore }) => {
        import('@nimiq/utils').then(({ CryptoCurrency }) => {
            useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
        });
    });

    // Map message types to flow types and routes
    let flowType: DemoFlowType;
    switch (messageType) {
        case 'action:open-buy-modal':
            flowType = 'buy';
            break;
        case 'action:open-staking-modal':
            flowType = 'stake';
            break;
        case 'action:open-swap-modal':
            flowType = 'swap';
            break;
        case 'action:close-modal':
            flowType = 'idle';
            break;
        default:
            console.warn('[Demo] Unknown action message:', messageType);
            return;
    }

    // Update playground state
    playgroundState.selectedAction = flowType;

    // Navigate to the appropriate route
    if (demoRoutes[flowType] && demoRouter.currentRoute.path !== demoRoutes[flowType]) {
        demoRouter.push({
            path: demoRoutes[flowType],
        }).catch(() => {
            // Silently ignore navigation duplicated errors
        });
    }
}

/**
 * Handles wallet playground messages from parent frame
 */
function handleWalletPlaygroundMessage(messageType: string, data: any, origin: string): void {
    console.log('[Demo] Received wallet playground message:', messageType, data, 'from:', origin);

    try {
        switch (messageType) {
            case 'action:change':
                handleActionChange(data);
                break;

            default:
                console.warn('[Demo] Unknown playground message type:', messageType);
        }
    } catch (error) {
        console.error('[Demo] Error handling wallet playground message:', error);
    }
}
/**
 * Handles action:change message by updating the selected action
 */
function handleActionChange(data: { action: DemoFlowType }): void {
    if (!data || !data.action) {
        console.warn('[Demo] Invalid action change data:', data);
        return;
    }

    const { action } = data;
    console.log('[Demo] Changing action to:', action);

    // Update playground state
    playgroundState.selectedAction = action;

    // Navigate to the appropriate route
    if (demoRoutes[action] && demoRouter.currentRoute.path !== demoRoutes[action]) {
        demoRouter.push({
            path: demoRoutes[action],
        }).catch(() => {
            // Silently ignore navigation duplicated errors
        });
    }

    // Set active currency for financial actions
    if (action === 'buy' || action === 'swap' || action === 'stake') {
        import('@/stores/Account').then(({ useAccountStore }) => {
            import('@nimiq/utils').then(({ CryptoCurrency }) => {
                useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
            });
        });
    }
}
// Export types and constants for backward compatibility
export type { DemoState, DemoFlowType };
export { checkIfDemoIsActive, DemoModal, demoRoutes };

// Export new playground types and functionality
export type { WalletPlaygroundMessage, PlaygroundState };

// Export function to get current playground state
export function getPlaygroundState(): PlaygroundState {
    return { ...playgroundState };
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

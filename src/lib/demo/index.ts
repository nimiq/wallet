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
    createStakeTransaction,
    createSwapOutgoingTransaction,
    createSwapIncomingTransaction,
    completeSwapTransactions,
    transformNimTransaction,
    transformBtcTransaction,
    updateNimBalance,
    updateBtcBalance,
} from './DemoTransactions';
import { replaceBuyNimFlow, replaceStakingFlow } from './DemoFlows';
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

    listenForSwapChanges();
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

        // Handle standardized wallet action messages
        const { type, data: messageData } = event.data as WalletPlaygroundMessage;
        if (type && type.startsWith('wallet:action:')) {
            handleWalletActionMessage(type);
            return;
        }

        // Handle wallet playground messages
        if (type) {
            handleWalletPlaygroundMessage(type, messageData, event.origin);
        }
    });

    demoRouter.afterEach((to) => {
        const match = Object.entries(demoRoutes).find(([, route]) => route === to.path);
        if (!match) return;

        const flowType = match[0] as DemoFlowType;
        playgroundState.selectedAction = flowType;

        // Send standardized action message to parent
        let messageType = '';
        switch (flowType) {
            case 'buy':
                messageType = 'wallet:action:open-buy-demo-nim-modal';
                break;
            case 'stake':
                messageType = 'wallet:action:open-staking-modal';
                break;
            case 'swap':
                messageType = 'wallet:action:open-swap-modal';
                break;
            case 'idle':
                messageType = 'wallet:action:close-modal';
                break;
            default:
                // No action needed for unknown flow types
                break;
        }

        if (messageType) {
            window.parent.postMessage({ type: messageType }, '*');
        }
    });
}

/**
 * Handles standardized wallet action messages
 */
function handleWalletActionMessage(messageType: string): void {
    console.log('[Demo] Handling wallet action:', messageType);

    // Dynamic import to avoid circular dependencies
    import('@/stores/Account').then(({ useAccountStore }) => {
        import('@nimiq/utils').then(({ CryptoCurrency }) => {
            useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
        });
    });

    // Map message types to flow types and routes
    let flowType: DemoFlowType;
    switch (messageType) {
        case 'wallet:action:open-buy-demo-nim-modal':
            flowType = 'buy';
            break;
        case 'wallet:action:open-staking-modal':
            flowType = 'stake';
            break;
        case 'wallet:action:open-swap-modal':
            flowType = 'swap';
            break;
        case 'wallet:action:close-modal':
            flowType = 'idle';
            break;
        default:
            console.warn('[Demo] Unknown wallet action message:', messageType);
            return;
    }

    // Update playground state
    playgroundState.selectedAction = flowType;

    // Navigate to the appropriate route
    if (demoRoutes[flowType]) {
        demoRouter.push({
            path: demoRoutes[flowType],
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
            case 'parent:ready':
                handleParentReady(origin);
                break;

            case 'wallet:action:change':
                handleActionChange(data);
                break;

            case 'wallet:state':
                handleStateUpdate(data);
                break;

            case 'wallet:connect:response':
                handleConnectResponse(data);
                break;

            case 'wallet:transaction:response':
            case 'wallet:sign:response':
                handleTransactionResponse(data);
                break;

            case 'wallet:disconnect':
                handleDisconnect();
                break;

            default:
                console.warn('[Demo] Unknown wallet playground message type:', messageType);
        }
    } catch (error) {
        console.error('[Demo] Error handling wallet playground message:', error);
    }
}

/**
 * Handles parent:ready message by responding with playground:ready
 */
function handleParentReady(origin: string): void {
    console.log('[Demo] Parent is ready, sending playground:ready response');

    // Initialize playground state with demo data
    playgroundState = {
        connected: true,
        address: 'NQ57 2814 7L5B NBBD 0EU7 EL71 HXP8 M7H8 MHKD', // Demo address
        selectedAction: 'idle',
    };

    // Send playground:ready message back to parent
    window.parent.postMessage({
        type: 'playground:ready',
        data: playgroundState,
    }, origin);
}

/**
 * Handles wallet:action:change message by updating the selected action
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
    if (demoRoutes[action]) {
        demoRouter.push({
            path: demoRoutes[action],
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

/**
 * Handles wallet:state message by updating the full state
 */
function handleStateUpdate(data: Partial<PlaygroundState>): void {
    console.log('[Demo] Updating state:', data);

    if (data) {
        Object.assign(playgroundState, data);

        // If action changed, navigate to appropriate route
        if (data.selectedAction && demoRoutes[data.selectedAction]) {
            demoRouter.push({
                path: demoRoutes[data.selectedAction],
            });
        }
    }
}

/**
 * Handles wallet:connect:response message
 */
function handleConnectResponse(data: any): void {
    console.log('[Demo] Connect response:', data);
    playgroundState.connected = true;

    // Could implement UI feedback here
}

/**
 * Handles wallet:transaction:response and wallet:sign:response messages
 */
function handleTransactionResponse(data: any): void {
    console.log('[Demo] Transaction/Sign response:', data);

    // Could implement transaction feedback here
}

/**
 * Handles wallet:disconnect message
 */
function handleDisconnect(): void {
    console.log('[Demo] Disconnecting wallet');
    playgroundState.connected = false;
    playgroundState.address = null;
    playgroundState.selectedAction = 'idle';

    // Navigate back to idle state
    demoRouter.push({
        path: demoRoutes.idle,
    });
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

// Export function to manually update playground state (for testing purposes)
export function updatePlaygroundState(updates: Partial<PlaygroundState>): void {
    Object.assign(playgroundState, updates);
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

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
import { checkIfDemoIsActive, DemoState, DemoModal, MessageEventName, demoRoutes, type DemoFlowMessage, type DemoFlowType } from './DemoConstants';
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
 */
function attachIframeListeners(): void {
    window.addEventListener('message', (event) => {
        if (!event.data || typeof event.data !== 'object') return;
        const { kind, data } = event.data as DemoFlowMessage;
        if (kind === MessageEventName.FlowChange && demoRoutes[data]) {
            // Dynamic import to avoid circular dependencies
            import('@/stores/Account').then(({ useAccountStore }) => {
                import('@nimiq/utils').then(({ CryptoCurrency }) => {
                    useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
                });
            });

            demoRouter.push({
                path: demoRoutes[data],
            });
        }
    });

    demoRouter.afterEach((to) => {
        const match = Object.entries(demoRoutes).find(([, route]) => route === to.path);
        if (!match) return;
        window.parent.postMessage({ kind: MessageEventName.FlowChange, data: match[0] as DemoFlowType }, '*');
    });
}

// Export types and constants for backward compatibility
export type { DemoState, DemoFlowType, DemoFlowMessage };
export { checkIfDemoIsActive, DemoModal, MessageEventName, demoRoutes };

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

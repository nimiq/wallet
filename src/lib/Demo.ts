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

// Re-export everything from the refactored demo modules for backward compatibility
export {
    dangerouslyInitializeDemo,
    checkIfDemoIsActive,
    dangerouslyInsertFakeBuyNimTransaction,
    DemoHubApi,
    type DemoState,
    type DemoFlowType,
    type DemoFlowMessage,
    DemoModal,
    MessageEventName,
    demoRoutes,
} from './demo/index';

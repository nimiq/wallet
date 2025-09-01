/* eslint-disable max-len */

// Demo state type
export type DemoState = {
    active: boolean,
};

// Demo modal types
export const DemoModal = {
    Fallback: 'demo-fallback',
    Buy: 'demo-buy',
} as const;

// Demo addresses
export const demoNimAddress = 'NQ57 2814 7L5B NBBD 0EU7 EL71 HXP8 M7H8 MHKD';
export const demoBtcAddress = '1XYZDemoAddress';
export const demoPolygonAddress = '0xabc123DemoPolygonAddress';
export const buyFromAddress = 'NQ04 JG63 HYXL H3QF PPNA 7ED7 426M 3FQE FHE5';

// Initial balances
export const nimInitialBalance = 140_418 * 1e5; // 14,041,800,000 - 14 april, 2018. 5 decimals.
export const btcInitialBalance = 0.00025 * 1e8; // 0.00025 BTC (8 decimals)
export const usdtInitialBalance = 514.83 * 1e6; // 5000 USDT (6 decimals)
export const usdcInitialBalance = 357.38 * 1e6; // 3000 USDC (6 decimals)

// Flow types - supporting wallet playground actions
export type DemoFlowType = 'buy' | 'swap' | 'stake' | 'idle';

// Iframe communication message types
export type WalletPlaygroundMessage = {
    type: 'demo:ready' | 'action:open-buy-modal' | 'action:open-staking-modal' | 'action:open-swap-modal' | 'action:close-modal',
    data?: any,
};

// Demo routes mapping - including idle state
export const demoRoutes: Record<DemoFlowType, string> = {
    buy: '/demo-buy', // Use demo buy route to show custom modal
    swap: '/swap/NIM-BTC',
    stake: '/staking',
    idle: '/', // Default route for idle state
};

// Hub API requests to ignore
export const ignoreHubRequests = [
    'addBtcAddresses',
    'on',
];

// Demo CSS styles
export const demoCSS = `
.transaction-list .month-label > :where(.fetching, .failed-to-fetch) {
    display: none;
}

/* Hide address */
.active-address .meta .copyable {
    display: none !important;
}

#app > div > .wallet-status-button.nq-button-pill {
    display: none;
}

.staking-button .tooltip.staking-feature-tip {
    display: none;
}

.modal.transaction-modal .confirmed .tooltip.info-tooltip {
    display: none;
}

.send-modal-footer .footer-notice {
    display: none;
}

/* Demo address tooltip styling */
.tooltip.demo-tooltip {
    width: max-content;
    background: var(--nimiq-orange-bg);
    margin-left: -7rem;
}

.tooltip.demo-tooltip::after {
    background: #fc750c; /* Match the red theme for the demo warning */
}

.demo-highlight-badge {
    position: absolute;
    width: 34px;
    height: 34px;
    z-index: 5;
    pointer-events: none;
}

.demo-highlight-badge > div {
    position: relative;
    width: 100%;
    height: 100%;
    background: rgba(31, 35, 72, 0.1);
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    backdrop-filter: blur(3px);
}

.demo-highlight-badge > div::before {
    content: "";
    position: absolute;
    inset: 5px;
    background: rgba(31, 35, 72, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0px 0px 30px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(3px);
    border-radius: 12px;
}

.demo-highlight-badge > div::after {
    content: "";
    position: absolute;
    inset: 11.6px;
    background: rgba(255, 255, 255);
    border-radius: 50%;
}

.send-modal-footer .footer-notice {
    display: none;
}

.account-grid > button.reset,
.account-grid > .nimiq-account {
    background: #e7e8ea;
    border-radius: 8px;
    transition: background 0.2s var(--nimiq-ease);
}

.account-grid > button:where(:hover, :focus-visible) {
    background: #dedee2 !important;
}

/* Hide links and addresses to block explorer in the swap animation */
.swap-animation :where(.short-address, .blue-link.nq-link) {
    display: none !important;
}
`;

// Bank SVG icon
export const bankSvg = `<svg class="bank-icon" width="48" height="48" viewBox="0 0 66 66" 
        fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M65.012 40.982c-4.408 17.682-22.315 28.438-39.999 24.03C7.339 60.605-3.422 42.698.989 
        25.021 5.394 7.339 23.3-3.42 40.979.988 58.66 5.395 69.42 23.304 65.011 40.982z" fill="#0582CA"/>
        <g fill="#fff">
            <path d="M31.986 12.597a2 2 0 012.028 0l15 8.823A2 2 0 0150 23.144v.356a1.5 1.5 0 01-1.5 1.5h-31a1.5 
            1.5 0 01-1.5-1.5v-.356a2 2 0 01.986-1.724l15-8.824z"/>
            <rect x="16" y="45" width="34" height="5.077" rx="1.5"/>
            <rect x="20.121" y="28" width="5.152" height="14" rx="1.5"/>
            <rect x="40.727" y="28" width="5.152" height="14" rx="1.5"/>
            <rect x="30.424" y="28" width="5.152" height="14" rx="1.5"/>
        </g>
    </svg>`;

/**
 * Checks if the demo mode should be active.
 * Demo mode is only activated through build commands:
 * - yarn serve:demo
 * - yarn build:demo
 * - yarn build:demo-production
 * This ensures demo builds are separate deployments with no runtime activation.
 */
export function checkIfDemoIsActive(): boolean {
    return !!(process.env as any).IS_DEMO_BUILD;
}

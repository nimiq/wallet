/* eslint-disable max-len, consistent-return, no-console, no-async-promise-executor */
import VueRouter from 'vue-router';
import { TransactionState as ElectrumTransactionState } from '@nimiq/electrum-client';
import { CryptoCurrency, Utf8Tools } from '@nimiq/utils';
import { KeyPair, PlainTransactionDetails, PrivateKey } from '@nimiq/core';
import { AccountType, useAccountStore } from '@/stores/Account';
import { AddressType, useAddressStore } from '@/stores/Address';
import { toSecs, type Transaction as NimTransaction, useTransactionsStore } from '@/stores/Transactions';
import { useBtcTransactionsStore, type Transaction as BtcTransaction } from '@/stores/BtcTransactions';
import { useUsdtTransactionsStore, TransactionState as UsdtTransactionState, type Transaction as UsdtTransaction } from '@/stores/UsdtTransactions';
import { useUsdcTransactionsStore, TransactionState as UsdcTransactionState, type Transaction as UsdcTransaction } from '@/stores/UsdcTransactions';
import { useStakingStore } from '@/stores/Staking';
import { useAccountSettingsStore } from '@/stores/AccountSettings';
import { usePolygonAddressStore } from '@/stores/PolygonAddress';
import Config from 'config';
import { FastspotAsset, FastspotLimits, FastspotUserLimits, ReferenceAsset, SwapAsset, SwapStatus } from '@nimiq/fastspot-api';
import HubApi, { SetupSwapResult } from '@nimiq/hub-api';
import { useConfig } from '@/composables/useConfig';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { useContactsStore } from '@/stores/Contacts';
import { useBtcLabelsStore } from '@/stores/BtcLabels';
import { useUsdcContactsStore } from '@/stores/UsdcContacts';
import { useUsdtContactsStore } from '@/stores/UsdtContacts';
import { useFiatStore } from '@/stores/Fiat';
import { SwapState, useSwapsStore } from '@/stores/Swaps';

export type DemoState = {
    active: boolean,
};

// The query param that activates the demo. e.g. https://wallet.nimiq.com/?demo=
const DEMO_PARAM = 'demo';

const DemoFallbackModal = () =>
    import(
        /* webpackChunkName: 'demo-hub-fallback-modal' */
        '@/components/modals/demos/DemoModalFallback.vue'
    );

const DemoPurchaseModal = () =>
    import(
        /* webpackChunkName: 'account-menu-modal' */
        '@/components/modals/demos/DemoModalBuy.vue'
    );

// Replacing the enum with a simple object to avoid backticks
const DemoModal = {
    Fallback: 'demo-fallback',
    Buy: 'demo-buy',
};

// Addresses for demo:
const demoNimAddress = 'NQ57 2814 7L5B NBBD 0EU7 EL71 HXP8 M7H8 MHKD';
const demoBtcAddress = '1XYZDemoAddress';
const demoPolygonAddress = '0xabc123DemoPolygonAddress';
const buyFromAddress = 'NQ04 JG63 HYXL H3QF PPNA 7ED7 426M 3FQE FHE5';

// We keep this as our global/final balance, which should result from the transactions
const nimInitialBalance = 140_418 * 1e5; // 14,041,800,000 - 14 april, 2018. 5 decimals.
const btcInitialBalance = 0.0025 * 1e8; // 1 BTC (8 decimals)
const usdtInitialBalance = 514.83 * 1e6; // 5000 USDT (6 decimals)
const usdcInitialBalance = 357.38 * 1e6; // 3000 USDC (6 decimals)

// Swaps
const onGoingSwaps = new Map<string, SetupSwapArgs>();

// We keep a reference to the router here.
let demoRouter: VueRouter;

// #region Main

/**
 * Initializes the demo environment and sets up various routes, data, and watchers.
 */
export function dangerouslyInitializeDemo(router: VueRouter) {
    console.warn('[Demo] Initializing demo environment...');

    demoRouter = router;

    insertCustomDemoStyles();
    rewriteDemoRoutes();
    setupSingleMutationObserver();
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
    replaceStakingFlow();
    replaceBuyNimFlow();

    listenForSwapChanges();
}

// #endregion

// #region App setup

/**
 * Checks if the 'demo' query param is present in the URL.
 */
export function checkIfDemoIsActive() {
    return window.location.search.includes(DEMO_PARAM);
}

/**
 * Creates a style tag to add demo-specific CSS.
 */
function insertCustomDemoStyles() {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = demoCSS;
    document.head.appendChild(styleElement);
}

/**
 * Sets up a router guard to handle redirects for the demo environment.
 */
function rewriteDemoRoutes() {
    demoRouter.beforeEach((to, _from, next) => {
        if (to.path.startsWith('/receive/') && !to.path.startsWith('/receive/nim')) {
            return next({
                path: `/${DemoModal.Fallback}`,
                query: { ...to.query, [DEMO_PARAM]: '' },
            })
        }
        // Redirect certain known paths to the Buy demo modal
        if (to.path === '/buy') {
            return next({
                path: `/${DemoModal.Buy}`,
                query: { ...to.query, [DEMO_PARAM]: '' },
            });
        }

        // Ensure the ?demo param is in place
        if (to.query.demo === '') return next();
        return next({ path: to.path, query: { ...to.query, [DEMO_PARAM]: '' } });
    });
}

/**
 * Sets up a single mutation observer to handle all DOM-based demo features
 */
function setupSingleMutationObserver() {
    // Track processed elements to avoid duplicate processing
    const processedElements = new WeakSet();

    // Handler function to process all DOM mutations
    const processDomChanges = () => {
        // Call each handler with the processed elements set
        setupVisualCues(processedElements);
        disableSwapTriggers(processedElements);
        enableSellAndSwapModals(processedElements);
        obfuscateAddresses(processedElements);
        observeReceiveModal(processedElements);
    };

    // Create one mutation observer for all DOM modifications
    const mutationObserver = new MutationObserver(processDomChanges);

    // Observe the entire document with a single observer
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled'],
    });

    processDomChanges();
    // Also run checks when routes change to catch elements that appear after navigation
    demoRouter.afterEach(() => {
        // Wait for Vue to update the DOM after route change
        setTimeout(processDomChanges, 100);
    });
}

/**
 * Observes the home view to attach a highlight to some buttons for demonstration purposes.
 */
function setupVisualCues(processedElements: WeakSet<Element>) {
    const highlightTargets = [
        ['.sidebar .trade-actions button', { top: '-18px', right: '-4px' }],
        ['.sidebar .swap-tooltip button', { top: '-18px', right: '-8px' }],
        ['.actions .staking-button', { top: '-2px', right: '-2px' }],
    ] as const;

    highlightTargets.forEach(([selector, position]) => {
        const target = document.querySelector(selector);
        if (!target || processedElements.has(target) || target.querySelector('.demo-highlight-badge')) return;

        const wrapper = document.createElement('div');
        wrapper.classList.add('demo-highlight-badge');
        wrapper.style.top = position.top;
        wrapper.style.right = position.right;
        const circle = document.createElement('div');

        wrapper.appendChild(circle);
        target.appendChild(wrapper);
        processedElements.add(target);
    });
}

/**
 * The only swap allowed is NIM-BTC.
 * Removes the swap triggers from the account grid so the user does not the
 * option to swap or sell assets in the demo environment.
 * We also remove the pair selection in the SwapModal.
 */
function disableSwapTriggers(processedElements: WeakSet<Element>) {
    const swapTriggers = document.querySelectorAll(
        '.account-grid > :where(.nim-usdc-swap-button, .nim-btc-swap-button, .btc-usdc-swap-button, .account-backgrounds)',
    ) as NodeListOf<HTMLDivElement>;

    swapTriggers.forEach((trigger) => {
        if (!processedElements.has(trigger)) {
            trigger.remove();
            processedElements.add(trigger);
        }
    });

    const pairSelection = document.querySelector('.pair-selection');
    if (pairSelection && !processedElements.has(pairSelection)) {
        pairSelection.remove();
        processedElements.add(pairSelection);
    }
}

/**
 * Adds routes pointing to our demo modals.
 */
function addDemoModalRoutes() {
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

// #endregion

// #region Addresses Setup

/**
 * Setup and initialize the demo data for all currencies.
 */
function setupDemoAddresses() {
    const { setAddressInfos } = useAddressStore();
    setAddressInfos([
        {
            label: 'Demo Account',
            type: AddressType.BASIC,
            address: demoNimAddress,
            balance: nimInitialBalance,
        },
    ]);

    // Setup Polygon addresses and balances
    const { setAddressInfos: setPolygonAddressInfos } = usePolygonAddressStore();
    setPolygonAddressInfos([{
        address: demoPolygonAddress,
        balanceUsdc: usdcInitialBalance,
        balanceUsdcBridged: 0,
        balanceUsdtBridged: usdtInitialBalance,
        pol: 1,
    }]);
}

/**
 * Creates a fake main account referencing our demo addresses.
 */
function setupDemoAccount() {
    const { addAccountInfo, setActiveCurrency } = useAccountStore();
    const { setStablecoin, setKnowsAboutUsdt } = useAccountSettingsStore();

    // Setup account info with both USDC and USDT addresses
    addAccountInfo({
        id: 'demo-account-1',
        type: AccountType.BIP39,
        label: 'Demo Main Account',
        fileExported: true,
        wordsExported: true,
        addresses: [demoNimAddress],
        btcAddresses: { internal: [demoBtcAddress], external: [demoBtcAddress] },
        polygonAddresses: [demoPolygonAddress, demoPolygonAddress],
        uid: 'demo-uid-1',
    });

    // Pre-select USDC as the default stablecoin and mark USDT as known
    setStablecoin(CryptoCurrency.USDC);
    setKnowsAboutUsdt(true);

    setActiveCurrency(CryptoCurrency.NIM);
}

enum MessageEventName {
    FlowChange = 'FlowChange'
}

/**
 * Listens for messages from iframes (or parent frames) about changes in the user flow.
 */
function attachIframeListeners() {
    window.addEventListener('message', (event) => {
        if (!event.data || typeof event.data !== 'object') return;
        const { kind, data } = event.data as DemoFlowMessage;
        if (kind === MessageEventName.FlowChange && demoRoutes[data]) {
            useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
            demoRouter.push(demoRoutes[data]);
        }
    });

    demoRouter.afterEach((to) => {
        const match = Object.entries(demoRoutes).find(([, route]) => route === to.path);
        if (!match) return;
        window.parent.postMessage({ kind: MessageEventName.FlowChange, data: match[0] as DemoFlowType }, '*');
    });
}

// #endregion

// #region NIM txs

interface NimTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
}

/**
 * Defines transaction definitions for demo NIM transactions
 */
function defineNimFakeTransactions(): Partial<NimTransaction>[] {
    const txDefinitions: NimTransactionDefinition[] = [
        { fraction: -0.05, daysAgo: 0.4, description: 'Local cafe coffee' },
        { fraction: 0.1, daysAgo: 0.6, description: 'Red envelope from neighbor', recipientLabel: 'Neighbor' },
        { fraction: -0.03, daysAgo: 1, description: 'Food truck snack' },
        { fraction: -0.06, daysAgo: 2, description: 'Local store book' },
        { fraction: -0.01, daysAgo: 2, description: 'Chicken waffle', recipientLabel: 'Roberto\'s Waffle' },
        { fraction: -0.04, daysAgo: 3, description: 'Corner shop chai & snack' },
        { fraction: -0.12, daysAgo: 3, description: 'Thai massage session' },
        { fraction: -0.15, daysAgo: 6, description: 'Swedish flat-pack chair', recipientLabel: 'Furniture Mart' },
        { fraction: 0.1, daysAgo: 6, description: 'Red envelope from family', recipientLabel: 'Family' },
        { fraction: -0.08, daysAgo: 7, description: 'Cozy diner dinner', recipientLabel: 'Melissa' },
        { fraction: -0.02, daysAgo: 7, description: 'Coworker snack', recipientLabel: 'Coworker' },
        { fraction: -0.03, daysAgo: 8, description: 'Morning bus fare' },
        { fraction: -0.05, daysAgo: 8, description: 'Local fruit pack' },
        { fraction: 0.02, daysAgo: 10, description: 'Neighbor bill', recipientLabel: 'Neighbor' },
        { fraction: -0.07, daysAgo: 12, description: 'Movie ticket night' },
        { fraction: -0.04, daysAgo: 14, description: 'Trendy cafe coffee', recipientLabel: 'Cafe' },
        { fraction: -0.03, daysAgo: 15, description: 'Market street food snack' },
        { fraction: -0.1, daysAgo: 18, description: '' },
        { fraction: -0.05, daysAgo: 20, description: 'Street vendor souvenir' },
        { fraction: -0.08, daysAgo: 22, description: 'Quick haircut', recipientLabel: 'Barber' },
        { fraction: -0.04, daysAgo: 25, description: 'Local dessert', recipientLabel: 'Jose' },
        { fraction: -0.02, daysAgo: 27, description: 'Mall parking' },
        { fraction: -0.1, daysAgo: 30, description: 'Streaming subscription', recipientLabel: 'StreamCo' },
        { fraction: 0.03, daysAgo: 32, description: 'Mistaken charge refund', recipientLabel: 'Store' },
        { fraction: -0.06, daysAgo: 35, description: 'Taxi fare', recipientLabel: 'Crazy Taxi' },
        { fraction: -0.04, daysAgo: 38, description: 'Local shop mug' },
        { fraction: -0.01, daysAgo: 40, description: 'Local newspaper' },
        { fraction: -0.05, daysAgo: 42, description: 'Coworker ride', recipientLabel: 'Coworker' },
        { fraction: -0.07, daysAgo: 45, description: 'Bistro lunch' },
        { fraction: -0.12, daysAgo: 45, description: 'Weekly market shopping', recipientLabel: 'Market' },
        { fraction: -0.1, daysAgo: 50, description: 'Utility bill', recipientLabel: 'Utility Co.' },
        { fraction: -0.03, daysAgo: 55, description: 'Corner snack pack' },
        { fraction: -0.1, daysAgo: 60, description: 'Streaming subscription', recipientLabel: 'StreamCo' },
        { fraction: 0.05, daysAgo: 62, description: 'Client tip', recipientLabel: 'Client' },
        { fraction: -0.06, daysAgo: 65, description: 'Hair trim', recipientLabel: 'Barber' },
        { fraction: -0.09, daysAgo: 68, description: 'Takeaway meal' },
        { fraction: -0.04, daysAgo: 70, description: 'Stall fresh juice' },
        { fraction: -0.05, daysAgo: 72, description: 'Park picnic' },
        { fraction: -0.03, daysAgo: 75, description: 'Local event fee', recipientLabel: 'Event Org' },
        { fraction: -0.1, daysAgo: 78, description: 'Neighbors dinner', recipientLabel: 'Neighbors' },
        { fraction: -0.12, daysAgo: 80, description: 'New shoes sale' },
        { fraction: 0.1, daysAgo: 85, description: 'Festive cash gift', recipientLabel: 'Family' },
        { fraction: -0.1, daysAgo: 90, description: 'Streaming subscription', recipientLabel: 'StreamCo' },
        { fraction: -0.05, daysAgo: 95, description: 'Bakery fresh bread', recipientLabel: 'Bakery' },
        { fraction: -0.04, daysAgo: 100, description: 'Ice cream treat', recipientLabel: 'Ice Cream' },
        { fraction: -0.08, daysAgo: 110, description: 'Fitness class fee', recipientLabel: 'Gym' },
        { fraction: -0.03, daysAgo: 115, description: 'Meal discount' },
        { fraction: 0.04, daysAgo: 120, description: 'Double charge refund', recipientLabel: 'Store' },
        { fraction: -0.07, daysAgo: 125, description: 'Boutique trendy hat' },
        { fraction: -0.02, daysAgo: 130, description: 'Local cause donation', recipientLabel: 'Charity' },
        { fraction: -0.09, daysAgo: 140, description: 'Neighborhood dinner', recipientLabel: 'Food Joint' },
        { fraction: -0.05, daysAgo: 150, description: 'Gadget repair fee', recipientLabel: 'Repair Shop' },
        { fraction: -0.08, daysAgo: 200, description: 'Local play ticket', recipientLabel: 'Theater' },
        { fraction: -0.1, daysAgo: 250, description: 'Community event bill', recipientLabel: 'Community' },
        { fraction: 0.07, daysAgo: 300, description: 'Work bonus', recipientLabel: 'Employer' },
        { fraction: -0.04, daysAgo: 400, description: 'Local art fair entry' },
        { fraction: -0.06, daysAgo: 500, description: 'Online shop gadget', recipientLabel: 'Online Shop' },
        { fraction: -0.1, daysAgo: 600, description: 'Popular local dinner', recipientLabel: 'Diner' },
        { fraction: -0.12, daysAgo: 800, description: 'Home repair bill', recipientLabel: 'Repair Co.' },
        { fraction: 0.15, daysAgo: 1000, description: 'Freelance project check', recipientLabel: 'Client' },
        { fraction: -0.09, daysAgo: 1200, description: 'Local kitchen gear', recipientLabel: 'Kitchen Shop' },
        { fraction: -0.1, daysAgo: 1442, description: 'Family reunion dinner', recipientLabel: 'Family' },

    ];

    // Calculate sum of existing transactions to ensure they add up to exactly 1
    const existingSum = txDefinitions.reduce((sum, def) => sum + def.fraction, 0);
    const remainingFraction = 1 - existingSum;

    // Add the final balancing transaction with appropriate description
    if (Math.abs(remainingFraction) > 0.001) { // Only add if there's a meaningful amount to balance
        txDefinitions.push({
            fraction: remainingFraction,
            daysAgo: 1450,
            description: remainingFraction > 0
                ? 'Blockchain Hackathon Prize!'
                : 'Annual Software Subscription Renewal',
            recipientLabel: remainingFraction > 0 ? 'Crypto Innovation Fund' : undefined,
        });
    }

    const { setContact } = useContactsStore();
    const txs: Partial<NimTransaction>[] = [];

    for (const def of txDefinitions) {
        let txValue = Math.floor(nimInitialBalance * def.fraction);
        // Adjust so it doesn't end in a 0 digit
        while (txValue > 0 && txValue % 10 === 0) {
            txValue -= 1;
        }

        const hex = encodeTextToHex(def.description);
        const to32Bytes = (h: string) => h.padStart(64, '0').slice(-64);
        const address = KeyPair.derive(PrivateKey.fromHex(to32Bytes(hex))).toAddress().toUserFriendlyAddress();
        const recipient = def.fraction > 0 ? demoNimAddress : address;
        const sender = def.fraction > 0 ? address : demoNimAddress;
        const data = { type: 'raw', raw: hex } as const;
        const value = Math.abs(txValue);
        const timestamp = calculateDaysAgo(def.daysAgo);
        const tx: Partial<PlainTransactionDetails> = { value, recipient, sender, timestamp, data };
        txs.push(tx);
        // Add contact if a recipientLabel is provided
        if (def.recipientLabel && def.fraction < 0) {
            setContact(address, def.recipientLabel);
        }
    }

    return txs.sort((a, b) => a.timestamp! - b.timestamp!);
}

let head = 0;
let nonce = 0;

function transformNimTransaction(txs: Partial<NimTransaction>[]): NimTransaction[] {
    return txs.map((tx) => {
        head++;
        nonce++;

        return {
            network: 'mainnet',
            state: 'confirmed',
            transactionHash: `0x${nonce.toString(16)}`,
            sender: '',
            senderType: 'basic',
            recipient: '',
            recipientType: 'basic',
            value: 50000000,
            fee: 0,
            feePerByte: 0,
            format: 'basic',
            validityStartHeight: head,
            blockHeight: head,
            flags: 0,
            timestamp: Date.now(),
            size: 0,
            valid: true,
            proof: { raw: '', type: 'raw' },
            data: tx.data || { type: 'raw', raw: '' },
            ...tx,
        };
    });
}

/**
 * Inserts NIM transactions into the store. If no definitions provided, uses default demo transactions.
 */
function insertFakeNimTransactions(txs = defineNimFakeTransactions()) {
    const { addTransactions } = useTransactionsStore();
    addTransactions(transformNimTransaction(txs));
}

/**
 * Updates the NIM balance after a transaction
 */
function updateNimBalance(amount: number): void {
    const addressStore = useAddressStore();
    const currentAddressInfo = addressStore.addressInfos.value.find((info) => info.address === demoNimAddress);

    if (currentAddressInfo) {
        const newBalance = (currentAddressInfo.balance || 0) + amount;
        addressStore.patchAddress(demoNimAddress, { balance: newBalance });
    } else {
        console.error('[Demo] Failed to update NIM balance: Address not found');
    }
}

export function dangerouslyInsertFakeBuyNimTransaction(amount: number) {
    const tx: Partial<NimTransaction> = {
        value: amount,
        recipient: demoNimAddress,
        sender: buyFromAddress,
        data: {
            type: 'raw',
            raw: encodeTextToHex('Online Purchase'),
        },
    };

    setTimeout(() => {
        const { addTransactions } = useTransactionsStore();
        addTransactions(transformNimTransaction([tx]));
        updateNimBalance(amount);
    }, 1_500);
}

// #region BTC txs

interface BtcTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
    incoming: boolean;
    address: string;
}

/**
 * Defines transaction definitions for demo BTC transactions.
 * Note: We add the "address" field so that incoming transactions use the correct sender address.
 */
function defineBtcFakeTransactions(): BtcTransaction[] {
    const txDefinitions: BtcTransactionDefinition[] = [
        {
            fraction: 0.2,
            daysAgo: 2000,
            description: 'Initial BTC purchase from exchange',
            incoming: true,
            address: '1Kj4SNWFCxqvtP8nkJxeBwkXxgY9LW9rGg',
            recipientLabel: 'Satoshi Exchange',
        },
        {
            fraction: 0.15,
            daysAgo: 1600,
            description: 'Mining pool payout',
            incoming: true,
            address: '1Hz7vQrRjnu3z9k7gxDYhKjEmABqChDvJr',
            recipientLabel: 'Genesis Mining Pool',
        },
        {
            fraction: -0.19,
            daysAgo: 1200,
            description: 'Purchase from online marketplace',
            incoming: false,
            address: '1LxKe5kKdgGVwXukEgqFxh6DrCXF2Pturc',
            recipientLabel: 'Digital Bazaar Shop',
        },
        {
            fraction: 0.3,
            daysAgo: 800,
            description: 'Company payment for consulting',
            incoming: true,
            address: '1N7aecJuKGDXzYK8CgpnNRYxdhZvXPxp3B',
            recipientLabel: 'Corporate Treasury',
        },
        {
            fraction: -0.15,
            daysAgo: 365,
            description: 'Auto-DCA investment program',
            incoming: false,
            address: '12vxjmKJkfL9s5JwqUzEVVJGvKYJgALbsz',
        },
        {
            fraction: 0.075,
            daysAgo: 180,
            description: 'P2P sale of digital goods',
            incoming: true,
            address: '1MZYS9nvVmFvSK7em5zzAsnvRq82RUcypS',
        },
        {
            fraction: 0.05,
            daysAgo: 60,
            description: 'Recent purchase from exchange',
            incoming: true,
            address: '1Kj4SNWFCxqvtP8nkJxeBwkXxgY9LW9rGg',
        },
    ].sort((a, b) => b.daysAgo - a.daysAgo);

    // If the sum of fractions does not add up to 1, add a balancing transaction.
    const existingSum = txDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const remainingFraction = 1 - existingSum;
    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: remainingFraction,
            daysAgo: 0,
            description: remainingFraction > 0 ? 'Initial purchase' : 'Investment allocation',
            incoming: remainingFraction > 0,
            address: remainingFraction > 0 ? '1ExampleAddressForInitialPurchase' : '1ExampleAddressForInvestment',
            recipientLabel: remainingFraction > 0 ? 'Prime Exchange' : 'Investment Fund',
        });
    }

    return transformBtcTransaction(txDefinitions);
}

/**
 * Transforms BTC transaction definitions into actual transactions.
 */
function transformBtcTransaction(txDefinitions: BtcTransactionDefinition[]): BtcTransaction[] {
    const transactions = [];
    const knownUtxos = new Map();
    let txCounter = 1;

    for (const def of txDefinitions) {
        const txHash = `btc-tx-${txCounter++}`;
        // Compute the value using the initial BTC balance and the fraction.
        const value = Math.floor(btcInitialBalance * Math.abs(def.fraction));

        const tx: BtcTransaction = {
            addresses: [demoBtcAddress],
            isCoinbase: false,
            inputs: [
                {
                    // For incoming tx, use the external address; for outgoing, use our demo address.
                    address: def.incoming ? def.address : demoBtcAddress,
                    outputIndex: 0,
                    index: 0,
                    script: 'script',
                    sequence: 4294967295,
                    transactionHash: def.incoming ? txHash : (getUTXOToSpend(knownUtxos)?.txHash || txHash),
                    witness: ['witness'],
                },
            ],
            outputs: def.incoming
                ? [
                    {
                        value,
                        address: demoBtcAddress,
                        script: 'script',
                        index: 0,
                    },
                ]
                : [
                    {
                        value,
                        address: def.address,
                        script: 'script',
                        index: 0,
                    },
                    {
                        // Change output.
                        value: 1000000,
                        address: demoBtcAddress,
                        script: 'script',
                        index: 1,
                    },
                ],
            transactionHash: txHash,
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: Math.max(1, Math.floor(10 - def.daysAgo / 200)),
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
            state: ElectrumTransactionState.CONFIRMED,
        };

        updateUTXOs(knownUtxos, tx);
        transactions.push(tx);

        // Set labels if a recipient label is provided.
        if (def.recipientLabel) {
            const { setSenderLabel } = useBtcLabelsStore();
            setSenderLabel(def.incoming ? def.address : demoBtcAddress, def.recipientLabel);
        }
    }

    // Update the address store with the current UTXOs.
    const { addAddressInfos } = useBtcAddressStore();
    addAddressInfos([{
        address: demoBtcAddress,
        txoCount: transactions.length + 2, // Total number of outputs received.
        utxos: Array.from(knownUtxos.values()),
    }]);

    return transactions;
}

/**
 * Tracks UTXO changes for BTC transactions.
 */
function updateUTXOs(knownUtxos: Map<string, any>, tx: any) {
    // Remove spent inputs.
    for (const input of tx.inputs) {
        if (input.address === demoBtcAddress) {
            const utxoKey = `${input.transactionHash}:${input.outputIndex}`;
            knownUtxos.delete(utxoKey);
        }
    }

    // Add new outputs for our address.
    for (const output of tx.outputs) {
        if (output.address === demoBtcAddress) {
            const utxoKey = `${tx.transactionHash}:${output.index}`;
            knownUtxos.set(utxoKey, {
                transactionHash: tx.transactionHash,
                index: output.index,
                witness: {
                    script: output.script,
                    value: output.value,
                },
            });
        }
    }
}

/**
 * Helper to get a UTXO to spend.
 */
function getUTXOToSpend(knownUtxos: Map<string, any>) {
    if (knownUtxos.size === 0) return null;
    const utxo = knownUtxos.values().next().value;
    return {
        txHash: utxo.transactionHash,
        index: utxo.index,
        value: utxo.witness.value,
    };
}

/**
 * Insert fake BTC transactions into the store.
 */
function insertFakeBtcTransactions(txs = defineBtcFakeTransactions()) {
    const { addTransactions } = useBtcTransactionsStore();
    addTransactions(txs);
}

/**
 * Updates the BTC address balance by adding a new UTXO
 */
function updateBtcBalance(amount: number): void {
    const btcAddressStore = useBtcAddressStore();
    const addressInfo = btcAddressStore.state.addressInfos[demoBtcAddress];

    if (!addressInfo) {
        console.error('[Demo] Failed to update BTC balance: Address not found');
        return;
    }

    // Create a unique transaction hash
    const txHash = `btc-tx-swap-${Date.now().toString(16)}`;

    // Create a proper UTXO with the correct format
    const newUtxo = {
        transactionHash: txHash,
        index: 0,
        witness: {
            script: 'script',
            value: amount * 1e-6,
        },
        txoValue: amount * 1e-6,
    };

    btcAddressStore.addAddressInfos([{
        address: demoBtcAddress,
        utxos: [...(addressInfo.utxos || []), newUtxo],
    }]);

    console.log(`[Demo] Updated BTC balance, added UTXO with value: ${amount * 1e-6}`);
}

// #endregion

// #region Polygon txs

const getRandomPolygonHash = () => `0x${Math.random().toString(16).slice(2, 66)}`;
const getRandomPolygonAddress = () => `0x${Math.random().toString(16).slice(2, 42)}`;

interface UsdcTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
    incoming: boolean;
}

/**
 * Defines transaction definitions for demo USDC transactions
 */
function defineUsdcFakeTransactions(): UsdcTransaction[] {
    const txDefinitions: UsdcTransactionDefinition[] = [
        { fraction: 0.3, daysAgo: 0, description: 'DeFi yield harvest', incoming: true, recipientLabel: 'Yield Protocol' },
        { fraction: -0.1, daysAgo: 2, description: 'NFT marketplace purchase', incoming: false, recipientLabel: 'NFT Market' },
        { fraction: 0.2, daysAgo: 5, description: 'Bridge transfer', incoming: true, recipientLabel: 'Polygon Bridge' },
        { fraction: -0.15, daysAgo: 10, description: 'DEX liquidity provision', incoming: false },
        { fraction: 0.25, daysAgo: 20, description: 'Staking rewards', incoming: true, recipientLabel: 'Staking Pool' },
        { fraction: -0.12, daysAgo: 30, description: 'GameFi item purchase', incoming: false },
        { fraction: 0.3, daysAgo: 45, description: 'DAO compensation', incoming: true, recipientLabel: 'Treasury DAO' },
        { fraction: -0.2, daysAgo: 60, description: 'Lending deposit', incoming: false, recipientLabel: 'Lending Protocol' },
    ];

    const existingSum = txDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const remainingFraction = 1 - existingSum;

    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: remainingFraction,
            daysAgo: remainingFraction > 0 ? 90 : 100,
            description: remainingFraction > 0 ? 'Initial bridge deposit' : 'Protocol investment',
            incoming: remainingFraction > 0,
            recipientLabel: remainingFraction > 0 ? 'Bridge Service' : 'DeFi Protocol',
        });
    }

    return transformUsdcTransaction(txDefinitions);
}

/**
 * Transform USDC transaction definitions into actual transactions
 */
function transformUsdcTransaction(txDefinitions: UsdcTransactionDefinition[]): UsdcTransaction[] {
    return txDefinitions.map((def, index) => {
        const value = Math.floor(usdcInitialBalance * Math.abs(def.fraction));
        const randomAddress = def.incoming ? getRandomPolygonAddress() : demoPolygonAddress;
        const recipientAddress = def.incoming ? demoPolygonAddress : getRandomPolygonAddress();

        if (def.recipientLabel) {
            const { setContact } = useUsdcContactsStore();
            setContact(def.incoming ? randomAddress : recipientAddress, def.recipientLabel);
        }

        return {
            token: Config.polygon.usdc.tokenContract,
            transactionHash: getRandomPolygonHash(),
            logIndex: index,
            sender: randomAddress,
            recipient: recipientAddress,
            value,
            state: UsdcTransactionState.CONFIRMED,
            blockHeight: 1000000 + index,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
        };
    });
}

/**
 * Insert fake USDC transactions into the store
 */
function insertFakeUsdcTransactions(txs = defineUsdcFakeTransactions()) {
    const { addTransactions } = useUsdcTransactionsStore();
    addTransactions(txs);
}

interface UsdtTransactionDefinition {
    fraction: number;
    daysAgo: number;
    description: string;
    recipientLabel?: string;
    incoming: boolean;
}

/**
 * Defines transaction definitions for demo USDT transactions
 */
function defineUsdtFakeTransactions(): UsdtTransaction[] {
    const txDefinitions: UsdtTransactionDefinition[] = [
        { fraction: 0.25, daysAgo: 0, description: 'Trading profit', incoming: true, recipientLabel: 'DEX Trading' },
        { fraction: -0.08, daysAgo: 3, description: 'Merchandise payment', incoming: false },
        { fraction: 0.15, daysAgo: 7, description: 'Freelance payment', incoming: true, recipientLabel: 'Client Pay' },
        { fraction: -0.12, daysAgo: 15, description: 'Service subscription', incoming: false, recipientLabel: 'Web3 Service' },
        { fraction: 0.3, daysAgo: 25, description: 'P2P exchange', incoming: true },
        { fraction: -0.18, daysAgo: 35, description: 'Platform fees', incoming: false },
        { fraction: 0.2, daysAgo: 50, description: 'Revenue share', incoming: true, recipientLabel: 'Revenue Pool' },
        { fraction: -0.15, daysAgo: 70, description: 'Marketing campaign', incoming: false, recipientLabel: 'Marketing DAO' },
    ];

    const existingSum = txDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const remainingFraction = 1 - existingSum;

    if (Math.abs(remainingFraction) > 0.001) {
        txDefinitions.push({
            fraction: remainingFraction,
            daysAgo: remainingFraction > 0 ? 85 : 95,
            description: remainingFraction > 0 ? 'Initial USDT deposit' : 'Portfolio rebalance',
            incoming: remainingFraction > 0,
            recipientLabel: remainingFraction > 0 ? 'Bridge Protocol' : 'Portfolio Manager',
        });
    }

    return transformUsdtTransaction(txDefinitions);
}

/**
 * Transform USDT transaction definitions into actual transactions
 */
function transformUsdtTransaction(txDefinitions: UsdtTransactionDefinition[]): UsdtTransaction[] {
    return txDefinitions.map((def, index) => {
        const value = Math.floor(usdtInitialBalance * Math.abs(def.fraction));
        const randomAddress = def.incoming ? getRandomPolygonAddress() : demoPolygonAddress;
        const recipientAddress = def.incoming ? demoPolygonAddress : getRandomPolygonAddress();

        if (def.recipientLabel) {
            const { setContact } = useUsdtContactsStore();
            setContact(def.incoming ? randomAddress : recipientAddress, def.recipientLabel);
        }

        return {
            token: Config.polygon.usdt_bridged.tokenContract,
            transactionHash: getRandomPolygonHash(),
            logIndex: index,
            sender: randomAddress,
            recipient: recipientAddress,
            value,
            state: UsdtTransactionState.CONFIRMED,
            blockHeight: 1000000 + index,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
        };
    });
}

/**
 * Insert fake USDT transactions into the store
 */
function insertFakeUsdtTransactions(txs = defineUsdtFakeTransactions()) {
    const { addTransactions } = useUsdtTransactionsStore();
    addTransactions(txs);
}

// #endregion

// #region Flows

/**
 * Observes the staking modal and prevents from validating the info and instead fakes the staking process.
 */
function replaceBuyNimFlow() {
    let observedTarget: HTMLDivElement | undefined;

    demoRouter.afterEach((to) => {
        if (to.path.startsWith('/')) {
            const targetSelector = '.sidebar .trade-actions';
            const checkForTradeActions = setInterval(() => {
                const target = document.querySelector(targetSelector) as HTMLDivElement;
                if (!target || target === observedTarget) return;
                observedTarget = target;

                target.innerHTML = '';

                const btn1 = document.createElement('button');
                btn1.className = 'nq-button-s inverse';
                btn1.style.flex = '1';
                btn1.addEventListener('click', () => {
                    demoRouter.push('/buy');
                });
                btn1.innerHTML = 'Buy';

                const btn2 = document.createElement('button');
                btn2.className = 'nq-button-s inverse';
                btn2.style.flex = '1';
                btn2.disabled = true;
                btn2.innerHTML = 'Sell';

                target.appendChild(btn1);
                target.appendChild(btn2);
            }, 500);

            // Clear interval when navigating away
            demoRouter.afterEach((nextTo) => {
                if (!nextTo.path.startsWith('/')) {
                    clearInterval(checkForTradeActions);
                    observedTarget = undefined;
                }
            });
        }
    });
}

/**
 * Observes the staking modal and prevents from validating the info and instead fakes the staking process.
 */
function replaceStakingFlow() {
    let lastProcessedButton: HTMLButtonElement;

    demoRouter.afterEach((to) => {
        if (to.path === '/staking') {
            const checkForStakeButton = setInterval(() => {
                const target = document.querySelector('.stake-graph-page .stake-button');
                if (!target || target === lastProcessedButton) return;

                // remove previous listeners by cloning the element and replacing the original
                const newElement = target.cloneNode(true) as HTMLButtonElement;
                target.parentNode!.replaceChild(newElement, target);
                newElement.removeAttribute('disabled');
                lastProcessedButton = newElement;

                newElement.addEventListener('click', async () => {
                    const { setStake } = useStakingStore();
                    const { activeValidator } = useStakingStore();
                    const amountInput = document.querySelector('.nq-input') as HTMLInputElement;
                    const amount = Number.parseFloat(amountInput.value.replaceAll(/[^\d]/g, '')) * 1e5;

                    const { address: validatorAddress } = activeValidator.value!;
                    demoRouter.push('/');
                    await new Promise<void>((resolve) => { window.setTimeout(resolve, 100); });
                    setStake({
                        activeBalance: 0,
                        inactiveBalance: amount,
                        address: demoNimAddress,
                        retiredBalance: 0,
                        validator: validatorAddress,
                    });
                    const stakeTx: Partial<NimTransaction> = {
                        value: amount,
                        recipient: validatorAddress,
                        sender: demoNimAddress,
                        timestamp: Date.now(),
                        data: { type: 'add-stake', raw: '', staker: demoNimAddress },
                    };
                    insertFakeNimTransactions([stakeTx]);
                });
            }, 500);

            // Clear interval when navigating away
            demoRouter.afterEach((nextTo) => {
                if (nextTo.path !== '/staking') {
                    clearInterval(checkForStakeButton);
                }
            });
        }
    });
}

/**
 * Returns the hex encoding of a UTF-8 string.
 */
function encodeTextToHex(text: string): string {
    const utf8Array = Utf8Tools.stringToUtf8ByteArray(text);
    return Array.from(utf8Array)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

// We pick a random but fixed time-of-day offset for each day.
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0);
const baseDateMs = baseDate.getTime();
const oneDayMs = 24 * 60 * 60 * 1000;

/**
 * Generates a past timestamp for a given number of days ago, adding a predictable random offset.
 */
function calculateDaysAgo(days: number): number {
    const x = Math.sin(days) * 10000;
    const fractionalPart = x - Math.floor(x);
    const randomPart = Math.floor(fractionalPart * oneDayMs);
    return baseDateMs - days * oneDayMs - randomPart;
}

/**
 * Flow type for our demo environment, e.g. buy, swap, stake.
 */
type DemoFlowType = 'buy' | 'swap' | 'stake';

/**
 * The expected message structure for flow-change events between frames.
 */
type DemoFlowMessage = { kind: 'FlowChange', data: DemoFlowType };

/**
 * Maps each flow type to a specific route path in our app.
 */
const demoRoutes: Record<DemoFlowType, string> = {
    buy: '/buy',
    swap: '/swap/NIM-BTC',
    stake: '/staking',
};

/**
 * CSS for the special demo elements, stored in a normal string (no backticks).
 */
const demoCSS = `
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

/**
 * Intercepts fetch request for swaps
 */
function interceptFetchRequest() {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
        if (typeof args[0] !== 'string') return originalFetch(...args);
        if (args[0].startsWith('/')) return originalFetch(...args);

        const url = new URL(args[0] as string);
        const isFastspotRequest = url.host === (new URL(Config.fastspot.apiEndpoint).host);
        const isLimitsRequest = url.pathname.includes('/limits');
        const isAssetsRequest = url.pathname.includes('/assets');
        const isSwapRequest = url.pathname.includes('/swaps');

        // return originalFetch(...args);
        if (!isFastspotRequest) {
            return originalFetch(...args);
        }

        console.log('[Demo] Intercepted fetch request:', url.pathname);

        if (isLimitsRequest) {
            const constants = {
                current: '9800',
                daily: '50000',
                dailyRemaining: '49000',
                monthly: '100000',
                monthlyRemaining: '98000',
                swap: '10000',
            } as const;

            const [assetOrLimit] = url.pathname.split('/').slice(-2) as [SwapAsset | 'limits', string];

            if (assetOrLimit === 'limits') {
                const limits: FastspotUserLimits = {
                    asset: ReferenceAsset.USD,
                    ...constants,
                };
                return new Response(JSON.stringify(limits));
            }

            const asset = assetOrLimit as SwapAsset;

            const { exchangeRates, currency } = useFiatStore();
            const rate: number = exchangeRates.value[asset.toLocaleLowerCase().split('_')[0]][currency.value]!;

            const json: FastspotLimits<SwapAsset> = {
                asset,
                referenceAsset: ReferenceAsset.USD,
                referenceCurrent: constants.current,
                referenceDaily: constants.daily,
                referenceDailyRemaining: constants.dailyRemaining,
                referenceMonthly: constants.monthly,
                referenceMonthlyRemaining: constants.monthlyRemaining,
                referenceSwap: `${10000}`,
                current: `${Number(constants.current) / rate}`,
                daily: `${Number(constants.daily) / rate}`,
                dailyRemaining: `${Number(constants.dailyRemaining) / rate}`,
                monthly: `${Number(constants.monthly) / rate}`,
                monthlyRemaining: `${Number(constants.monthlyRemaining) / rate}`,
                swap: `${Number(constants.swap) / rate}`,
            };

            return new Response(JSON.stringify(json));
        }

        if (isAssetsRequest) {
            // Return mock assets data with fees for all supported assets
            const json: FastspotAsset[] = [
                {
                    symbol: SwapAsset.BTC,
                    name: 'Bitcoin',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.BTC)}`,
                    limits: { minimum: '0.0001', maximum: '1' },
                },
                {
                    symbol: SwapAsset.NIM,
                    name: 'Nimiq',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.NIM)}`,
                    limits: { minimum: '1', maximum: '100000' },
                },
                {
                    symbol: SwapAsset.USDC_MATIC,
                    name: 'USDC (Polygon)',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.USDC_MATIC)}`,
                    limits: { minimum: '1', maximum: '100000' },
                },
                {
                    symbol: SwapAsset.USDT_MATIC,
                    name: 'USDT (Polygon)',
                    feePerUnit: `${getNetworkFeePerUnit(SwapAsset.USDT_MATIC)}`,
                    limits: { minimum: '1', maximum: '100000' },
                },
            ];

            return new Response(JSON.stringify(json));
        }

        if (isSwapRequest) {
            const swapId = url.pathname.split('/').slice(-1)[0];

            if (swapId === 'swaps') {
                const { patchAccount, activeAccountInfo } = useAccountStore();
                const newBtcAddress = demoBtcAddress + Math.random().toString(36).slice(2, 9);

                patchAccount(activeAccountInfo.value?.id, {
                    ...activeAccountInfo,
                    btcAddresses: {
                        external: [...(activeAccountInfo.value?.btcAddresses.external || []), newBtcAddress],
                        internal: [...(activeAccountInfo.value?.btcAddresses.internal || []), newBtcAddress],
                    },
                });

                const { addAddressInfos } = useBtcAddressStore();
                addAddressInfos([{
                    address: newBtcAddress,
                    txoCount: 0, // Total number of outputs received
                    utxos: [],
                }]);
            } else {
                listenForSwapChanges();

                console.log('[Demo] Swap request:', swapId);
                const swap = onGoingSwaps.get(swapId);
                if (!swap) {
                    return new Response(JSON.stringify({
                        error: 'Swap not found',
                        status: 404,
                    }), { status: 404 });
                }

                console.log('[Demo] Swap:', swap);
                const expirationTimestamp = Math.floor(Date.now() / 1000) + 3600;

                return new Response(JSON.stringify({
                    id: swapId,
                    status: SwapStatus.WAITING_FOR_CONFIRMATION,
                    expires: expirationTimestamp,
                    info: {
                        from: [
                            {
                                symbol: swap.fund.type,
                                amount: swap.fund.output.value / 1e8,
                                fundingNetworkFee: {
                                    total: '0.000037',
                                    perUnit: '0.000000240254',
                                    totalIsIncluded: true,
                                },
                                operatingNetworkFee: {
                                    total: '0',
                                    perUnit: '0.000000240254',
                                    totalIsIncluded: false,
                                },
                                finalizeNetworkFee: {
                                    total: '0.0000346',
                                    perUnit: '0.000000240254',
                                    totalIsIncluded: false,
                                },
                            },
                        ],
                        to: [
                            {
                                symbol: swap.redeem.type,
                                amount: swap.redeem.value / 1e5,
                                fundingNetworkFee: {
                                    total: '0',
                                    perUnit: '0',
                                    totalIsIncluded: false,
                                },
                                operatingNetworkFee: {
                                    total: '0',
                                    perUnit: '0',
                                    totalIsIncluded: false,
                                },
                                finalizeNetworkFee: {
                                    total: '0',
                                    perUnit: '0',
                                    totalIsIncluded: false,
                                },
                            },
                        ],
                        serviceFeePercentage: 0.0025,
                        direction: 'reverse',
                    },
                    hash: '946dc06baf94ee49a1bd026eff8eb4f30d34c9e162211667dbebd5a5282e6294',
                    contracts: [
                        {
                            asset: swap.fund.type,
                            refund: {
                                address: swap.fund.refundAddress,
                            },
                            recipient: {
                                address: swap.fund.refundAddress,
                            },
                            amount: swap.fund.output.value,
                            timeout: expirationTimestamp,
                            direction: 'send',
                            status: 'pending',
                            id: '2MzQo4ehDrSEsxX7RnysLL6VePD3tuNyx4M',
                            intermediary: {},
                        },
                        {
                            asset: swap.redeem.type,
                            refund: {
                                address: swap.redeem.recipient,
                            },
                            recipient: {
                                address: swap.redeem.recipient,
                            },
                            amount: swap.redeem.value,
                            timeout: expirationTimestamp,
                            direction: 'receive',
                            status: 'pending',
                            id: 'eff8a1a5-4f4e-3895-b95c-fd5a40c99001',
                            intermediary: {},
                        },
                    ],
                }));
            }
        }

        return originalFetch(...args);
    };
}

/**
 * Fee per unit helper function
 */
function getNetworkFeePerUnit(asset: string): number {
    switch (asset) {
        case SwapAsset.BTC:
            return Math.floor(Math.random() * 100) / 1e8; // 1 - 100 sats/vbyte
        case SwapAsset.NIM:
            return 0; // luna per byte
        case SwapAsset.USDC_MATIC:
        case SwapAsset.USDT_MATIC:
            return 1000000000; // 1 Gwei
        default:
            return 0;
    }
}

/**
 * Ensures the Send button in modals is always enabled in demo mode, regardless of network state.
 * This allows users to interact with the send functionality without waiting for network sync.
 */
function enableSellAndSwapModals(processedElements: WeakSet<Element>) {
    // Target the send modal and swap footer button
    const bottomButton = document.querySelector('.send-modal-footer .nq-button');
    if (!bottomButton || processedElements.has(bottomButton)) return;

    if (bottomButton.hasAttribute('disabled')) {
        bottomButton.removeAttribute('disabled');
        bottomButton.classList.remove('disabled');
        processedElements.add(bottomButton);

        // Also find and hide any sync message if shown
        const footer = document.querySelector('.send-modal-footer');
        if (footer) {
            const footerNotice = footer.querySelector('.footer-notice') as HTMLDivElement;
            if (footerNotice && footerNotice.textContent
                && (footerNotice.textContent.includes('Connecting to Bitcoin')
                    || footerNotice.textContent.includes('Syncing with Bitcoin'))) {
                footerNotice.style.display = 'none';
                processedElements.add(footerNotice);
            }
        }
    }
}

let swapInterval: NodeJS.Timeout | null = null;
function listenForSwapChanges() {
    if (swapInterval) return;
    swapInterval = setInterval(() => {
        // Check if there are any active swaps that need to be processed
        const swap = useSwapsStore().activeSwap.value;
        if (!swap) return;
        console.log('[Demo] Active swap:', { swap, state: swap.state });
        switch (swap.state) {
            case SwapState.AWAIT_INCOMING:
                console.log('[Demo] Swap is in AWAIT_INCOMING state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.CREATE_OUTGOING,
                });
                break;
            case SwapState.CREATE_OUTGOING:
                console.log('[Demo] Swap is in CREATE_OUTGOING state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.AWAIT_SECRET,
                });
                break;
            case SwapState.AWAIT_SECRET:
                console.log('[Demo] Swap is in AWAIT_SECRET state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.SETTLE_INCOMING,
                });
                break;
            case SwapState.SETTLE_INCOMING:
                console.log('[Demo] Swap is in SETTLE_INCOMING state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.COMPLETE,
                });
                completeSwap(swap);
                break;
            case SwapState.COMPLETE:
                console.log('[Demo] Swap is in COMPLETE state');
                if (swapInterval) clearInterval(swapInterval);
                swapInterval = null;
                break;
            default:
                console.log('[Demo] Swap is in unknown state');
                useSwapsStore().setActiveSwap({
                    ...swap,
                    state: SwapState.AWAIT_INCOMING,
                });
                break;
        }
    }, 1_800);
}

/**
 * Completes an active swap by creating transactions for both sides of the swap
 */
function completeSwap(activeSwap: any) {
    // Generate a unique hash for this swap to connect both sides
    const swapHash = `swap-${Math.random().toString(36).slice(2, 10)}`;

    // Add transactions for both sides of the swap
    const fromAsset = activeSwap.from.asset;
    const toAsset = activeSwap.to.asset;
    const fromAmount = activeSwap.from.amount;
    const toAmount = activeSwap.to.amount;

    const { setSwap } = useSwapsStore();
    const now = Date.now();
    const nowSecs = Math.floor(now / 1000);

    // Create outgoing transaction (from asset)
    switch (fromAsset) {
        case 'NIM': {
            // Create a unique transaction hash for the NIM transaction
            const nimTxHash = `nim-swap-${Math.random().toString(16).slice(2, 10)}`;

            // Create HTLC data that would be needed for a real swap
            const nimHtlcAddress = `NQ${Math.random().toString(36).slice(2, 34)}`;
            const btcAddress = `1${Math.random().toString(36).slice(2, 34)}`;

            // Register the swap with the Swaps store first
            setSwap(swapHash, {
                id: swapHash,
                in: {
                    asset: SwapAsset.NIM,
                    transactionHash: nimTxHash,
                    htlc: {
                        address: nimHtlcAddress,
                        refundAddress: demoNimAddress,
                        redeemAddress: btcAddress,
                        timeoutMs: now + 3600000,
                    },
                },
                out: {
                    asset: SwapAsset.BTC,
                    transactionHash: `btc-swap-${Math.random().toString(16).slice(2, 10)}`,
                    outputIndex: 0,
                    htlc: {
                        address: `1HTLC${Math.random().toString(36).slice(2, 30)}`,
                        script: 'btc-htlc-script',
                        refundAddress: btcAddress,
                        redeemAddress: demoBtcAddress,
                        timeoutTimestamp: nowSecs + 7200,
                    },
                },
            });

            // Create the NIM transaction with proper HTLC data
            const tx: Partial<NimTransaction> = {
                value: fromAmount,
                recipient: nimHtlcAddress,
                sender: demoNimAddress,
                timestamp: now,
                transactionHash: nimTxHash,
                data: {
                    type: 'htlc',
                    hashAlgorithm: 'sha256',
                    hashCount: 1,
                    hashRoot: swapHash,
                    raw: encodeTextToHex(`Swap ${fromAsset}-${toAsset}`),
                    recipient: nimHtlcAddress,
                    sender: demoNimAddress,
                    timeout: nowSecs + 3600,
                },
            };

            insertFakeNimTransactions(transformNimTransaction([tx]));
            updateNimBalance(-fromAmount);
            break;
        }
        case 'BTC': {
            // Create a unique transaction hash for the BTC transaction
            const btcTxHash = `btc-swap-${Math.random().toString(16).slice(2, 10)}`;

            // Create HTLC data structures
            const btcHtlcAddress = `1HTLC${Math.random().toString(36).slice(2, 30)}`;
            const nimAddress = `NQ${Math.random().toString(36).slice(2, 34)}`;

            // Register the swap with the Swaps store
            setSwap(swapHash, {
                id: swapHash,
                in: {
                    asset: SwapAsset.BTC,
                    transactionHash: btcTxHash,
                    outputIndex: 0,
                    htlc: {
                        address: btcHtlcAddress,
                        script: 'btc-htlc-script',
                        refundAddress: demoBtcAddress,
                        redeemAddress: nimAddress,
                        timeoutTimestamp: nowSecs + 7200,
                    },
                },
                out: {
                    asset: SwapAsset.NIM,
                    transactionHash: `nim-swap-${Math.random().toString(16).slice(2, 10)}`,
                    htlc: {
                        address: nimAddress,
                        refundAddress: nimAddress,
                        redeemAddress: demoNimAddress,
                        timeoutMs: now + 3600000,
                    },
                },
            });

            // Create the BTC transaction definition
            const tx: BtcTransactionDefinition = {
                address: btcHtlcAddress,
                daysAgo: 0,
                description: `Swap ${fromAsset} to ${toAsset}`,
                fraction: fromAmount / btcInitialBalance,
                incoming: false,
                recipientLabel: 'Bitcoin HTLC',
            };

            insertFakeBtcTransactions(transformBtcTransaction([tx]));
            updateBtcBalance(-fromAmount);
            break;
        }
        default: {
            console.warn(`Unsupported asset type for swap: ${fromAsset}`);
        }
    }

    // Create incoming transaction (to asset)
    switch (toAsset) {
        case 'NIM': {
            // Create a unique transaction hash for the NIM settlement transaction
            const nimSettlementTxHash = `nim-settle-${Math.random().toString(16).slice(2, 10)}`;

            // Get the existing swap data to ensure we're using the same addresses
            const existingSwap = useSwapsStore().getSwap.value(swapHash);
            if (!existingSwap || !existingSwap.out || existingSwap.out.asset !== SwapAsset.NIM) {
                console.error('[Demo] Existing swap not found or incorrect structure');
                return;
            }

            // Update the swap to include the settlement transaction hash
            setSwap(swapHash, {
                ...existingSwap,
                out: {
                    ...existingSwap.out,
                    transactionHash: nimSettlementTxHash,
                },
            });

            // Create the NIM settlement transaction
            const tx: Partial<NimTransaction> = {
                value: toAmount,
                recipient: demoNimAddress,
                sender: existingSwap.out.htlc?.address || 'HTLC-ADDRESS',
                timestamp: now + 1000, // Slightly after the funding tx
                transactionHash: nimSettlementTxHash,
                data: {
                    type: 'htlc',
                    hashAlgorithm: 'sha256',
                    hashCount: 1,
                    hashRoot: swapHash,
                    raw: encodeTextToHex(`Swap ${fromAsset}-${toAsset}`),
                    recipient: demoNimAddress,
                    sender: existingSwap.out.htlc?.address || 'HTLC-ADDRESS',
                    timeout: nowSecs + 3600,
                },
            };

            insertFakeNimTransactions(transformNimTransaction([tx]));
            updateNimBalance(toAmount);
            break;
        }
        case 'BTC': {
            // Create a unique transaction hash for the BTC settlement transaction
            const btcSettlementTxHash = `btc-settle-${Math.random().toString(16).slice(2, 10)}`;

            // Get the existing swap data
            const existingSwap = useSwapsStore().getSwap.value(swapHash);
            if (!existingSwap || !existingSwap.out || existingSwap.out.asset !== SwapAsset.BTC) {
                console.error('[Demo] Existing swap not found or incorrect structure');
                return;
            }

            // Update the swap to include the settlement transaction hash
            setSwap(swapHash, {
                ...existingSwap,
                out: {
                    ...existingSwap.out,
                    transactionHash: btcSettlementTxHash,
                },
            });

            // Create the BTC settlement transaction
            const tx: BtcTransactionDefinition = {
                address: demoBtcAddress,
                daysAgo: 0,
                description: `Swap ${fromAsset} to ${toAsset}`,
                fraction: toAmount / btcInitialBalance,
                incoming: true,
                recipientLabel: 'BTC Settlement',
            };

            insertFakeBtcTransactions(transformBtcTransaction([tx]));
            updateBtcBalance(toAmount);
            break;
        }
        default: {
            console.warn(`Unsupported asset type for swap: ${toAsset}`);
        }
    }

    console.log('[Demo] Swap completed:', { swapHash, fromAsset, toAsset, fromAmount, toAmount });
}

const ignoreHubRequests = [
    'addBtcAddresses',
    'on',
];

interface SetupSwapArgs {
    accountId: string;
    swapId: string;
    fund: {
        type: 'BTC' | 'NIM' /* | 'USDC' | 'USDT' */,
        inputs: {
            address: string,
            transactionHash: string,
            outputIndex: number,
            outputScript: string,
            value: number,
        }[],
        output: {
            value: number,
        },
        changeOutput: {
            address: string,
            value: number,
        },
        refundAddress: string,
    };
    redeem: {
        type: 'BTC' | 'NIM' /* | 'USDC' | 'USDT' */,
        recipient: string,
        value: number,
        fee: number,
        validityStartHeight: number,
    };
    fundingFiatRate: number;
    redeemingFiatRate: number;
    fundFees: {
        processing: number,
        redeeming: number,
    };
    redeemFees: {
        funding: number,
        processing: number,
    };
    serviceSwapFee: number;
    nimiqAddresses: {
        address: string,
        balance: number,
    }[];
    polygonAddresses: {
        address: string,
        usdcBalance: number,
        usdtBalance: number,
    }[];
}

/**
 * Replacement of the Hub API class to capture and redirect calls to our demo modals instead.
 */
export class DemoHubApi extends HubApi {
    static create(): DemoHubApi {
        const instance = new DemoHubApi();
        return new Proxy(instance, {
            get(target, prop: keyof HubApi) {
                if (typeof target[prop] !== 'function') {
                    return target[prop];
                }

                return async (...args: Parameters<HubApi[typeof prop]>) => new Promise(async (resolveInterceptedAction) => {
                    const requestName = String(prop);
                    const [firstArg] = args;
                    console.warn(`[Demo] Mocking Hub call: ${requestName}("${firstArg}")`);

                    if (ignoreHubRequests.includes(requestName)) {
                        return;
                    }

                    if (requestName === 'setupSwap') {
                        const swap = await firstArg as SetupSwapArgs;
                        const signerTransaction: SetupSwapResult = {
                            nim: {
                                transaction: new Uint8Array(),
                                serializedTx: '0172720036a3b2ca9e0de8b369e6381753ebef945a020091fa7bbddf959616767c50c50962c9e056ade9c400000000000000989680000000000000000000c3e23d0500a60100010366687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f292520000000000000000000000000000000000000000000000000000000000000000000200demoSerializedTx',
                                hash: '6c58b337a907fe000demoTxHash8a1f4ab4fdc0f69b1e582f',
                                raw: {
                                    signerPublicKey: new Uint8Array(),
                                    signature: new Uint8Array(),
                                    sender: 'NQ86 D3M0 SW4P NB59 U3F8 NDLX CE0P AFMX Y52S',
                                    senderType: 2,
                                    recipient: swap.redeem.recipient,
                                    recipientType: 0,
                                    value: swap.redeem.value,
                                    fee: 0,
                                    validityStartHeight: swap.redeem.validityStartHeight,
                                    extraData: new Uint8Array(),
                                    flags: 0,
                                    networkId: 5,
                                    proof: new Uint8Array(),
                                },
                            },
                            btc: {
                                serializedTx: '0200000000010168c8952af998f2c68412a848a72d1f9b0b7ff27417df1cb85514c97474b51ba40000000000ffffffff026515000000000000220020bf0ffdd2ffb9a579973455cfe9b56515538b79361d5ae8a4d255dea2519ef77864c501000000000016001428257447efe2d254ce850ea2760274d233d86e5c024730440220792fa932d9d0591e3c5eb03f47d05912a1e21f3e76d169e383af66e47896ac8c02205947df5523490e4138f2da0fc5c9da3039750fe43bd217b68d26730fdcae7fbe012102ef8d4b51d1a075e67d62baa78991d5fc36a658fec28d8b978826058168ed2a1a00000000',
                                hash: '3090808993a796c26a614f5a4a36a48e0b4af6cd3e28e39f3f006e9a447da2b3',
                            },
                            refundTx: '02000000000101b3a27d449a6e003f9fe3283ecdf64a0b8ea4364a5a4f616ac296a793898090300000000000feffffff011e020000000000001600146d2146bb49f6d1de6b4f14e0a8074c79b887cef50447304402202a7dce2e39cf86ee1d7c1e9cc55f1e0fb26932fd22e5437e5e5804a9e5d220b1022031aa177ea085c10c4d54b2f5aa528aac0013b67f9ee674070aa2fb51894de80e0121025b4d40682bbcb5456a9d658971b725666a3cccaa2fb45d269d2f1486bf85b3c000636382012088a820be8719b9427f1551c4234f8b02d8f8aa055ae282b2e9eef6c155326ae951061f8876a914e546b01d8c9d9bf35f9f115132ce8eab7191a68d88ac67046716ca67b17576a9146d2146bb49f6d1de6b4f14e0a8074c79b887cef588ac686816ca67',
                        };

                        // Add to onGoingSwaps map
                        onGoingSwaps.set(swap.swapId, swap);

                        resolveInterceptedAction(signerTransaction);
                        return;
                    }

                    // Wait for router readiness
                    await new Promise<void>((resolve) => {
                        demoRouter.onReady(resolve);
                    });

                    console.log('[Demo] Redirecting to fallback modal');
                    demoRouter.push(`/${DemoModal.Fallback}`);
                });
            },
        });
    }
}

/**
 * Obfuscates addresses in the UI by:
 * - Showing only first 3 chunks of addresses (rest are XXXX) for NIM addresses
 * - Showing only the first few characters for BTC and polygon addresses
 * - Changing the copy tooltip message
 * - Changing the copy functionality to provide a demo disclaimer
 */
function obfuscateAddresses(processedElements: WeakSet<HTMLElement>) {
    // Adds the common clipboard click handler to an element.
    function addDemoClickHandler(el: HTMLElement) {
        el.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.add('copied');
            setTimeout(() => el.classList.remove('copied'), 1500);
            navigator.clipboard.writeText('This is a demo address - not for actual use');
        }, true);
    }

    // Updates the tooltip for an element.
    function updateTooltip(el: HTMLElement) {
        const tooltip = el.querySelector('.tooltip') as HTMLElement;
        if (tooltip && !processedElements.has(tooltip)) {
            processedElements.add(tooltip);
            tooltip.textContent = 'Demo address';
            tooltip.classList.add('demo-tooltip');
            addDemoClickHandler(tooltip);
        }
    }

    // Processes an element: marks it as processed, applies any extra changes, updates tooltip, and adds a click handler.
    function processElement(el: HTMLElement, extraProcess: ((el: HTMLElement) => void) | null = null) {
        if (processedElements.has(el)) return;
        processedElements.add(el);
        if (extraProcess) extraProcess(el);
        updateTooltip(el);
        addDemoClickHandler(el);
    }

    // Process NIM address displays: obfuscate address chunks beyond the first three.
    const nimAddressElements = document.querySelectorAll('.copyable.address-display') as NodeListOf<HTMLElement>;
    nimAddressElements.forEach((el) =>
        processElement(el, (element) => {
            const chunks = element.querySelectorAll('.chunk');
            for (let i = 3; i < chunks.length; i++) {
                const chunk = chunks[i];
                const space = chunk.querySelector('.space');
                chunk.textContent = 'XXXX';
                if (space) chunk.appendChild(space);
            }
        }),
    );

    // Process short address displays: change the last chunk of the short address.
    const shortAddressElements = document.querySelectorAll('.tooltip.interactive-short-address.is-copyable') as NodeListOf<HTMLElement>;
    shortAddressElements.forEach((el) =>
        processElement(el, (element) => {
            const lastChunk = element.querySelector('.short-address .address:last-child');
            if (lastChunk) {
                lastChunk.textContent = 'xxxx';
            }
        }),
    );

    // Process tooltip boxes inside short address displays.
    const tooltipBoxElements = document.querySelectorAll('.tooltip.interactive-short-address.is-copyable .tooltip-box') as NodeListOf<HTMLElement>;
    tooltipBoxElements.forEach((el) => {
        if (processedElements.has(el)) return;
        processedElements.add(el);
        el.textContent = 'Demo address';
        el.classList.add('demo-tooltip');
        addDemoClickHandler(el);
    });
}

/**
 * Observes the receive modal and redirects relevant button clicks to the fallback modal
 */
function observeReceiveModal(processedElements: WeakSet<Element>) {
    // Find the receive modal
    const receiveModal = document.querySelector('.receive-modal');
    if (!receiveModal) return;
    
    // Look for buttons that should redirect to the fallback modal
    const buttons = receiveModal.querySelectorAll('.nq-button-s, .qr-button');
    
    buttons.forEach(button => {
        // Skip if we've already processed this button
        if (processedElements.has(button)) return;
        
        // Mark as processed to avoid adding multiple listeners
        processedElements.add(button);
        
        // Replace the original click handler with our redirect
        button.addEventListener('click', (event) => {
            // Prevent the default action and stop propagation
            event.preventDefault();
            event.stopPropagation();
            
            // Redirect to the fallback modal
            demoRouter.replace({
                path: `/${DemoModal.Fallback}`,
                query: { [DEMO_PARAM]: '' },
            });
            
            console.log('[Demo] Redirected receive modal button click to fallback modal');
        }, true); // Use capture to intercept the event before other handlers
    });
}

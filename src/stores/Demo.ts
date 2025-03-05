/* eslint-disable max-len */
import { createStore } from 'pinia';
import VueRouter from 'vue-router';
import { TransactionState as ElectrumTransactionState } from '@nimiq/electrum-client';
import { CryptoCurrency, Utf8Tools } from '@nimiq/utils';
import { KeyPair, PlainTransactionDetails, PrivateKey } from '@nimiq/core';
import { STAKING_CONTRACT_ADDRESS } from '@/lib/Constants';
import { AccountType, useAccountStore } from '@/stores/Account';
import { AddressType, useAddressStore } from '@/stores/Address';
import { toSecs, useTransactionsStore } from '@/stores/Transactions';
import { useBtcTransactionsStore } from '@/stores/BtcTransactions';
import { useUsdtTransactionsStore, TransactionState as UsdtTransactionState } from '@/stores/UsdtTransactions';
import { useUsdcTransactionsStore, TransactionState as UsdcTransactionState } from '@/stores/UsdcTransactions';
import { useStakingStore } from '@/stores/Staking';
import { useAccountSettingsStore } from '@/stores/AccountSettings';
import { usePolygonAddressStore } from '@/stores/PolygonAddress';
import Config from 'config';
import { AssetList, FastspotAsset, FastspotEstimate, FastspotFee, FastspotLimits, FastspotUserLimits, ReferenceAsset, SwapAsset } from '@nimiq/fastspot-api';
import { useBtcAddressStore } from './BtcAddress';
import { useContactsStore } from './Contacts';
import { useBtcLabelsStore } from './BtcLabels';
import { useUsdcContactsStore } from './UsdcContacts';
import { useUsdtContactsStore } from './UsdtContacts';
import { useFiatStore } from './Fiat';
import HubApi from '@nimiq/hub-api';

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
const nimInitialBalance = 14041800000; // 14,041,800,000 - 14 april, 2018
const usdtInitialBalance = 5000000000; // 5000 USDT (6 decimals)
const usdcInitialBalance = 3000000000; // 3000 USDC (6 decimals)

// We keep a reference to the router here.
let demoRouter: VueRouter;

/**
 * Main store for the demo environment.
 */
export const useDemoStore = createStore({
    id: 'demo-store',
    state: (): DemoState => ({
        active: checkIfDemoIsActive(),
    }),
    getters: {
        isDemoEnabled: (state) => state.active,
    },
    actions: {
        /**
         * Initializes the demo environment and sets up various routes, data, and watchers.
         */
        async initialize(router: VueRouter) {
            // eslint-disable-next-line no-console
            console.warn('[Demo] Initializing demo environment...');

            demoRouter = router;

            insertCustomDemoStyles();
            rewriteDemoRoutes();
            setupVisualCues();
            addDemoModalRoutes();
            interceptFetchRequest();

            setupDemoAddresses();
            setupDemoAccount();

            generateFakeNimTransactions();

            const { addTransactions: addBtcTransactions } = useBtcTransactionsStore();
            addBtcTransactions(generateFakeBtcTransactions());

            attachIframeListeners();
            replaceStakingFlow();
            replaceBuyNimFlow();
            enableSendModalInDemoMode();
        },

        /**
         * Adds a pretend buy transaction to show a deposit coming in.
        */
        async buyDemoNim(amount: number) {
            const { addTransactions } = useTransactionsStore();
            addTransactions([
                createFakeTransaction({
                    value: amount,
                    recipient: demoNimAddress,
                    sender: buyFromAddress,
                    data: {
                        type: 'raw',
                        raw: encodeTextToHex('Online Purchase'),
                    },
                }),
            ]);
        },
    },
});

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
        // Redirect certain known paths to the Buy demo modal
        if (to.path === '/simplex' || to.path === '/moonpay') {
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
 * Observes the home view to attach a highlight to some buttons for demonstration purposes.
 */
function setupVisualCues() {
    const highlightTargets = [
        ['.sidebar .trade-actions button', { top: '-18px', right: '-4px' }],
        ['.sidebar .swap-tooltip button', { top: '-18px', right: '-8px' }],
        ['.actions .staking-button', { top: '-2px', right: '-2px' }],
    ] as const;

    const mutationObserver = new MutationObserver(() => {
        if (window.location.pathname !== '/') return;

        highlightTargets.forEach(([selector, position]) => {
            const target = document.querySelector(selector);
            if (!target || target.querySelector('.demo-highlight-badge')) return;

            const wrapper = document.createElement('div');
            wrapper.classList.add('demo-highlight-badge');
            wrapper.style.top = position.top;
            wrapper.style.right = position.right;
            const circle = document.createElement('div');

            wrapper.appendChild(circle);
            target.appendChild(wrapper);
        });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
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

    // Setup polygon token transactions
    generateFakePolygonTransactions();
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

/**
 * Generates fake NIM transactions spanning the last ~4 years.
 * They net to the global nimInitialBalance.
 * We use a helper function to calculate each transaction value so it doesn't end in 0.
 */
function generateFakeNimTransactions() {
    // We'll define total fractions so the net sum is 1.
    const txDefinitions = [
        { fraction: -0.14, daysAgo: 1442, description: 'New Designer Backpack for Hiking Trip' },
        { fraction: -0.05, daysAgo: 1390, description: 'Streaming Subscription - Watch Anything Anytime', recipientLabel: 'Stream & Chill Co.' },
        { fraction: 0.1, daysAgo: 1370, description: 'Sold Vintage Camera to Photography Enthusiast', recipientLabel: 'Retro Photo Guy' },
        { fraction: -0.2, daysAgo: 1240, description: 'Groceries at Farmers Market' },
        { fraction: 0.2, daysAgo: 1185, description: 'Birthday Gift from Uncle Bob', recipientLabel: 'Uncle Bob 🎁' },
        { fraction: 0.3, daysAgo: 1120, description: 'Website Design Freelance Project', recipientLabel: 'Digital Nomad Inc.' },
        { fraction: 0.02, daysAgo: 980, description: 'Lunch Money Payback from Alex' },
        { fraction: 0.07, daysAgo: 940, description: 'Community Raffle Prize' },
        { fraction: -0.15, daysAgo: 875, description: 'Car Repair at Thunder Road Garage', recipientLabel: 'FixMyCar Workshop' },
        { fraction: -0.3, daysAgo: 780, description: 'Quarterly Apartment Rent', recipientLabel: 'Skyview Properties' },
        { fraction: -0.1, daysAgo: 720, description: 'Anniversary Dinner at Skyline Restaurant' },
        { fraction: -0.02, daysAgo: 650, description: 'Digital Book: "Blockchain for Beginners"' },
        { fraction: -0.03, daysAgo: 580, description: 'Music Festival Weekend Pass' },
        { fraction: 0.05, daysAgo: 540, description: 'Refund for Cancelled Flight' },
        { fraction: 0.5, daysAgo: 470, description: 'Software Development Project Payment', recipientLabel: 'Tech Solutions Ltd' },
        { fraction: 0.02, daysAgo: 390, description: 'Coffee Shop Reward Program Refund' },
        { fraction: -0.11, daysAgo: 320, description: 'Custom Tailored Suit Purchase' },
        { fraction: 0.06, daysAgo: 270, description: 'Website Testing Gig Payment' },
        { fraction: -0.08, daysAgo: 210, description: 'Electric Scooter Rental for Month' },
        { fraction: -0.12, daysAgo: 180, description: 'Online Course: "Advanced Crypto Trading"' },
        { fraction: 0.05, daysAgo: 120, description: 'Sold Digital Artwork', recipientLabel: 'NFT Collector' },
        { fraction: -0.1, daysAgo: 90, description: 'Quarterly Utility Bills', recipientLabel: 'City Power & Water' },
        { fraction: -0.1, daysAgo: 45, description: 'Winter Wardrobe Shopping' },
    ];

    // Calculate sum of existing transactions to ensure they add up to exactly 1
    const existingSum = txDefinitions.reduce((sum, def) => sum + def.fraction, 0);
    const remainingFraction = 1 - existingSum;

    // Add the final balancing transaction with appropriate description
    if (Math.abs(remainingFraction) > 0.001) { // Only add if there's a meaningful amount to balance
        txDefinitions.push({
            fraction: remainingFraction,
            daysAgo: 14,
            description: remainingFraction > 0
                ? 'Blockchain Hackathon Prize!'
                : 'Annual Software Subscription Renewal',
            recipientLabel: remainingFraction > 0 ? 'Crypto Innovation Fund' : undefined,
        });
    }

    const { addTransactions } = useTransactionsStore();
    const { setContact } = useContactsStore();

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
        addTransactions([createFakeTransaction(tx)]);

        // Add contact if a recipientLabel is provided
        if (def.recipientLabel && def.fraction < 0) {
            setContact(address, def.recipientLabel);
        }
    }
}

/**
 * Generates fake Bitcoin transactions spanning 5.5 years
 */
function generateFakeBtcTransactions() {
    // Define transaction history with a similar structure to other currencies
    const txDefinitions = [
        {
            daysAgo: 2000,
            value: 20000000, // 0.2 BTC
            incoming: true,
            description: 'Initial BTC purchase from exchange',
            address: '1Kj4SNWFCxqvtP8nkJxeBwkXxgY9LW9rGg',
            label: 'Satoshi Exchange',
        },
        {
            daysAgo: 1600,
            value: 15000000, // 0.15 BTC
            incoming: true,
            description: 'Mining pool payout',
            address: '1Hz7vQrRjnu3z9k7gxDYhKjEmABqChDvJr',
            label: 'Genesis Mining Pool',
        },
        {
            daysAgo: 1200,
            value: 19000000, // 0.19 BTC
            incoming: false,
            description: 'Purchase from online marketplace',
            address: '1LxKe5kKdgGVwXukEgqFxh6DrCXF2Pturc',
            label: 'Digital Bazaar Shop',
        },
        {
            daysAgo: 800,
            value: 30000000, // 0.3 BTC
            incoming: true,
            description: 'Company payment for consulting',
            address: '1N7aecJuKGDXzYK8CgpnNRYxdhZvXPxp3B',
            label: 'Corporate Treasury',
        },
        {
            daysAgo: 365,
            value: 15000000, // 0.15 BTC
            incoming: false,
            description: 'Auto-DCA investment program',
            address: '12vxjmKJkfL9s5JwqUzEVVJGvKYJgALbsz',
        },
        {
            daysAgo: 180,
            value: 7500000, // 0.075 BTC
            incoming: true,
            description: 'P2P sale of digital goods',
            address: '1MZYS9nvVmFvSK7em5zzAsnvRq82RUcypS',
        },
        {
            daysAgo: 60,
            value: 5000000, // 0.05 BTC
            incoming: true,
            description: 'Recent purchase from exchange',
            address: '1Kj4SNWFCxqvtP8nkJxeBwkXxgY9LW9rGg',
        },
    ];

    const { setSenderLabel } = useBtcLabelsStore();

    // Convert to BTC transaction format with inputs/outputs
    const transactions = [];
    const knownUtxos = new Map();
    let txCounter = 1;

    for (const def of txDefinitions) {
        // Create a transaction hash for this transaction
        const txHash = `btc-tx-${txCounter++}`;

        // Only add labels to select transactions to make the history look realistic
        if (def.label) {
            setSenderLabel(def.address, def.label);
        }

        const tx = {
            isCoinbase: false,
            inputs: [
                {
                    address: def.incoming ? def.address : demoBtcAddress,
                    outputIndex: 0,
                    index: 0,
                    script: 'abcd',
                    sequence: 4294967295,
                    transactionHash: def.incoming ? txHash : getUTXOToSpend(knownUtxos)?.txHash || txHash,
                    witness: ['abcd'],
                },
            ],
            outputs: def.incoming
                ? [
                    {
                        value: def.value,
                        address: demoBtcAddress,
                        script: 'abcd',
                        index: 0,
                    },
                ]
                : [
                    {
                        value: def.value,
                        address: def.address,
                        script: 'abcd',
                        index: 0,
                    },
                    { // Change output
                        value: 900000,
                        address: demoBtcAddress,
                        script: 'abcd',
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

        // Update UTXOs for this transaction
        updateUTXOs(knownUtxos, tx);

        transactions.push(tx);
    }

    // Set up the address with current UTXOs
    const { addAddressInfos } = useBtcAddressStore();
    addAddressInfos([{
        address: demoBtcAddress,
        txoCount: transactions.length + 2, // Total number of outputs received
        utxos: Array.from(knownUtxos.values()),
    }]);

    return transactions;
}

/**
 * Tracks UTXO changes for BTC transactions
 */
function updateUTXOs(knownUtxos: Map<string, any>, tx: any) {
    // Remove spent inputs
    for (const input of tx.inputs) {
        if (input.address === demoBtcAddress) {
            const utxoKey = `${input.transactionHash}:${input.outputIndex}`;
            knownUtxos.delete(utxoKey);
        }
    }

    // Add new outputs for our address
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
 * Helper to get a UTXO to spend
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
 * Generates fake transactions for both USDC and USDT on Polygon
 */
function generateFakePolygonTransactions() {
    // Generate USDC transactions
    const usdcTxDefinitions = [
        { fraction: 0.3, daysAgo: 910, incoming: true, label: 'Yield Farming Protocol' },
        { fraction: -0.05, daysAgo: 840 },
        { fraction: 0.2, daysAgo: 730, incoming: true, label: 'Virtual Worlds Inc.' },
        { fraction: -0.1, daysAgo: 650 },
        { fraction: 0.4, daysAgo: 480, incoming: true, label: 'Innovation DAO' },
        { fraction: -0.15, daysAgo: 360, label: 'MetaGames Marketplace' },
        { fraction: 0.15, daysAgo: 180, incoming: true },
        { fraction: -0.08, daysAgo: 90 },
    ];

    // Calculate sum of existing transactions and add balancing transaction
    const usdcExistingSum = usdcTxDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const usdcRemainingFraction = 1 - usdcExistingSum;

    // Add balancing transaction
    if (Math.abs(usdcRemainingFraction) > 0.001) {
        usdcTxDefinitions.push({
            fraction: usdcRemainingFraction,
            daysAgo: 30,
            incoming: usdcRemainingFraction > 0,
            label: usdcRemainingFraction > 0 ? 'CryptoCreators Guild' : 'Annual Platform Subscription',
        });
    }

    // Generate USDT transactions
    const usdtTxDefinitions = [
        { fraction: 0.4, daysAgo: 360, incoming: true, label: 'LaunchPad Exchange' },
        { fraction: -0.1, daysAgo: 320 },
        { fraction: 0.2, daysAgo: 280, incoming: true, label: 'Crypto Consultants LLC' },
        { fraction: -0.15, daysAgo: 210 },
        { fraction: 0.3, daysAgo: 150, incoming: true },
        { fraction: -0.05, daysAgo: 90 },
        { fraction: 0.1, daysAgo: 45, incoming: true, label: 'Chain Testers' },
        { fraction: -0.12, daysAgo: 20 },
    ];

    // Calculate sum of existing transactions and add balancing transaction
    const usdtExistingSum = usdtTxDefinitions.reduce((sum, def) =>
        sum + (def.incoming ? Math.abs(def.fraction) : -Math.abs(def.fraction)), 0);
    const usdtRemainingFraction = 1 - usdtExistingSum;

    // Add balancing transaction
    if (Math.abs(usdtRemainingFraction) > 0.001) {
        usdtTxDefinitions.push({
            fraction: usdtRemainingFraction,
            daysAgo: 7,
            incoming: usdtRemainingFraction > 0,
            label: usdtRemainingFraction > 0 ? 'Protocol Testing Reward' : 'Annual Service Renewal',
        });
    }

    // Generate and add USDC transactions
    const { addTransactions: addUsdcTxs } = useUsdcTransactionsStore();
    addUsdcTxs(generateTokenTransactions(usdcTxDefinitions, usdcInitialBalance, Config.polygon.usdc.tokenContract, UsdcTransactionState.CONFIRMED, useUsdcContactsStore));

    // Generate and add USDT transactions
    const { addTransactions: addUsdtTxs } = useUsdtTransactionsStore();
    addUsdtTxs(generateTokenTransactions(usdtTxDefinitions, usdtInitialBalance, Config.polygon.usdt_bridged.tokenContract, UsdtTransactionState.CONFIRMED, useUsdtContactsStore));
}

/**
 * Shared function to generate token transactions for Polygon tokens
 */
function generateTokenTransactions(txDefinitions: any, initialBalance: number, tokenContract: string, confirmState: any, contactsStore: any) {
    const transactions = [];
    const { setContact } = contactsStore();

    for (const def of txDefinitions) {
        const value = Math.floor(initialBalance * Math.abs(def.fraction));
        const randomAddress = `0x${Math.random().toString(16).slice(2, 42)}`;
        const sender = def.incoming ? randomAddress : demoPolygonAddress;
        const recipient = def.incoming ? demoPolygonAddress : randomAddress;

        // Add contacts for select transactions (only if label is provided)
        if (def.label) {
            const addressToLabel = def.incoming ? randomAddress : randomAddress;
            setContact(addressToLabel, def.label);
        }

        transactions.push({
            token: tokenContract,
            transactionHash: `token-tx-${Math.random().toString(36).substr(2, 9)}`,
            logIndex: transactions.length,
            sender,
            recipient,
            value,
            state: confirmState,
            blockHeight: 1000000 + transactions.length,
            timestamp: toSecs(calculateDaysAgo(def.daysAgo)),
        });
    }

    return transactions;
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

/**
 * Observes the staking modal and prevents from validating the info and instead fakes the staking process.
 */
function replaceBuyNimFlow() {
    const targetSelector = '.sidebar .trade-actions';
    let observing = false;
    const observer = new MutationObserver(() => {
        if (observing) return;

        const target = document.querySelector(targetSelector);
        if (!target) return;
        observing = true;

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
    });

    demoRouter.afterEach((to) => {
        if (to.path.startsWith('/')) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            observing = false;
            observer.disconnect();
        }
    });
}

/**
 * Observes the staking modal and prevents from validating the info and instead fakes the staking process.
 */
function replaceStakingFlow() {
    const targetSelector = '.stake-graph-page .stake-button';
    let observing = false;
    const observer = new MutationObserver(() => {
        if (observing) return;

        const target = document.querySelector(targetSelector);
        if (!target) return;

        // remove previous listeners by cloning the element and replacing the original
        const newElement = target.cloneNode(true) as HTMLButtonElement;
        target.parentNode!.replaceChild(newElement, target);
        newElement.removeAttribute('disabled');
        observing = true;

        newElement.addEventListener('click', async () => {
            const { setStake } = useStakingStore();
            const { activeValidator } = useStakingStore();
            const amountInput = document.querySelector('.nq-input') as HTMLInputElement;
            const amount = Number.parseFloat(amountInput.value.replaceAll(' ', '')) * 1e5;

            const { address: validatorAddress } = activeValidator.value!;
            demoRouter.push('/');
            await new Promise<void>((resolve) => { window.setTimeout(resolve, 100); });
            setStake({
                activeBalance: amount,
                inactiveBalance: nimInitialBalance - amount,
                address: demoNimAddress,
                retiredBalance: 0,
                validator: validatorAddress,
            });
            const { addTransactions } = useTransactionsStore();
            addTransactions([
                createFakeTransaction({
                    value: amount,
                    recipient: STAKING_CONTRACT_ADDRESS,
                    sender: demoNimAddress,
                    data: {
                        type: 'add-stake',
                        raw: '',
                        staker: demoNimAddress,
                    },
                }),
            ]);
        });
    });

    demoRouter.afterEach((to) => {
        if (to.path === '/staking') {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            observing = false;
            observer.disconnect();
        }
    });
}

/**
 * Creates a fake transaction. Each call increments a global counter for the hash and block heights.
 */
let txCounter = 0;
let currentHead = 0;
function createFakeTransaction(tx: Partial<PlainTransactionDetails>) {
    return {
        network: 'mainnet',
        state: 'confirmed',
        transactionHash: `0x${(txCounter++).toString(16)}`,
        value: 50000000,
        recipient: '',
        fee: 0,
        feePerByte: 0,
        format: 'basic',
        sender: '',
        senderType: 'basic',
        recipientType: 'basic',
        validityStartHeight: currentHead++,
        blockHeight: currentHead++,
        flags: 0,
        timestamp: Date.now(),
        proof: { type: 'raw', raw: '' },
        size: 0,
        valid: true,
        ...tx,
    } as PlainTransactionDetails;
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
`;

/**
 * Intercepts fetch request:
 * - fastspot.apiEndpoint will return a mock limit response
 * - estimate endpoint will return mock estimate response
 * - the rest of requests will be passed through
 */
function interceptFetchRequest() {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
        if (typeof args[0] !== 'string') return originalFetch(...args);
        if (args[0].startsWith('/')) return originalFetch(...args);

        const url = new URL(args[0] as string);
        const isFastspotRequest = url.host === (new URL(Config.fastspot.apiEndpoint).host);
        const isLimitsRequest = url.pathname.includes('/limits');
        const isEstimateRequest = url.pathname.includes('/estimate');
        const isAssetsRequest = url.pathname.includes('/assets');

        if (!isFastspotRequest) {
            return originalFetch(...args);
        }

        if (isLimitsRequest) { 
            const constants = {
                current: '9800',
                daily: '50000',
                dailyRemaining: '49000',
                monthly: '100000',
                monthlyRemaining: '98000',
            } as const;
            
            const [assetOrLimit,_] = url.pathname.split('/').slice(-2) as [SwapAsset | 'limits', string];

            if (assetOrLimit === 'limits') {
                const limits: FastspotUserLimits = {
                    asset: ReferenceAsset.USD,
                    swap: `${1000}`,
                    ...constants,
                };
                return new Response(JSON.stringify(limits));
            }
            
            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
            await sleep(1000 + Math.random() * 500);

            const asset = assetOrLimit as SwapAsset;
            // const { exchangeRates } = useFiatStore();
            // const rate: number = exchangeRates.value[asset.toLocaleLowerCase().split('_')[0]].usd!;
            const json: FastspotLimits<SwapAsset> = {
                asset,
                swap: `${1000}`,
                referenceAsset: ReferenceAsset.USD,
                referenceCurrent: constants.current,
                referenceDaily: constants.daily,
                referenceDailyRemaining: constants.dailyRemaining,
                referenceMonthly: constants.monthly,
                referenceMonthlyRemaining: constants.monthlyRemaining,
                referenceSwap: `${1000}`,
                ...constants,
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
                }
            ]
            return new Response(JSON.stringify(json));
        }

        if (isEstimateRequest) {
            const body = args[1]?.body
            if (!body) throw new Error('[Demo] No body found in request')
            type EstimateRequest = {
                from: Record<SwapAsset, number>,
                to: SwapAsset,
                includedFees: 'required'
            };
            const { from: fromObj, to, includedFees: _includedFees } = JSON.parse(body.toString()) as EstimateRequest
            const from = Object.keys(fromObj)[0] as SwapAsset

            // Validate the request
            if (!from || !to) {
                return new Response(JSON.stringify({
                    error: 'Invalid request parameters',
                    status: 400,
                }), { status: 400 });
            }

            // Calculate fees based on the value

            const value = fromObj[from];
            const networkFee = Math.floor(value * 0.0005); // 0.05% network fee
            const escrowFee = Math.floor(value * 0.001); // 0.1% escrow fee

            // Calculate the destination amount using our mock rates
            const estimatedAmount = calculateEstimatedAmount(from, to, value);

            // Create mock estimate response with a valid structure
            const estimate: FastspotEstimate[] = [{
                from: [{
                    amount: `${value}`,
                    name: from,
                    symbol: from,
                    finalizeNetworkFee: {
                        total: `${networkFee}`,
                        totalIsIncluded: false,
                        perUnit: `${getNetworkFeePerUnit(from)}`,
                    },
                    fundingNetworkFee: {
                        total: `${networkFee}`,
                        totalIsIncluded: false,
                        perUnit: `${getNetworkFeePerUnit(from)}`,
                    },
                    operatingNetworkFee: {
                        total: `${networkFee}`,
                        totalIsIncluded: false,
                        perUnit: `${getNetworkFeePerUnit(from)}`,
                    }
                }],
                to: [{
                    amount: `${estimatedAmount}`,
                    name: to,
                    symbol: to,
                    finalizeNetworkFee: {
                        total: `${networkFee}`,
                        totalIsIncluded: false,
                        perUnit: `${getNetworkFeePerUnit(to)}`,
                    },
                    fundingNetworkFee: {
                        total: `${networkFee}`,
                        totalIsIncluded: false,
                        perUnit: `${getNetworkFeePerUnit(to)}`,
                    },
                    operatingNetworkFee: {  
                        total: `${networkFee}`,
                        totalIsIncluded: false,
                        perUnit: `${getNetworkFeePerUnit(to)}`,
                    }
                }],
                direction: 'forward',
                serviceFeePercentage: 0.01,
            }];

            console.log('[Demo] Mock estimate:', estimate); // eslint-disable no-console

            return new Response(JSON.stringify(estimate));
        }

        return originalFetch(...args);
    };
}

/**
 * Network fee helper function
 */
function getNetworkFee(asset: string): number {
    switch (asset) {
        case SwapAsset.BTC:
            return 10000; // 10k sats
        case SwapAsset.NIM:
            return 1000; // 1000 luna
        case SwapAsset.USDC_MATIC:
        case SwapAsset.USDT_MATIC:
            return 2000000000000000; // 0.002 MATIC in wei
        default:
            return 0;
    }
}

/**
 * Fee per unit helper function
 */
function getNetworkFeePerUnit(asset: string): number {
    switch (asset) {
        case SwapAsset.BTC:
            return 10; // 10 sats/vbyte
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
 * Calculate mock estimated amount for swaps based on predefined rates
 */
function calculateEstimatedAmount(fromAsset: string, toAsset: string, value: number): number {
    // Define mock exchange rates (realistic market rates)
    const rates: Record<string, number> = {
        [`${SwapAsset.NIM}-${SwapAsset.BTC}`]: 0.00000004, // 1 NIM = 0.00000004 BTC
        [`${SwapAsset.NIM}-${SwapAsset.USDC_MATIC}`]: 0.0012, // 1 NIM = 0.0012 USDC
        [`${SwapAsset.NIM}-${SwapAsset.USDT_MATIC}`]: 0.0012, // 1 NIM = 0.0012 USDT
        [`${SwapAsset.BTC}-${SwapAsset.NIM}`]: 25000000, // 1 BTC = 25,000,000 NIM
        [`${SwapAsset.BTC}-${SwapAsset.USDC_MATIC}`]: 30000, // 1 BTC = 30,000 USDC
        [`${SwapAsset.BTC}-${SwapAsset.USDT_MATIC}`]: 30000, // 1 BTC = 30,000 USDT
        [`${SwapAsset.USDC_MATIC}-${SwapAsset.NIM}`]: 833.33, // 1 USDC = 833.33 NIM
        [`${SwapAsset.USDC_MATIC}-${SwapAsset.BTC}`]: 0.000033, // 1 USDC = 0.000033 BTC
        [`${SwapAsset.USDC_MATIC}-${SwapAsset.USDT_MATIC}`]: 1, // 1 USDC = 1 USDT
        [`${SwapAsset.USDT_MATIC}-${SwapAsset.NIM}`]: 833.33, // 1 USDT = 833.33 NIM
        [`${SwapAsset.USDT_MATIC}-${SwapAsset.BTC}`]: 0.000033, // 1 USDT = 0.000033 BTC
        [`${SwapAsset.USDT_MATIC}-${SwapAsset.USDC_MATIC}`]: 1, // 1 USDT = 1 USDT
    };

    const rate = rates[`${fromAsset}-${toAsset}`];
    if (!rate) {
        // If no direct rate, check reverse rate
        const reverseRate = rates[`${toAsset}-${fromAsset}`];
        if (reverseRate) {
            return Math.floor(value * (1 / reverseRate));
        }
        return value; // 1:1 if no rate defined
    }

    return Math.floor(value * rate);
}

/**
 * Ensures the Send button in modals is always enabled in demo mode, regardless of network state.
 * This allows users to interact with the send functionality without waiting for network sync.
 */
function enableSendModalInDemoMode() {
    let observing = false;
    const observer = new MutationObserver(() => {
        // Target the send modal footer button
        const sendButton = document.querySelector('.send-modal-footer .nq-button');
        if (!sendButton) return;

        if (sendButton.hasAttribute('disabled')) {
            sendButton.removeAttribute('disabled');

            // Also remove any visual indications of being disabled
            sendButton.classList.remove('disabled');

            // Also find and hide any sync message if shown
            const footer = document.querySelector('.send-modal-footer');
            if (footer) {
                const footerNotice = footer.querySelector('.footer-notice') as HTMLDivElement;
                if (footerNotice && footerNotice.textContent &&
                    (footerNotice.textContent.includes('Connecting to Bitcoin') ||
                        footerNotice.textContent.includes('Syncing with Bitcoin'))) {
                    footerNotice.style.display = 'none';
                }
            }
        }
    });

    // Observe document for changes - particularly when modals open
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
}

const ignoreHubRequests = [
    'addBtcAddresses',
    'on'
]

/**
 * Replacement of the Hub API class to capture and redirect calls to our demo modals instead.
 */
export class DemoHubApi extends HubApi {
    static create(): DemoHubApi {
        const instance = new DemoHubApi();
        return new Proxy(instance, {
            get(target, prop: keyof HubApi) {
                if (typeof target[prop] === 'function') {
                    return async (...args: Parameters<HubApi[typeof prop]>) => {
                        return new Promise(async (resolve, reject) => {
                            const requestName = String(prop);
                            const [firstArg] = args;
                            // eslint-disable-next-line no-console
                            console.warn(`[Demo] Mocking Hub call: ${requestName}("${firstArg}")`);

                            if (ignoreHubRequests.includes(requestName)) {
                                return;
                            }
                            // Find the setupSwap handler in the DemoHubApi class and replace it with this:

                            if (requestName === 'setupSwap') {
                                console.log({
                                    firstArg,
                                    args,
                                })
                                return
                            }
                            //     if (requestName === 'setupSwap') {
                            //         (firstArg as Function)();
                            //         // Get swap amount and asset details from the DOM
                            //         const leftColumn = document.querySelector('.swap-amounts .left-column');
                            //         const leftAmountElement = leftColumn?.querySelector('.width-value');
                            //         const rightColumn = document.querySelector('.swap-amounts .right-column');
                            //         const rightAmountElement = rightColumn?.querySelector('.width-value');

                            //         if (!leftAmountElement || !rightAmountElement || !leftColumn || !rightColumn) {
                            //             console.warn('[Demo] Could not find swap amount elements');
                            //             return {};
                            //         }

                            //         const leftValue = Number((leftAmountElement as HTMLDivElement).innerText.replace(/,/g, ''));
                            //         const leftAsset = leftColumn.querySelector('.ticker')?.innerHTML.toUpperCase().trim() as SwapAsset;

                            //         const rightValue = Number((rightAmountElement as HTMLDivElement).innerText.replace(/,/g, ''));
                            //         const rightAsset = rightColumn.querySelector('.ticker')?.innerHTML.toUpperCase().trim() as SwapAsset;

                            //         console.log(`[Demo] Setting up swap: ${leftValue} ${leftAsset} -> ${rightValue} ${rightAsset}`);

                            //         // Check if we have valid values
                            //         if (!leftValue || !rightValue || !leftAsset || !rightAsset) {
                            //             console.warn('[Demo] Missing swap values');
                            //             return {};
                            //         }

                            //         const direction = leftValue < rightValue ? 'forward' : 'reverse';
                            //         const fromAsset = direction === 'forward' ? leftAsset : rightAsset;
                            //         // @ts-expect-error Object key not specific enough?
                            //         const toAsset: RequestAsset<SwapAsset> = direction === 'forward'
                            //             ? { [rightAsset]: rightValue }
                            //             : { [leftAsset]: leftValue };

                            //         const swapSuggestion = await createSwap(fromAsset, toAsset);

                            //         const { config } = useConfig();

                            //         let fund: HtlcCreationInstructions | null = null;
                            //         let redeem: HtlcSettlementInstructions | null = null;

                            //         const { activeAddressInfo } = useAddressStore();

                            //         const { availableExternalAddresses } = useBtcAddressStore();
                            //         const nimAddress = activeAddressInfo.value!.address;
                            //         const btcAddress = availableExternalAddresses.value[0];

                            //         if (swapSuggestion.from.asset === SwapAsset.NIM) {
                            //             const nimiqClient = await getNetworkClient();
                            //             await nimiqClient.waitForConsensusEstablished();
                            //             const headHeight = await nimiqClient.getHeadHeight();
                            //             if (headHeight > 100) {
                            //                 useNetworkStore().state.height = headHeight;
                            //             } else {
                            //                 throw new Error('Invalid network state, try please reloading the app');
                            //             }

                            //             fund = {
                            //                 type: SwapAsset.NIM,
                            //                 sender: nimAddress,
                            //                 value: swapSuggestion.from.amount,
                            //                 fee: swapSuggestion.from.fee,
                            //                 validityStartHeight: useNetworkStore().state.height,
                            //             };
                            //         }

                            //         const { accountUtxos, accountBalance: accountBtcBalance, } = useBtcAddressStore();
                            //         if (swapSuggestion.from.asset === SwapAsset.BTC) {
                            //             const electrumClient = await getElectrumClient();
                            //             await electrumClient.waitForConsensusEstablished();


                            //             // Assemble BTC inputs
                            //             // Transactions to an HTLC are 46 weight units bigger because of the longer recipient address
                            //             const requiredInputs = selectOutputs(
                            //                 accountUtxos.value, swapSuggestion.from.amount, swapSuggestion.from.feePerUnit, 48);
                            //             let changeAddress: string;
                            //             if (requiredInputs.changeAmount > 0) {
                            //                 const { nextChangeAddress } = useBtcAddressStore();
                            //                 if (!nextChangeAddress.value) {
                            //                     // FIXME: If no unused change address is found, need to request new ones from Hub!
                            //                     throw new Error('No more unused change addresses (not yet implemented)');
                            //                 }
                            //                 changeAddress = nextChangeAddress.value;
                            //             }

                            //             fund = {
                            //                 type: SwapAsset.BTC,
                            //                 inputs: requiredInputs.utxos.map((utxo) => ({
                            //                     address: utxo.address,
                            //                     transactionHash: utxo.transactionHash,
                            //                     outputIndex: utxo.index,
                            //                     outputScript: utxo.witness.script,
                            //                     value: utxo.witness.value,
                            //                 })),
                            //                 output: {
                            //                     value: swapSuggestion.from.amount,
                            //                 },
                            //                 ...(requiredInputs.changeAmount > 0 ? {
                            //                     changeOutput: {
                            //                         address: changeAddress!,
                            //                         value: requiredInputs.changeAmount,
                            //                     },
                            //                 } : {}),
                            //                 refundAddress: btcAddress,
                            //             };
                            //         }

                            //         const {
                            //             activeAddress: activePolygonAddress,
                            //             accountUsdcBalance,
                            //             accountUsdtBridgedBalance,
                            //         } = usePolygonAddressStore();


                            //         if (swapSuggestion.from.asset === SwapAsset.USDC_MATIC) {
                            //             const [client, htlcContract] = await Promise.all([
                            //                 getPolygonClient(),
                            //                 getUsdcHtlcContract(),
                            //             ]);
                            //             const fromAddress = activePolygonAddress.value!;

                            //             const [
                            //                 usdcNonce,
                            //                 forwarderNonce,
                            //                 blockHeight,
                            //             ] = await Promise.all([
                            //                 client.usdcToken.nonces(fromAddress) as Promise<BigNumber>,
                            //                 htlcContract.getNonce(fromAddress) as Promise<BigNumber>,
                            //                 getPolygonBlockNumber(),
                            //             ]);

                            //             const { fee, gasLimit, gasPrice, relay, method } = {
                            //                 fee: 1,
                            //                 gasLimit: 1,
                            //                 gasPrice: 1,
                            //                 relay: {
                            //                     pctRelayFee: 1,
                            //                     baseRelayFee: 1,
                            //                     relayWorkerAddress: '0x0000000000111111111122222222223333333333',
                            //                 },
                            //                 method: 'open'
                            //             };
                            //             if (method !== 'open' && method !== 'openWithPermit') {
                            //                 throw new Error('Wrong USDC contract method');
                            //             }

                            //             // Zeroed data fields are replaced by Fastspot's proposed data (passed in from Hub) in
                            //             // Keyguard's SwapIFrameApi.
                            //             const data = htlcContract.interface.encodeFunctionData(method, [
                            // /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            // /* address token */ config.polygon.usdc.tokenContract,
                            // /* uint256 amount */ swapSuggestion.from.amount,
                            // /* address refundAddress */ fromAddress,
                            // /* address recipientAddress */ '0x0000000000000000000000000000000000000000',
                            // /* bytes32 hash */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            // /* uint256 timeout */ 0,
                            // /* uint256 fee */ fee,
                            //                 ...(method === 'openWithPermit' ? [
                            //     // // Approve the maximum possible amount so afterwards we can use the `open` method for
                            //     // // lower fees
                            //     // /* uint256 value */ client.ethers
                            //     //    .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
                            //     /* uint256 value */ swapSuggestion.from.amount + fee,

                            //     /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            //     /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            //     /* uint8 sigV */ 0,
                            //                 ] : []),
                            //             ]);

                            //             const relayRequest: RelayRequest = {
                            //                 request: {
                            //                     from: fromAddress,
                            //                     to: config.polygon.usdc.htlcContract,
                            //                     data,
                            //                     value: '0',
                            //                     nonce: forwarderNonce.toString(),
                            //                     gas: gasLimit.toString(),
                            //                     validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                            //                         .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                            //                 },
                            //                 relayData: {
                            //                     gasPrice: gasPrice.toString(),
                            //                     pctRelayFee: relay.pctRelayFee.toString(),
                            //                     baseRelayFee: relay.baseRelayFee.toString(),
                            //                     relayWorker: relay.relayWorkerAddress,
                            //                     paymaster: config.polygon.usdc.htlcContract,
                            //                     paymasterData: '0x',
                            //                     clientId: Math.floor(Math.random() * 1e6).toString(10),
                            //                     forwarder: config.polygon.usdc.htlcContract,
                            //                 },
                            //             };

                            //             fund = {
                            //                 type: SwapAsset.USDC_MATIC,
                            //                 ...relayRequest,
                            //                 ...(method === 'openWithPermit' ? {
                            //                     permit: {
                            //                         tokenNonce: usdcNonce.toNumber(),
                            //                     },
                            //                 } : null),
                            //             };
                            //         }

                            //         if (swapSuggestion.from.asset === SwapAsset.USDT_MATIC) {
                            //             const [client, htlcContract] = await Promise.all([
                            //                 getPolygonClient(),
                            //                 getUsdtBridgedHtlcContract(),
                            //             ]);
                            //             const fromAddress = activePolygonAddress.value!;

                            //             const [
                            //                 usdtNonce,
                            //                 forwarderNonce,
                            //                 blockHeight,
                            //             ] = await Promise.all([
                            //                 client.usdtBridgedToken.getNonce(fromAddress) as Promise<BigNumber>,
                            //                 htlcContract.getNonce(fromAddress) as Promise<BigNumber>,
                            //                 getPolygonBlockNumber(),
                            //             ]);

                            //             const { fee, gasLimit, gasPrice, relay, method } = {
                            //                 fee: 1,
                            //                 gasLimit: 1,
                            //                 gasPrice: 1,
                            //                 relay: {
                            //                     pctRelayFee: 1,
                            //                     baseRelayFee: 1,
                            //                     relayWorkerAddress: '0x0000000000111111111122222222223333333333',
                            //                 },
                            //                 method: 'open'
                            //             };
                            //             if (method !== 'open' && method !== 'openWithApproval') {
                            //                 throw new Error('Wrong USDT contract method');
                            //             }

                            //             // Zeroed data fields are replaced by Fastspot's proposed data (passed in from Hub) in
                            //             // Keyguard's SwapIFrameApi.
                            //             const data = htlcContract.interface.encodeFunctionData(method, [
                            // /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            // /* address token */ config.polygon.usdt_bridged.tokenContract,
                            // /* uint256 amount */ swapSuggestion.from.amount,
                            // /* address refundAddress */ fromAddress,
                            // /* address recipientAddress */ '0x0000000000000000000000000000000000000000',
                            // /* bytes32 hash */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            // /* uint256 timeout */ 0,
                            // /* uint256 fee */ fee,
                            //                 ...(method === 'openWithApproval' ? [
                            //     // // Approve the maximum possible amount so afterwards we can use the `open` method for
                            //     // // lower fees
                            //     // /* uint256 approval */ client.ethers
                            //     //    .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
                            //     /* uint256 approval */ swapSuggestion.from.amount + fee,

                            //     /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            //     /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            //     /* uint8 sigV */ 0,
                            //                 ] : []),
                            //             ]);

                            //             const relayRequest: RelayRequest = {
                            //                 request: {
                            //                     from: fromAddress,
                            //                     to: config.polygon.usdt_bridged.htlcContract,
                            //                     data,
                            //                     value: '0',
                            //                     nonce: forwarderNonce.toString(),
                            //                     gas: gasLimit.toString(),
                            //                     validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                            //                         .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                            //                 },
                            //                 relayData: {
                            //                     gasPrice: gasPrice.toString(),
                            //                     pctRelayFee: relay.pctRelayFee.toString(),
                            //                     baseRelayFee: relay.baseRelayFee.toString(),
                            //                     relayWorker: relay.relayWorkerAddress,
                            //                     paymaster: config.polygon.usdt_bridged.htlcContract,
                            //                     paymasterData: '0x',
                            //                     clientId: Math.floor(Math.random() * 1e6).toString(10),
                            //                     forwarder: config.polygon.usdt_bridged.htlcContract,
                            //                 },
                            //             };

                            //             fund = {
                            //                 type: SwapAsset.USDT_MATIC,
                            //                 ...relayRequest,
                            //                 ...(method === 'openWithApproval' ? {
                            //                     approval: {
                            //                         tokenNonce: usdtNonce.toNumber(),
                            //                     },
                            //                 } : null),
                            //             };
                            //         }

                            //         if (swapSuggestion.to.asset === SwapAsset.NIM) {
                            //             const nimiqClient = await getNetworkClient();
                            //             await nimiqClient.waitForConsensusEstablished();
                            //             const headHeight = await nimiqClient.getHeadHeight();
                            //             if (headHeight > 100) {
                            //                 useNetworkStore().state.height = headHeight;
                            //             } else {
                            //                 throw new Error('Invalid network state, try please reloading the app');
                            //             }

                            //             redeem = {
                            //                 type: SwapAsset.NIM,
                            //                 recipient: nimAddress, // My address, must be redeem address of HTLC
                            //                 value: swapSuggestion.to.amount - swapSuggestion.to.fee, // Luna
                            //                 fee: swapSuggestion.to.fee, // Luna
                            //                 validityStartHeight: useNetworkStore().state.height,
                            //             };
                            //         }

                            //         if (swapSuggestion.to.asset === SwapAsset.BTC) {
                            //             const electrumClient = await getElectrumClient();
                            //             await electrumClient.waitForConsensusEstablished();

                            //             redeem = {
                            //                 type: SwapAsset.BTC,
                            //                 input: {
                            //                     // transactionHash: transaction.transactionHash,
                            //                     // outputIndex: output.index,
                            //                     // outputScript: output.script,
                            //                     value: swapSuggestion.to.amount, // Sats
                            //                 },
                            //                 output: {
                            //                     address: btcAddress, // My address, must be redeem address of HTLC
                            //                     value: swapSuggestion.to.amount - swapSuggestion.to.fee, // Sats
                            //                 },
                            //             };
                            //         }

                            //         if (swapSuggestion.to.asset === SwapAsset.USDC_MATIC) {
                            //             const htlcContract = await getUsdcHtlcContract();
                            //             const toAddress = activePolygonAddress.value!;

                            //             const [
                            //                 forwarderNonce,
                            //                 blockHeight,
                            //             ] = await Promise.all([
                            //                 htlcContract.getNonce(toAddress) as Promise<BigNumber>,
                            //                 getPolygonBlockNumber(),
                            //             ]);

                            //             const { fee, gasLimit, gasPrice, relay, method } = {
                            //                 fee: 1,
                            //                 gasLimit: 1,
                            //                 gasPrice: 1,
                            //                 relay: {
                            //                     pctRelayFee: 1,
                            //                     baseRelayFee: 1,
                            //                     relayWorkerAddress: '0x0000000000111111111122222222223333333333',
                            //                 },
                            //                 method: 'open'
                            //             };
                            //             if (method !== 'redeemWithSecretInData') {
                            //                 throw new Error('Wrong USDC contract method');
                            //             }

                            //             const data = htlcContract.interface.encodeFunctionData(method, [
                            // /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            // /* address target */ toAddress,
                            // /* uint256 fee */ fee,
                            //             ]);

                            //             const relayRequest: RelayRequest = {
                            //                 request: {
                            //                     from: toAddress,
                            //                     to: config.polygon.usdc.htlcContract,
                            //                     data,
                            //                     value: '0',
                            //                     nonce: forwarderNonce.toString(),
                            //                     gas: gasLimit.toString(),
                            //                     validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                            //                         .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                            //                 },
                            //                 relayData: {
                            //                     gasPrice: gasPrice.toString(),
                            //                     pctRelayFee: relay.pctRelayFee.toString(),
                            //                     baseRelayFee: relay.baseRelayFee.toString(),
                            //                     relayWorker: relay.relayWorkerAddress,
                            //                     paymaster: config.polygon.usdc.htlcContract,
                            //                     paymasterData: '0x',
                            //                     clientId: Math.floor(Math.random() * 1e6).toString(10),
                            //                     forwarder: config.polygon.usdc.htlcContract,
                            //                 },
                            //             };

                            //             redeem = {
                            //                 type: SwapAsset.USDC_MATIC,
                            //                 ...relayRequest,
                            //                 amount: swapSuggestion.to.amount - swapSuggestion.to.fee,
                            //             };
                            //         }

                            //         if (swapSuggestion.to.asset === SwapAsset.USDT_MATIC) {
                            //             const htlcContract = await getUsdtBridgedHtlcContract();
                            //             const toAddress = activePolygonAddress.value!;

                            //             const [
                            //                 forwarderNonce,
                            //                 blockHeight,
                            //             ] = await Promise.all([
                            //                 htlcContract.getNonce(toAddress) as Promise<BigNumber>,
                            //                 getPolygonBlockNumber(),
                            //             ]);

                            //             const { fee, gasLimit, gasPrice, relay, method } = {
                            //                 fee: 1,
                            //                 gasLimit: 1,
                            //                 gasPrice: 1,
                            //                 relay: {
                            //                     pctRelayFee: 1,
                            //                     baseRelayFee: 1,
                            //                     relayWorkerAddress: '0x0000000000111111111122222222223333333333',
                            //                 },
                            //                 method: 'open'
                            //             };
                            //             if (method !== 'redeemWithSecretInData') {
                            //                 throw new Error('Wrong USDT contract method');
                            //             }

                            //             const data = htlcContract.interface.encodeFunctionData(method, [
                            // /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            // /* address target */ toAddress,
                            // /* uint256 fee */ fee,
                            //             ]);

                            //             const relayRequest: RelayRequest = {
                            //                 request: {
                            //                     from: toAddress,
                            //                     to: config.polygon.usdt_bridged.htlcContract,
                            //                     data,
                            //                     value: '0',
                            //                     nonce: forwarderNonce.toString(),
                            //                     gas: gasLimit.toString(),
                            //                     validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                            //                         .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                            //                 },
                            //                 relayData: {
                            //                     gasPrice: gasPrice.toString(),
                            //                     pctRelayFee: relay.pctRelayFee.toString(),
                            //                     baseRelayFee: relay.baseRelayFee.toString(),
                            //                     relayWorker: relay.relayWorkerAddress,
                            //                     paymaster: config.polygon.usdt_bridged.htlcContract,
                            //                     paymasterData: '0x',
                            //                     clientId: Math.floor(Math.random() * 1e6).toString(10),
                            //                     forwarder: config.polygon.usdt_bridged.htlcContract,
                            //                 },
                            //             };

                            //             redeem = {
                            //                 type: SwapAsset.USDT_MATIC,
                            //                 ...relayRequest,
                            //                 amount: swapSuggestion.to.amount - swapSuggestion.to.fee,
                            //             };
                            //         }

                            //         if (!fund || !redeem) {
                            //             reject(new Error('UNEXPECTED: No funding or redeeming data objects'));
                            //             return;
                            //         }

                            //         const serviceSwapFee = Math.round(
                            //             (swapSuggestion.from.amount - swapSuggestion.from.serviceNetworkFee)
                            //             * swapSuggestion.serviceFeePercentage,
                            //         );

                            //         const { addressInfos } = useAddressStore();

                            //         const { activeAccountInfo } = useAccountStore();

                            //         const { currency, exchangeRates } = useFiatStore();

                            //         const {
                            //             activeAddress

                            //         } = usePolygonAddressStore();

                            //         const request: Omit<SetupSwapRequest, 'appName'> = {
                            //             accountId: activeAccountInfo.value!.id,
                            //             swapId: swapSuggestion.id,
                            //             fund,
                            //             redeem,

                            //             layout: 'slider',
                            //             direction: direction === 'forward' ? 'left-to-right' : 'right-to-left',
                            //             fiatCurrency: currency.value,
                            //             fundingFiatRate: exchangeRates.value[assetToCurrency(
                            //                 fund.type as SupportedSwapAsset,
                            //             )][currency.value]!,
                            //             redeemingFiatRate: exchangeRates.value[assetToCurrency(
                            //                 redeem.type as SupportedSwapAsset,
                            //             )][currency.value]!,
                            //             fundFees: {
                            //                 processing: 0,
                            //                 redeeming: swapSuggestion.from.serviceNetworkFee,
                            //             },
                            //             redeemFees: {
                            //                 funding: swapSuggestion.to.serviceNetworkFee,
                            //                 processing: 0,
                            //             },
                            //             serviceSwapFee,
                            //             nimiqAddresses: addressInfos.value.map((addressInfo) => ({
                            //                 address: addressInfo.address,
                            //                 balance: addressInfo.balance || 0,
                            //             })),
                            //             bitcoinAccount: {
                            //                 balance: accountBtcBalance.value,
                            //             },
                            //             polygonAddresses: activePolygonAddress.value ? [{
                            //                 address: activePolygonAddress.value,
                            //                 usdcBalance: accountUsdcBalance.value,
                            //                 usdtBalance: accountUsdtBridgedBalance.value,
                            //             }] : [],
                            //         };

                            //         console.log('[Demo] Faking swap setup with request:', request);
                            //         resolve(request)
                            //         return;
                            //     }

                            // Wait for router readiness
                            await new Promise<void>((resolve) => {
                                demoRouter.onReady(resolve);
                            });

                            // eslint-disable-next-line no-console
                            console.log('[Demo] Redirecting to fallback modal');
                            demoRouter.push(`/${DemoModal.Fallback}`);
                        });
                    }
                }
                return target[prop];
            },
        });
    }
}

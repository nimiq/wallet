/* eslint-disable max-len */
import { createStore } from 'pinia';
import VueRouter from 'vue-router';
import { TransactionState } from '@nimiq/electrum-client';
import HubApi from '@nimiq/hub-api';
import { CryptoCurrency, Utf8Tools } from '@nimiq/utils';
import { KeyPair, PlainTransactionDetails, PrivateKey } from '@nimiq/core';
import { STAKING_CONTRACT_ADDRESS } from '@/lib/Constants';
import { AccountType, useAccountStore } from '@/stores/Account';
import { AddressInfo, AddressType, useAddressStore } from '@/stores/Address';
import { toSecs, useTransactionsStore } from '@/stores/Transactions';
import { useBtcTransactionsStore } from '@/stores/BtcTransactions';
import { useStakingStore } from '@/stores/Staking';
import Config from 'config';
import { SwapAsset } from '@nimiq/libswap';
import { SwapStatus } from '@nimiq/fastspot-api';
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
const buyFromAddress = 'NQ04 JG63 HYXL H3QF PPNA 7ED7 426M 3FQE FHE5';

// We keep this as our global/final balance, which should result from the transactions
const nimInitialBalance = 14041800000; // 14,041,800,000

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
            installHomeBadgeObserver();
            addDemoModalRoutes();
            interceptFetchRequest();

            setupDemoAddresses();
            setupDemoAccount();

            // Add the fake transactions:
            generateFakeNimTransactions();

            const { addTransactions: addBtcTransactions } = useBtcTransactionsStore();
            addBtcTransactions(generateFakeBtcTransactions());

            attachIframeListeners();
            replaceStakingProcess();
            enableBuyDemoNim();
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
function installHomeBadgeObserver() {
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
 * Creates and inserts the demo address details.
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
}

/**
 * Creates a fake main account referencing our demo addresses.
 */
function setupDemoAccount() {
    const { addAccountInfo, setActiveCurrency } = useAccountStore();

    addAccountInfo({
        id: 'demo-account-1',
        type: AccountType.BIP39,
        label: 'Demo Main Account',
        fileExported: true,
        wordsExported: true,
        addresses: [demoNimAddress],
        btcAddresses: { internal: [demoBtcAddress], external: [demoBtcAddress] },
        polygonAddresses: [],
        uid: 'demo-uid-1',
    });

    setActiveCurrency(CryptoCurrency.NIM);
}

/**
 * Generates fake NIM transactions spanning the last ~4 months.
 * They net to the global nimInitialBalance.
 * We use a helper function to calculate each transaction value so it doesn't end in 0.
 */
function generateFakeNimTransactions() {
    // We'll define total fractions so the net sum is 1.
    const txDefinitions = [
        { fraction: -0.14, daysAgo: 107, description: 'New Lederhosen for Bavarian Parade' },
        { fraction: -0.05, daysAgo: 105, description: 'Netflix Subscription for Endless "Are You Still Watching?"' },
        { fraction: 0.1, daysAgo: 102, description: 'Sold Old Phone to Treasure Island Pawn Shop' },
        { fraction: -0.2, daysAgo: 93, description: 'Groceries at Casa de Miyazaki Market' },
        { fraction: 0.2, daysAgo: 92, description: 'Gift from Grandma (Red Envelope Edition)', label: 'Grandma' },
        { fraction: 0.3, daysAgo: 92, description: 'Part-time Job at Ghibli Express' },
        { fraction: 0.02, daysAgo: 87, description: 'Tiny Payback from Hagrid for Lunch' },
        { fraction: 0.07, daysAgo: 84, description: 'Lottery Winnings from La Caleta’s Lucky Booth' },
        { fraction: -0.15, daysAgo: 83, description: 'Car Fuel at Wasteland Gas Stop' },
        { fraction: -0.3, daysAgo: 78, description: 'Rent Payment to Villaggio del Papa' },
        { fraction: -0.1, daysAgo: 45, description: 'Dinner at Krusty Krab' },
        { fraction: -0.02, daysAgo: 41, description: 'Book Purchase: "How to Train Your Alpaca"' },
        { fraction: -0.03, daysAgo: 39, description: 'Concert Tickets for "K-Pop Legends Live"' },
        { fraction: 0.05, daysAgo: 36, description: 'Refund for Returning the World’s Ugliest Sweater' },
        { fraction: 0.5, daysAgo: 31, description: 'Freelance Work for Wakanda Tech' },
        { fraction: 0.02, daysAgo: 27, description: 'Overpaid Coffee Refund from Central Perk' },
        { fraction: -0.11, daysAgo: 27, description: 'Custom Ao Dai from Hanoi Silk Street' },
        { fraction: 0.06, daysAgo: 27, description: 'Store Refund from IKEA' },
        { fraction: -0.08, daysAgo: 22, description: 'Tuk-Tuk Repair Fees (Because Fun Rides Aren’t Free)' },
        { fraction: -0.12, daysAgo: 21, description: 'Online Course: "Mastering Ancient Egyptian Hieroglyphs"' },
        { fraction: 0.05, daysAgo: 19, description: 'Sold an NFT of Your Cat’s Funny Pose' },
        { fraction: -0.1, daysAgo: 17, description: 'Electricity Bill from Zeus Power Co.' },
        { fraction: -0.1, daysAgo: 6, description: 'New Clothes from Raja’s Silk Emporium' },
        { fraction: 1.13, daysAgo: 2, description: 'Nimiq Hackathon Prize!' },
    ];

    const { addTransactions } = useTransactionsStore();
    // const { addAddressInfo } = useAddressStore();

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
        // TODO Adding more than one address breaks the wallet.
        // if (def.label) addAddressInfo({ label: def.label, type: AddressType.BASIC, address, balance: null });
    }
}

/**
 * Creates a few fake BTC transactions (5) related to investments or exchanges.
 */
function generateFakeBtcTransactions() {
    // For demonstration, we'll just define 5 transactions that don't necessarily
    // sum to any final specific balance. They are just placeholders.

    const txs = [
        {
            isCoinbase: false,
            inputs: [
                {
                    address: demoBtcAddress,
                    outputIndex: 0,
                    index: 0,
                    script: 'abcd',
                    sequence: 4294967295,
                    transactionHash: 'btc-tx-1',
                    witness: ['abcd'],
                },
            ],
            outputs: [
                {
                    value: 200000000,
                    address: '1InvestmentAddress',
                    script: 'abcd',
                    index: 0,
                },
            ],
            transactionHash: 'btc-tx-1',
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: 8,
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(90)),
            state: TransactionState.CONFIRMED,
        },
        {
            isCoinbase: false,
            inputs: [
                {
                    address: '1ExchangeInputAddress',
                    outputIndex: 0,
                    index: 0,
                    script: 'abcd',
                    sequence: 4294967295,
                    transactionHash: 'btc-tx-2',
                    witness: ['abcd'],
                },
            ],
            outputs: [
                {
                    value: 50000000,
                    address: demoBtcAddress,
                    script: 'abcd',
                    index: 0,
                },
            ],
            transactionHash: 'btc-tx-2',
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: 5,
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(70)),
            state: TransactionState.CONFIRMED,
        },
        {
            isCoinbase: false,
            inputs: [
                {
                    address: demoBtcAddress,
                    outputIndex: 0,
                    index: 0,
                    script: 'abcd',
                    sequence: 4294967295,
                    transactionHash: 'btc-tx-3',
                    witness: ['abcd'],
                },
            ],
            outputs: [
                {
                    value: 100000000,
                    address: '1LongTermHoldAddress',
                    script: 'abcd',
                    index: 0,
                },
            ],
            transactionHash: 'btc-tx-3',
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: 3,
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(40)),
            state: TransactionState.CONFIRMED,
        },
        {
            isCoinbase: false,
            inputs: [
                {
                    address: '1ExchangeInputAddress2',
                    outputIndex: 0,
                    index: 0,
                    script: 'abcd',
                    sequence: 4294967295,
                    transactionHash: 'btc-tx-4',
                    witness: ['abcd'],
                },
            ],
            outputs: [
                {
                    value: 30000000,
                    address: demoBtcAddress,
                    script: 'abcd',
                    index: 0,
                },
            ],
            transactionHash: 'btc-tx-4',
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: 2,
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(20)),
            state: TransactionState.CONFIRMED,
        },
        {
            isCoinbase: false,
            inputs: [
                {
                    address: demoBtcAddress,
                    outputIndex: 0,
                    index: 0,
                    script: 'abcd',
                    sequence: 4294967295,
                    transactionHash: 'btc-tx-5',
                    witness: ['abcd'],
                },
            ],
            outputs: [
                {
                    value: 25000000,
                    address: '1RandomTradeAddress',
                    script: 'abcd',
                    index: 0,
                },
            ],
            transactionHash: 'btc-tx-5',
            version: 1,
            vsize: 200,
            weight: 800,
            locktime: 0,
            confirmations: 1,
            replaceByFee: false,
            timestamp: toSecs(calculateDaysAgo(5)),
            state: TransactionState.CONFIRMED,
        },
    ];

    return txs;
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
function enableBuyDemoNim() {
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
function replaceStakingProcess() {
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
`;

/**
 * Intercepts fetch request:
 * - fastspot.apiEndpoint will return a mock limit response
 * - the rest of requests will be passed through
 */
function interceptFetchRequest() {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
        if (typeof args[0] !== 'string') return originalFetch(...args);
        if (args[0].startsWith('/')) return originalFetch(...args);

        const url = new URL(args[0] as string);
        const isFastspotRequest = url.host === Config.fastspot.apiEndpoint;
        const isLimitsRequest = url.pathname.includes('/limits');

        if (!isFastspotRequest || !isLimitsRequest) {
            return originalFetch(...args);
        }
        // eslint-disable-next-line no-console
        console.log('Intercepting request to /limits');
        const json = {
            asset: 'USD',
            daily: '1000',
            dailyRemaining: '1000',
            monthly: '1000',
            monthlyRemaining: '1000',
            swap: '1000',
            current: '1000',
        };
        return new Response(JSON.stringify(json));
    };
}

let swapCounter = 0;

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
                        const requestName = String(prop);
                        const [firstArg] = args;
                        // eslint-disable-next-line no-console
                        console.warn(`[Demo] Mocking Hub call: ${requestName}("${firstArg}")`);

                        if (requestName === 'on') {
                            return;
                        }
                        if (requestName === 'setupSwap') {
                            const leftColumn = document.querySelector('.swap-amounts .left-column');
                            const leftAmountElement = leftColumn!.querySelector('.width-value');
                            const leftValue = Number((leftAmountElement as HTMLDivElement).innerText);
                            const leftAsset = leftColumn!.querySelector('.ticker')!.innerHTML.toUpperCase() as SwapAsset;

                            const rightColumn = document.querySelector('.swap-amounts .right-column');
                            const rightAmountElement = rightColumn!.querySelector('.width-value');
                            const rightValue = Number((rightAmountElement as HTMLDivElement).innerText);
                            const rightAsset = rightColumn!.querySelector('.ticker')!.innerHTML.toUpperCase() as SwapAsset;

                            const txHash = `0x${swapCounter++}`;
                            const swapHash = `0x1${swapCounter}`;
                            const { setActiveSwap, setSwap } = useSwapsStore();


                            setSwap(swapHash, { id: `${swapCounter}`, fees: { totalFee: 1, asset: rightAsset } });

                            setActiveSwap({
                                contracts: {},
                                from: { asset: leftAsset, amount: leftValue, fee: 0, serviceEscrowFee: 0, serviceNetworkFee: 0 },
                                to: { asset: rightAsset, amount: rightValue, fee: 1, serviceNetworkFee: 0, serviceEscrowFee: 0 },
                                serviceFeePercentage: 0.025,
                                direction: 'forward',
                                state: SwapState.AWAIT_INCOMING,
                                stateEnteredAt: Date.now(),
                                id: `${swapCounter}`,
                                expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
                                status: SwapStatus.WAITING_FOR_TRANSACTIONS,
                                hash: swapHash,
                                watchtowerNotified: true,
                            });
                            // const { addTransactions } = useTransactionsStore();
                            // addTransactions([createFakeTransaction({
                            //     value,

                            // })]);
                            return;
                        }

                        // Wait for router readiness
                        await new Promise<void>((resolve) => {
                            demoRouter.onReady(resolve);
                        });

                        // eslint-disable-next-line no-console
                        console.log('[Demo] Redirecting to fallback modal');
                        demoRouter.push(`/${DemoModal.Fallback}`);
                    };
                }
                return target[prop];
            },
        });
    }
}

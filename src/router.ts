import VueRouter, { RouteConfig, Route, NavigationGuardNext } from 'vue-router';
import Vue from 'vue';
import { createNimiqRequestLink, parseNimiqSafeRequestLink, NimiqRequestLinkType } from '@nimiq/utils';
import { Component } from 'vue-router/types/router.d';

import { provide, inject } from '@vue/composition-api';

// Start views
import Groundfloor from './components/layouts/Groundfloor.vue';
import AccountOverview from './components/layouts/AccountOverview.vue';
import AddressOverview from './components/layouts/AddressOverview.vue';

import { AccountType, useAccountStore } from './stores/Account';
import { CryptoCurrency } from './lib/Constants';

// Main views
const SettingsLayout = () => import(/* webpackChunkName: "settings" */ './components/layouts/Settings.vue');
const NetworkLayout = () =>
    import(/* webpackChunkName: "network" */ './components/layouts/Network.vue');

// Modals
const AccountMenuModal = () =>
    import(/* webpackChunkName: "account-menu-modal" */ './components/modals/AccountMenuModal.vue');
const SendModal = () => import(/* webpackChunkName: "send-modal" */ './components/modals/SendModal.vue');
const ReceiveModal = () => import(/* webpackChunkName: "receive-modal" */ './components/modals/ReceiveModal.vue');
const AddressSelectorModal = () =>
    import(/* webpackChunkName: "address-selector-modal" */ './components/modals/AddressSelectorModal.vue');
const TransactionModal = () =>
    import(/* webpackChunkName: "transaction-modal" */ './components/modals/TransactionModal.vue');
const TradeModal = () => import(/* webpackChunkName: "trade-modal" */ './components/modals/TradeModal.vue');
const BuyOptionsModal = () =>
    import(/* webpackChunkName: "buy-options-modal" */ './components/modals/BuyOptionsModal.vue');
const ScanQrModal = () => import(/* webpackChunkName: "scan-qr-modal" */ './components/modals/ScanQrModal.vue');
const WelcomeModal = () =>
    import(/* webpackChunkName: "welcome-modal" */ './components/modals/WelcomeModal.vue');
const WelcomeStakingModal = () =>
    import(/* webpackChunkName: "welcome-staking-modal" */ './components/staking/WelcomeStakingModal.vue');
const MigrationWelcomeModal = () =>
    import(/* webpackChunkName: "migration-welcome-modal" */ './components/modals/MigrationWelcomeModal.vue');
const DisclaimerModal = () =>
    import(/* webpackChunkName: "disclaimer-modal" */ './components/modals/DisclaimerModal.vue');
const ReleaseNotesModal = () =>
    import(/* webpackChunkName: "release-notes-modal" */ './components/modals/ReleaseNotesModal.vue');
const HistoryExportModal = () =>
    import(/* webpackChunkName: "history-export-modal" */ './components/modals/HistoryExportModal.vue');
const StablecoinSelectionModal = () =>
    import(/* webpackChunkName: "history-export-modal" */ './components/modals/StablecoinSelectionModal.vue');
const WalletStatusModal = () =>
    import(/* webpackChunkName: "wallet-status-modal" */ './components/modals/WalletStatusModal.vue');

// Bitcoin Modals
const BtcActivationModal = () =>
    import(/* webpackChunkName: "btc-activation-modal" */ './components/modals/BtcActivationModal.vue');
const BtcSendModal = () => import(/* webpackChunkName: "btc-send-modal" */ './components/modals/BtcSendModal.vue');
const BtcReceiveModal = () =>
    import(/* webpackChunkName: "btc-receive-modal" */ './components/modals/BtcReceiveModal.vue');
const BtcTransactionModal = () =>
    import(/* webpackChunkName: "btc-transaction-modal" */ './components/modals/BtcTransactionModal.vue');

// Stablecoin Modals
const PolygonActivationModal = () =>
    import(/* webpackChunkName: "polygon-activation-modal" */ './components/modals/PolygonActivationModal.vue');
const StablecoinSendModal = () =>
    import(/* webpackChunkName: "stablecoin-send-modal" */ './components/modals/StablecoinSendModal.vue');
const StablecoinReceiveModal = () =>
    import(/* webpackChunkName: "stablecoin-receive-modal" */ './components/modals/StablecoinReceiveModal.vue');
const UsdcTransactionModal = () =>
    import(/* webpackChunkName: "usdc-transaction-modal" */ './components/modals/UsdcTransactionModal.vue');
const UsdtTransactionModal = () =>
    import(/* webpackChunkName: "usdt-transaction-modal" */ './components/modals/UsdtTransactionModal.vue');
const UsdtAddedModal = () =>
    import(/* webpackChunkName: "usdt-added-modal" */ './components/modals/UsdtAddedModal.vue');

// Swap Modals
const SwapModal = () => import(/* webpackChunkName: "swap-modal" */ './components/swap/SwapModal.vue');
const BuyCryptoModal = () =>
    import(/* webpackChunkName: "buy-crypto-modal" */ './components/modals/BuyCryptoModal.vue');
const SellCryptoModal = () =>
    import(/* webpackChunkName: "sell-crypto-modal" */ './components/modals/SellCryptoModal.vue');

const MoonpayModal = () =>
    import(/* webpackChunkName: "moonpay-modal" */ './components/modals/MoonpayModal.vue');
const MoonpaySellInfoModal = () =>
    import(/* webpackChunkName: "moonpay-modal" */ './components/modals/MoonpaySellInfoModal.vue');
const SimplexModal = () =>
    import(/* webpackChunkName: "simplex-modal" */ './components/modals/SimplexModal.vue');

// Staking Modals
const StakingModal = () =>
    import(/* webpackChunkName: "staking-modal" */ './components/staking/StakingModal.vue');
const ValidatorDetailsModal = () =>
    import(/* webpackChunkName: "validator-details-modal" */ './components/staking/ValidatorDetailsModal.vue');

Vue.use(VueRouter);

export enum Columns {
    DYNAMIC,
    ACCOUNT,
    ADDRESS,
}

export enum RouteName {
    Root = 'root',
    Transactions = 'transactions',
    RootAccounts = 'root-accounts',
    Send = 'send',
    SendNim = 'send-nim',
    SendBtc = 'send-btc',
    SendUsdc = 'send-usdc',
    Receive = 'receive',
    ReceiveNim = 'receive-nim',
    ReceiveBtc = 'receive-btc',
    ReceiveUsdc = 'receive-usdc',
    Transaction = 'transaction',
    Trade = 'trade',
    Buy = 'buy',
    BuyCrypto = 'buy-crypto',
    SellCrypto = 'sell-crypto',
    Scan = 'scan',
    SendViaUri = 'send-via-uri',
    Welcome = 'welcome',
    WelcomeStaking = 'welcome-staking',
    MigrationWelcome = 'migration-welcome',
    BtcActivation = 'btc-activation',
    BtcTransaction = 'btc-transaction',
    SendViaBtcUri = 'send-via-btc-uri',
    UsdcActivation = 'usdc-activation',
    UsdcTransaction = 'usdc-transaction',
    UsdtTransaction = 'usdt-transaction',
    SendViaPolygonUri = 'send-via-polygon-uri',
    UsdtAdded = 'usdt-added',
    StablecoinSelection = 'stablecoin-selection',
    Swap = 'swap',
    MoonpaySellInfo = 'moonpay-sell-info',
    Moonpay = 'moonpay',
    Simplex = 'simplex',
    RootReleaseNotes = 'root-release-notes',
    ExportHistory = 'export-history',
    Staking = 'staking',
    ValidatorDetails = 'validator-details',
    WalletStatus = 'wallet-status',
    Settings = 'settings',
    SettingsAccounts = 'settings-accounts',
    Disclaimer = 'disclaimer',
    SettingsReleaseNotes = 'settings-release-notes',
    Network = 'network',
    NetworkAccounts = 'network-accounts',
    NetworkReleaseNotes = 'network-release-notes',
    StakingRewards = 'staking-rewards',
}

const routes: RouteConfig[] = [{
    path: '/',
    name: RouteName.Root,
    components: {
        groundfloor: Groundfloor,
    },
    children: [{
        path: '',
        components: {
            accountOverview: AccountOverview,
            addressOverview: AddressOverview,
        },
        name: RouteName.Root,
        alias: '/transactions',
        meta: { column: Columns.DYNAMIC },
        children: [{
            path: '/accounts',
            components: {
                modal: AccountMenuModal,
            },
            name: RouteName.RootAccounts,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send',
            components: {
                modal: AddressSelectorModal,
            },
            name: RouteName.Send,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/nim',
            components: {
                modal: SendModal,
            },
            name: RouteName.SendNim,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/btc',
            components: {
                modal: BtcSendModal,
            },
            name: RouteName.SendBtc,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/usdc',
            alias: '/send/usdt',
            components: {
                modal: StablecoinSendModal,
            },
            name: RouteName.SendUsdc,
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive',
            components: {
                modal: AddressSelectorModal,
            },
            name: RouteName.Receive,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/nim',
            components: {
                modal: ReceiveModal,
            },
            name: RouteName.ReceiveNim,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/btc',
            components: {
                modal: BtcReceiveModal,
            },
            name: RouteName.ReceiveBtc,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/usdc',
            alias: '/receive/usdt',
            components: {
                modal: StablecoinReceiveModal,
            },
            name: RouteName.ReceiveUsdc,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/transaction/:hash',
            components: {
                modal: TransactionModal,
            },
            name: RouteName.Transaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/trade',
            components: {
                modal: TradeModal,
            },
            name: RouteName.Trade,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/buy',
            components: {
                modal: BuyOptionsModal,
            },
            name: RouteName.Buy,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/buy-crypto',
            components: {
                modal: BuyCryptoModal,
            },
            name: RouteName.BuyCrypto,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/sell-crypto',
            components: {
                modal: SellCryptoModal,
            },
            name: RouteName.SellCrypto,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/scan',
            components: {
                modal: ScanQrModal,
            },
            name: RouteName.Scan,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/:requestUri(nimiq:.+)',
            components: {
                modal: SendModal,
            },
            name: RouteName.SendViaUri,
            props: {
                // Pass full path including query parameters.
                modal: (route: Route) => ({ requestUri: route.fullPath.substring(1) }),
            },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/welcome',
            components: {
                modal: WelcomeModal,
            },
            name: RouteName.Welcome,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/welcome-staking',
            components: {
                modal: WelcomeStakingModal,
            },
            name: RouteName.WelcomeStaking,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/migration-welcome',
            components: {
                modal: MigrationWelcomeModal,
            },
            name: RouteName.MigrationWelcome,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/btc-activation',
            components: {
                modal: BtcActivationModal,
            },
            name: RouteName.BtcActivation,
            props: {
                modal: parseActivationRedirect,
            },
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/btc-transaction/:hash',
            components: {
                modal: BtcTransactionModal,
            },
            name: RouteName.BtcTransaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/:requestUri(bitcoin:.+)',
            components: {
                modal: BtcSendModal,
            },
            name: RouteName.SendViaBtcUri,
            props: {
                // Pass full path including query parameters.
                modal: (route: Route) => ({ requestUri: route.fullPath.substring(1) }),
            },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/usdc-activation',
            alias: '/usdt-activation',
            components: {
                modal: PolygonActivationModal,
            },
            name: RouteName.UsdcActivation,
            props: {
                modal: parseActivationRedirect,
            },
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/usdc-transaction/:hash',
            components: {
                modal: UsdcTransactionModal,
            },
            name: RouteName.UsdcTransaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/usdt-transaction/:hash',
            components: {
                modal: UsdtTransactionModal,
            },
            name: RouteName.UsdtTransaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            // Match complete pathname with all segments, which is important for polygon request links with contract
            // functions as the contract function name is a separate path segment, e.g. /transfer.
            path: '/:requestUri(polygon:.+)',
            components: {
                modal: StablecoinSendModal,
            },
            name: RouteName.SendViaPolygonUri,
            props: {
                // Pass full path including query parameters.
                modal: (route: Route) => ({ requestUri: route.fullPath.substring(1) }),
            },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/usdt-added',
            components: {
                modal: UsdtAddedModal,
            },
            name: RouteName.UsdtAdded,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/stablecoin-selection',
            components: {
                modal: StablecoinSelectionModal,
            },
            name: RouteName.StablecoinSelection,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/swap/:pair?',
            components: {
                modal: SwapModal,
            },
            name: RouteName.Swap,
            props: { modal: true },
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/moonpay-sell-info',
            components: {
                modal: MoonpaySellInfoModal,
            },
            name: RouteName.MoonpaySellInfo,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/moonpay',
            components: {
                modal: MoonpayModal,
            },
            name: RouteName.Moonpay,
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/simplex',
            components: {
                'persistent-modal': SimplexModal,
            },
            name: RouteName.Simplex,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal,
            },
            name: RouteName.RootReleaseNotes,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/export-history/:type',
            components: {
                modal: HistoryExportModal,
            },
            name: RouteName.ExportHistory,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/staking',
            components: {
                modal: StakingModal,
            },
            name: RouteName.Staking,
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/validator-details',
            components: {
                modal: ValidatorDetailsModal,
            },
            name: RouteName.ValidatorDetails,
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/staking-rewards/:month?',
            components: {
                modal: StakingModal,
            },
            name: RouteName.StakingRewards,
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/wallet-status',
            components: {
                modal: WalletStatusModal,
            },
            name: RouteName.WalletStatus,
            meta: { column: Columns.DYNAMIC },
        }],
        beforeEnter: (to, from, next) => {
            if (from.fullPath === '/' && to.hash.startsWith('#_request/')) {
                const parsed = parseNimiqSafeRequestLink(window.location.href);
                if (!parsed) return next();
                const path = createNimiqRequestLink(parsed.recipient, {
                    ...parsed,
                    type: NimiqRequestLinkType.URI,
                });
                return next({ path, replace: true });
            }
            return next();
        },
    }, {
        path: '/settings',
        components: {
            settings: SettingsLayout,
        },
        name: RouteName.Settings,
        meta: { column: Columns.ACCOUNT },
        children: [{
            path: '/accounts',
            components: {
                modal: AccountMenuModal,
            },
            name: RouteName.SettingsAccounts,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/disclaimer',
            components: {
                modal: DisclaimerModal,
            },
            name: RouteName.Disclaimer,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal,
            },
            name: RouteName.SettingsReleaseNotes,
            meta: { column: Columns.DYNAMIC },
        }],
    }],
}, {
    path: '/network',
    components: {
        basement: NetworkLayout,
    },
    name: RouteName.Network,
    meta: { column: Columns.ACCOUNT },
    children: [{
        path: '/accounts',
        components: {
            modal: AccountMenuModal,
        },
        name: RouteName.NetworkAccounts,
        meta: { column: Columns.DYNAMIC },
    }, {
        path: '/release-notes',
        components: {
            modal: ReleaseNotesModal,
        },
        name: RouteName.NetworkReleaseNotes,
        meta: { column: Columns.DYNAMIC },
    }],
}];

// If wallet was opened on a path other than root route, for example on a modal, inject a root history entry before the
// actually requested route, such that a back navigation gets the user to the main wallet view, instead of leaving the
// wallet. This is especially for mobile, where hitting the back button to close a modal and open the main view feels
// more natural, like in a native app, and is also needed in general for modals to be closable by simple back navigation
// in modal.forceClose. Unfortunately though, in newer Chrome versions, hitting the back button skips history entries
// that have been inserted automatically without user interaction, see https://github.com/whatwg/html/issues/7832 and
// https://groups.google.com/a/chromium.org/g/blink-dev/c/T8d4_BRb2xQ/m/WSdOiOFcBAAJ. However, Interacting with the page
// _after_ the injection is also fine for activating the back button for the injected entry and programmatic back
// navigation via history.back also continues to work.
// We use the native history methods instead of the router and do the injection before initializing the router to avoid
// interference with the router's navigation guards which might also want to redirect the route, and to avoid having to
// wait for the router to initialize with the first view which only happens after the vue app is created in main.ts, for
// example by waiting for router.onReady, which also waits for the initial view's components to be loaded.
// If there's already a history state it means that the current history entry was already handled by our injection below
// or by the router (which adds a history state to all routes) and the page was simply reloaded, such that we don't need
// to run the injection logic again.
const initialUrl = window.location.href;
if (!window.history.state) {
    // Only return to the initial url if it's not on the root route, i.e. if another view or modal is supposed to be
    // opened. If it is on the root route, we don't add a second history entry for the root route, we do however close
    // the sidebar, if it's open, by stripping the sidebar parameter, and keep it closed.
    const shouldReturnToInitialUrl = new URL(initialUrl).pathname !== process.env.BASE_URL;
    const rootUrl = new URL(initialUrl);
    rootUrl.pathname = process.env.BASE_URL!;
    if (shouldReturnToInitialUrl) {
        // Can clear params and hash entirely as they're preserved in the initialUrl.
        rootUrl.search = '';
        rootUrl.hash = '';
    } else {
        // Only remove sidebar; preserve other search params and hash, especially rpc responses.
        rootUrl.searchParams.delete('sidebar');
    }

    window.history.replaceState({ injected: true }, '', rootUrl); // inject history entry for root route
    if (shouldReturnToInitialUrl) {
        window.history.pushState({ injected: true }, '', initialUrl);
    }
}

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes,
});

// Offer to activate Bitcoin or USDC if a route requires it, but it's not activated yet
function createActivationNavigationGuard(
    currency: CryptoCurrency.BTC | CryptoCurrency.USDC | CryptoCurrency.USDT,
    viewsRequiringActivation: Set<Component>,
    // As method instead of just passing AccountType[] of supported types because AccountType is not available for
    // passing in the top level yet due to a webpack bug (https://github.com/webpack/webpack/issues/3509).
    isAccountTypeSupported: (type: AccountType) => boolean,
    isCurrencyActivated: () => boolean,
) {
    return (to: Route, from: Route, next: NavigationGuardNext) => {
        const requiresCurrencyActivation = to.matched.some(({ components }) =>
            Object.values(components).some((view) => viewsRequiringActivation.has(view)
                || (view === SwapModal && !!to.params.pair?.includes(currency.toUpperCase()))));
        const { activeAccountInfo: { value: activeAccount } } = useAccountStore();
        const isUnsupportedAccount = !!activeAccount && !isAccountTypeSupported(activeAccount.type);
        const isUnsupportedActivation = to.name === `${currency}-activation` && isUnsupportedAccount;
        if ((!requiresCurrencyActivation && !isUnsupportedActivation) || isCurrencyActivated() || !activeAccount) {
            // Can continue to the requested view, or is not logged-in into any account yet, in which case we want to
            // preserve the original route to be redirected back to after login.
            next();
        } else if (isUnsupportedAccount) {
            // unsupported account; go to main view
            next({
                name: 'root',
                replace: true,
            });
        } else {
            // open currency activation modal; store original target route in hash
            next({
                name: `${currency}-activation`,
                // Path including query and hash, but not origin. Encoded because the hash is parsed as URLSearchParams
                // in parseActivationRedirect and also by the RPC api in case that the Hub activation request is
                // executed as redirect.
                hash: `#redirect=${encodeURIComponent(to.fullPath)}`,
                replace: true,
            });
        }
    };
}
router.beforeEach(createActivationNavigationGuard(
    CryptoCurrency.BTC,
    new Set([BtcSendModal, BtcReceiveModal]),
    (accountType: AccountType) => [AccountType.BIP39, AccountType.LEDGER].includes(accountType),
    () => useAccountStore().hasBitcoinAddresses.value,
));
router.beforeEach(createActivationNavigationGuard(
    CryptoCurrency.USDC,
    new Set([StablecoinSendModal, StablecoinReceiveModal]),
    (accountType: AccountType) => [AccountType.BIP39].includes(accountType),
    () => useAccountStore().hasPolygonAddresses.value,
));
router.beforeEach(createActivationNavigationGuard(
    CryptoCurrency.USDT,
    new Set([StablecoinSendModal, StablecoinReceiveModal]),
    (accountType: AccountType) => [AccountType.BIP39].includes(accountType),
    () => useAccountStore().hasPolygonAddresses.value,
));

function parseActivationRedirect(route: Route) {
    // check for a redirect set by the activation navigation guard
    let redirect: string | undefined;
    try {
        const hashParams = new URLSearchParams(route.hash.substring(1));
        redirect = decodeURIComponent(hashParams.get('redirect') || '') || undefined;
    } catch (e) {} // eslint-disable-line no-empty
    return { redirect };
}

export default router;

const RouterSymbol = Symbol('router');

export function provideRouter(providedRouter: VueRouter) {
    provide(RouterSymbol, providedRouter);
}

export function useRouter(): VueRouter {
    const injectedRouter = inject(RouterSymbol) as VueRouter;
    if (!injectedRouter) throw new Error('Router was not provided.');
    return injectedRouter;
}

import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized as Route } from 'vue-router';
import { createNimiqRequestLink, parseNimiqSafeRequestLink, NimiqRequestLinkType } from '@nimiq/utils';
import type { Component, DefineComponent, ComponentPublicInstance } from 'vue';
import { provide, inject } from 'vue';

// Start views
import Groundfloor from './components/layouts/Groundfloor.vue';
import AccountOverview from './components/layouts/AccountOverview.vue';
import AddressOverview from './components/layouts/AddressOverview.vue';

import { AccountType, useAccountStore } from './stores/Account';
import { CryptoCurrency } from './lib/Constants';

type AsyncComponent = () => Promise<{ default: DefineComponent<{}, {}, any> }>;

// Main views
const SettingsLayout: AsyncComponent = () => import(/* webpackChunkName: "settings" */ './components/layouts/Settings.vue');
const NetworkLayout: AsyncComponent = () =>
    import(/* webpackChunkName: "network" */ './components/layouts/Network.vue');

// Modals
const AccountMenuModal: AsyncComponent = () =>
    import(/* webpackChunkName: "account-menu-modal" */ './components/modals/AccountMenuModal.vue');
const SendModal: AsyncComponent = () => import(/* webpackChunkName: "send-modal" */ './components/modals/SendModal.vue');
const ReceiveModal: AsyncComponent = () => import(/* webpackChunkName: "receive-modal" */ './components/modals/ReceiveModal.vue');
const AddressSelectorModal: AsyncComponent = () =>
    import(/* webpackChunkName: "address-selector-modal" */ './components/modals/AddressSelectorModal.vue');
const TransactionModal: AsyncComponent = () =>
    import(/* webpackChunkName: "transaction-modal" */ './components/modals/TransactionModal.vue');
const TradeModal: AsyncComponent = () => import(/* webpackChunkName: "trade-modal" */ './components/modals/TradeModal.vue');
const BuyOptionsModal: AsyncComponent = () =>
    import(/* webpackChunkName: "buy-options-modal" */ './components/modals/BuyOptionsModal.vue');
const ScanQrModal: AsyncComponent = () => import(/* webpackChunkName: "scan-qr-modal" */ './components/modals/ScanQrModal.vue');
const WelcomeModal: AsyncComponent = () =>
    import(/* webpackChunkName: "welcome-modal" */ './components/modals/WelcomeModal.vue');
const WelcomeStakingModal: AsyncComponent = () =>
    import(/* webpackChunkName: "welcome-staking-modal" */ './components/staking/WelcomeStakingModal.vue');
const MigrationWelcomeModal: AsyncComponent = () =>
    import(/* webpackChunkName: "migration-welcome-modal" */ './components/modals/MigrationWelcomeModal.vue');
const DisclaimerModal: AsyncComponent = () =>
    import(/* webpackChunkName: "disclaimer-modal" */ './components/modals/DisclaimerModal.vue');
const ReleaseNotesModal: AsyncComponent = () =>
    import(/* webpackChunkName: "release-notes-modal" */ './components/modals/ReleaseNotesModal.vue');
const HistoryExportModal: AsyncComponent = () =>
    import(/* webpackChunkName: "history-export-modal" */ './components/modals/HistoryExportModal.vue');
const StablecoinSelectionModal: AsyncComponent = () =>
    import(/* webpackChunkName: "history-export-modal" */ './components/modals/StablecoinSelectionModal.vue');
const WalletStatusModal: AsyncComponent = () =>
    import(/* webpackChunkName: "wallet-status-modal" */ './components/modals/WalletStatusModal.vue');

// Bitcoin Modals
const BtcActivationModal: AsyncComponent = () =>
    import(/* webpackChunkName: "btc-activation-modal" */ './components/modals/BtcActivationModal.vue');
const BtcSendModal: AsyncComponent = () => import(/* webpackChunkName: "btc-send-modal" */ './components/modals/BtcSendModal.vue');
const BtcReceiveModal: AsyncComponent = () =>
    import(/* webpackChunkName: "btc-receive-modal" */ './components/modals/BtcReceiveModal.vue');
const BtcTransactionModal: AsyncComponent = () =>
    import(/* webpackChunkName: "btc-transaction-modal" */ './components/modals/BtcTransactionModal.vue');

// Stablecoin Modals
const PolygonActivationModal: AsyncComponent = () =>
    import(/* webpackChunkName: "polygon-activation-modal" */ './components/modals/PolygonActivationModal.vue');
const StablecoinSendModal: AsyncComponent = () =>
    import(/* webpackChunkName: "stablecoin-send-modal" */ './components/modals/StablecoinSendModal.vue');
const StablecoinReceiveModal: AsyncComponent = () =>
    import(/* webpackChunkName: "stablecoin-receive-modal" */ './components/modals/StablecoinReceiveModal.vue');
const UsdcTransactionModal: AsyncComponent = () =>
    import(/* webpackChunkName: "usdc-transaction-modal" */ './components/modals/UsdcTransactionModal.vue');
const UsdtTransactionModal: AsyncComponent = () =>
    import(/* webpackChunkName: "usdt-transaction-modal" */ './components/modals/UsdtTransactionModal.vue');
const UsdtAddedModal: AsyncComponent = () =>
    import(/* webpackChunkName: "usdt-added-modal" */ './components/modals/UsdtAddedModal.vue');

// Swap Modals
const SwapModal: AsyncComponent = () => import(/* webpackChunkName: "swap-modal" */ './components/swap/SwapModal.vue');
const BuyCryptoModal: AsyncComponent = () =>
    import(/* webpackChunkName: "buy-crypto-modal" */ './components/modals/BuyCryptoModal.vue');
const SellCryptoModal: AsyncComponent = () =>
    import(/* webpackChunkName: "sell-crypto-modal" */ './components/modals/SellCryptoModal.vue');

const MoonpayModal: AsyncComponent = () =>
    import(/* webpackChunkName: "moonpay-modal" */ './components/modals/MoonpayModal.vue');
const MoonpaySellInfoModal: AsyncComponent = () =>
    import(/* webpackChunkName: "moonpay-modal" */ './components/modals/MoonpaySellInfoModal.vue');
const SimplexModal: AsyncComponent = () =>
    import(/* webpackChunkName: "simplex-modal" */ './components/modals/SimplexModal.vue');

// Staking Modals
const StakingModal: AsyncComponent = () =>
    import(/* webpackChunkName: "staking-modal" */ './components/staking/StakingModal.vue');

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
    WalletStatus = 'wallet-status',
    Settings = 'settings',
    SettingsAccounts = 'settings-accounts',
    Disclaimer = 'disclaimer',
    SettingsReleaseNotes = 'settings-release-notes',
    Network = 'network',
    NetworkAccounts = 'network-accounts',
    NetworkReleaseNotes = 'network-release-notes',
}

const routes: RouteRecordRaw[] = [{
    path: '/',
    name: RouteName.Root,
    components: {
        groundfloor: Groundfloor as DefineComponent,
    },
    children: [{
        path: '',
        components: {
            accountOverview: AccountOverview as DefineComponent,
            addressOverview: AddressOverview as DefineComponent,
        },
        name: RouteName.Root,
        alias: '/transactions',
        meta: { column: Columns.DYNAMIC },
        children: [{
            path: '/accounts',
            components: {
                modal: AccountMenuModal as unknown as DefineComponent,
            },
            name: RouteName.RootAccounts,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send',
            components: {
                modal: AddressSelectorModal as unknown as DefineComponent,
            },
            name: RouteName.Send,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/nim',
            components: {
                modal: SendModal as unknown as DefineComponent,
            },
            name: RouteName.SendNim,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/btc',
            components: {
                modal: BtcSendModal as unknown as DefineComponent,
            },
            name: RouteName.SendBtc,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/usdc',
            alias: '/send/usdt',
            components: {
                modal: StablecoinSendModal as unknown as DefineComponent,
            },
            name: RouteName.SendUsdc,
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive',
            components: {
                modal: AddressSelectorModal as unknown as DefineComponent,
            },
            name: RouteName.Receive,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/nim',
            components: {
                modal: ReceiveModal as unknown as DefineComponent,
            },
            name: RouteName.ReceiveNim,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/btc',
            components: {
                modal: BtcReceiveModal as unknown as DefineComponent,
            },
            name: RouteName.ReceiveBtc,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/usdc',
            alias: '/receive/usdt',
            components: {
                modal: StablecoinReceiveModal as unknown as DefineComponent,
            },
            name: RouteName.ReceiveUsdc,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/transaction/:hash',
            components: {
                modal: TransactionModal as unknown as DefineComponent,
            },
            name: RouteName.Transaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/trade',
            components: {
                modal: TradeModal as unknown as DefineComponent,
            },
            name: RouteName.Trade,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/buy',
            components: {
                modal: BuyOptionsModal as unknown as DefineComponent,
            },
            name: RouteName.Buy,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/buy-crypto',
            components: {
                modal: BuyCryptoModal as unknown as DefineComponent,
            },
            name: RouteName.BuyCrypto,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/sell-crypto',
            components: {
                modal: SellCryptoModal as unknown as DefineComponent,
            },
            name: RouteName.SellCrypto,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/scan',
            components: {
                modal: ScanQrModal as unknown as DefineComponent,
            },
            name: RouteName.Scan,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send-via-uri',
            components: {
                modal: SendModal as unknown as DefineComponent,
            },
            name: RouteName.SendViaUri,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/welcome',
            components: {
                modal: WelcomeModal as unknown as DefineComponent,
            },
            name: RouteName.Welcome,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/welcome-staking',
            components: {
                modal: WelcomeStakingModal as unknown as DefineComponent,
            },
            name: RouteName.WelcomeStaking,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/migration-welcome',
            components: {
                modal: MigrationWelcomeModal as unknown as DefineComponent,
            },
            name: RouteName.MigrationWelcome,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/btc-activation',
            components: {
                modal: BtcActivationModal as unknown as DefineComponent,
            },
            name: RouteName.BtcActivation,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/btc-transaction/:hash',
            components: {
                modal: BtcTransactionModal as unknown as DefineComponent,
            },
            name: RouteName.BtcTransaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/send-via-btc-uri',
            components: {
                modal: BtcSendModal as unknown as DefineComponent,
            },
            name: RouteName.SendViaBtcUri,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/usdc-activation',
            components: {
                modal: PolygonActivationModal as unknown as DefineComponent,
            },
            name: RouteName.UsdcActivation,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/usdc-transaction/:hash',
            components: {
                modal: UsdcTransactionModal as unknown as DefineComponent,
            },
            name: RouteName.UsdcTransaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/usdt-transaction/:hash',
            components: {
                modal: UsdtTransactionModal as unknown as DefineComponent,
            },
            name: RouteName.UsdtTransaction,
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/send-via-polygon-uri',
            components: {
                modal: StablecoinSendModal as unknown as DefineComponent,
            },
            name: RouteName.SendViaPolygonUri,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/usdt-added',
            components: {
                modal: UsdtAddedModal as unknown as DefineComponent,
            },
            name: RouteName.UsdtAdded,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/stablecoin-selection',
            components: {
                modal: StablecoinSelectionModal as unknown as DefineComponent,
            },
            name: RouteName.StablecoinSelection,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/swap',
            components: {
                modal: SwapModal as unknown as DefineComponent,
            },
            name: RouteName.Swap,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/moonpay-sell-info',
            components: {
                modal: MoonpaySellInfoModal as unknown as DefineComponent,
            },
            name: RouteName.MoonpaySellInfo,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/moonpay',
            components: {
                modal: MoonpayModal as unknown as DefineComponent,
            },
            name: RouteName.Moonpay,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/simplex',
            components: {
                modal: SimplexModal as unknown as DefineComponent,
            },
            name: RouteName.Simplex,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal as unknown as DefineComponent,
            },
            name: RouteName.RootReleaseNotes,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/export-history',
            components: {
                modal: HistoryExportModal as unknown as DefineComponent,
            },
            name: RouteName.ExportHistory,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/staking',
            components: {
                modal: StakingModal as unknown as DefineComponent,
            },
            name: RouteName.Staking,
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/wallet-status',
            components: {
                modal: WalletStatusModal as unknown as DefineComponent,
            },
            name: RouteName.WalletStatus,
            meta: { column: Columns.DYNAMIC },
        }],
    }, {
        path: '/settings',
        components: {
            settings: SettingsLayout as unknown as DefineComponent,
        },
        name: RouteName.Settings,
        meta: { column: Columns.ACCOUNT },
        children: [{
            path: '',
            components: {
                modal: AccountMenuModal as unknown as DefineComponent,
            },
            name: RouteName.SettingsAccounts,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/disclaimer',
            components: {
                modal: DisclaimerModal as unknown as DefineComponent,
            },
            name: RouteName.Disclaimer,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal as unknown as DefineComponent,
            },
            name: RouteName.SettingsReleaseNotes,
            meta: { column: Columns.ACCOUNT },
        }],
    }, {
        path: '/network',
        components: {
            network: NetworkLayout as unknown as DefineComponent,
        },
        name: RouteName.Network,
        meta: { column: Columns.ACCOUNT },
        children: [{
            path: '',
            components: {
                modal: AccountMenuModal as unknown as DefineComponent,
            },
            name: RouteName.NetworkAccounts,
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal as unknown as DefineComponent,
            },
            name: RouteName.NetworkReleaseNotes,
            meta: { column: Columns.ACCOUNT },
        }],
    }],
}];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

function createActivationNavigationGuard(
    currency: CryptoCurrency.BTC | CryptoCurrency.USDC | CryptoCurrency.USDT,
    viewsRequiringActivation: Set<() => Promise<{ default: DefineComponent }>>,
    isAccountTypeSupported: (type: AccountType) => boolean,
    isCurrencyActivated: () => boolean,
) {
    return (to: Route, from: Route, next: NavigationGuardNext) => {
        const requiresCurrencyActivation = to.matched.some(({ components }) =>
            Object.values(components || {}).some((view) => viewsRequiringActivation.has(view as any)
                || (view === SwapModal && !!to.params.pair?.includes(currency.toUpperCase()))));
        const { state: { activeAccountInfo } } = useAccountStore();
        const isUnsupportedAccount = !!activeAccountInfo && !isAccountTypeSupported(activeAccountInfo.type);
        const isUnsupportedActivation = to.name === `${currency}-activation` && isUnsupportedAccount;
        if ((!requiresCurrencyActivation && !isUnsupportedActivation) || isCurrencyActivated() || !activeAccountInfo) {
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
                name: `${currency.toLowerCase()}-activation`,
                // Path including query and hash, but not origin. Encoded because the hash is parsed as URLSearchParams
                // in parseActivationRedirect and also by the RPC api in case that the Hub activation request is
                // executed as redirect.
                hash: `#redirect=${encodeURIComponent(to.fullPath)}`,
                replace: true,
            });
        }
    };
}

function parseActivationRedirect(route: Route) {
    const hash = route.hash;
    if (!hash) return null;
    const match = hash.match(/#redirect=(.+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
}

export function provideRouter(providedRouter: typeof router) {
    provide('router', providedRouter);
}

export function useRouter(): typeof router {
    return inject('router') as typeof router;
}

export default router;

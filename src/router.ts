import VueRouter, { RouteConfig, Route } from 'vue-router';
import Vue from 'vue';

import { provide, inject } from '@vue/composition-api';

// Start views
import Groundfloor from './components/layouts/Groundfloor.vue';
import AccountOverview from './components/layouts/AccountOverview.vue';
import AddressOverview from './components/layouts/AddressOverview.vue';

// Main views
const Settings = () => import(/* webpackChunkName: "settings" */ './components/layouts/Settings.vue');
const Network = () =>
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
const MigrationWelcomeModal = () =>
    import(/* webpackChunkName: "migration-welcome-modal" */ './components/modals/MigrationWelcomeModal.vue');
const DisclaimerModal = () =>
    import(/* webpackChunkName: "disclaimer-modal" */ './components/modals/DisclaimerModal.vue');
const ReleaseNotesModal = () =>
    import(/* webpackChunkName: "release-notes-modal" */ './components/modals/ReleaseNotesModal.vue');

// Bitcoin Modals
const BtcActivationModal = () =>
    import(/* webpackChunkName: "btc-activation-modal" */ './components/modals/BtcActivationModal.vue');
const BtcSendModal = () =>
    import(/* webpackChunkName: "btc-send-modal" */ './components/modals/BtcSendModal.vue');
const BtcReceiveModal = () =>
    import(/* webpackChunkName: "btc-receive-modal" */ './components/modals/BtcReceiveModal.vue');
const BtcTransactionModal = () =>
    import(/* webpackChunkName: "btc-transaction-modal" */ './components/modals/BtcTransactionModal.vue');

// Swap Modals
const SwapModal = () => import(/* webpackChunkName: "swap-modal" */ './components/swap/SwapModal.vue');
const BuyCryptoModal = () =>
    import(/* webpackChunkName: "buy-crypto-modal" */ './components/modals/BuyCryptoModal.vue');
const SellCryptoModal = () =>
    import(/* webpackChunkName: "sell-crypto-modal" */ './components/modals/SellCryptoModal.vue');

const MoonpayModal = () =>
    import(/* webpackChunkName: "moonpay-modal" */ './components/modals/MoonpayModal.vue');
const SimplexModal = () =>
    import(/* webpackChunkName: "simplex-modal" */ './components/modals/SimplexModal.vue');

// Staking Modals
const StakingModal = () =>
    import(/* webpackChunkName: "staking-modal" */ './components/staking/StakingModal.vue');

Vue.use(VueRouter);

export enum Columns {
    DYNAMIC,
    ACCOUNT,
    ADDRESS,
}

const routes: RouteConfig[] = [{
    path: '/',
    components: {
        groundfloor: Groundfloor,
    },
    children: [{
        path: '',
        components: {
            accountOverview: AccountOverview,
            addressOverview: AddressOverview,
        },
        name: 'root',
        alias: '/transactions',
        meta: { column: Columns.DYNAMIC },
        children: [{
            path: '/accounts',
            components: {
                modal: AccountMenuModal,
            },
            name: 'root-accounts',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send',
            components: {
                modal: AddressSelectorModal,
            },
            name: 'send',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/nim',
            components: {
                modal: SendModal,
            },
            name: 'send-nim',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/send/btc',
            components: {
                modal: BtcSendModal,
            },
            name: 'send-btc',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive',
            components: {
                modal: AddressSelectorModal,
            },
            name: 'receive',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/nim',
            components: {
                modal: ReceiveModal,
            },
            name: 'receive-nim',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/receive/btc',
            components: {
                modal: BtcReceiveModal,
            },
            name: 'receive-btc',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/transaction/:hash',
            components: {
                modal: TransactionModal,
            },
            name: 'transaction',
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/trade',
            components: {
                modal: TradeModal,
            },
            name: 'trade',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/buy',
            components: {
                modal: BuyOptionsModal,
            },
            name: 'buy',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/buy-crypto',
            components: {
                modal: BuyCryptoModal,
            },
            name: 'buy-crypto',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/sell-crypto',
            components: {
                modal: SellCryptoModal,
            },
            name: 'sell-crypto',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/scan',
            components: {
                modal: ScanQrModal,
            },
            name: 'scan',
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/nimiq\\::requestUri',
            components: {
                modal: SendModal,
            },
            name: 'send-via-uri',
            props: {
                modal: (route: Route) => ({ requestUri: route.fullPath.substr(1) }),
            },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/welcome',
            components: {
                modal: WelcomeModal,
            },
            name: 'welcome',
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/migration-welcome',
            components: {
                modal: MigrationWelcomeModal,
            },
            name: 'migration-welcome',
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/btc-activation/:isActivated?',
            components: {
                modal: BtcActivationModal,
            },
            name: 'btc-activation',
            props: { modal: true },
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/btc-transaction/:hash',
            components: {
                modal: BtcTransactionModal,
            },
            name: 'btc-transaction',
            props: { modal: true },
            meta: { column: Columns.ADDRESS },
        }, {
            path: '/bitcoin\\::requestUri',
            components: {
                modal: BtcSendModal,
            },
            name: 'send-via-btc-uri',
            props: {
                modal: (route: Route) => ({ requestUri: route.fullPath.substr(1) }),
            },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/swap',
            components: {
                modal: SwapModal,
            },
            name: 'swap',
            props: { modal: true },
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/moonpay',
            components: {
                modal: MoonpayModal,
            },
            name: 'moonpay',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/simplex',
            components: {
                'persistent-modal': SimplexModal,
            },
            name: 'simplex',
            // props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal,
            },
            name: 'root-release-notes',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/staking',
            components: {
                modal: StakingModal,
            },
            name: 'staking',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }],
    }, {
        path: '/settings',
        components: {
            settings: Settings,
        },
        name: 'settings',
        meta: { column: Columns.ACCOUNT },
        children: [{
            path: '/accounts',
            components: {
                modal: AccountMenuModal,
            },
            name: 'settings-accounts',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }, {
            path: '/disclaimer',
            components: {
                modal: DisclaimerModal,
            },
            name: 'disclaimer',
            meta: { column: Columns.ACCOUNT },
        }, {
            path: '/release-notes',
            components: {
                modal: ReleaseNotesModal,
            },
            name: 'settings-release-notes',
            props: { modal: true },
            meta: { column: Columns.DYNAMIC },
        }],
    }],
}, {
    path: '/network',
    components: {
        basement: Network,
    },
    name: 'network',
    meta: { column: Columns.ACCOUNT },
    children: [{
        path: '/accounts',
        components: {
            modal: AccountMenuModal,
        },
        name: 'network-accounts',
        props: { modal: true },
        meta: { column: Columns.DYNAMIC },
    }, {
        path: '/release-notes',
        components: {
            modal: ReleaseNotesModal,
        },
        name: 'network-release-notes',
        props: { modal: true },
        meta: { column: Columns.DYNAMIC },
    }],
}];

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes,
});

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

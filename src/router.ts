import VueRouter, { RouteConfig } from 'vue-router';
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
const SendModal = () => import(/* webpackChunkName: "send-modal" */ './components/modals/SendModal.vue');
const ReceiveModal = () => import(/* webpackChunkName: "receive-modal" */ './components/modals/ReceiveModal.vue');
const TransactionModal = () =>
    import(/* webpackChunkName: "transaction-modal" */ './components/modals/TransactionModal.vue');
const TradeModal = () => import(/* webpackChunkName: "trade-modal" */ './components/modals/TradeModal.vue');
const ScanQrModal = () => import(/* webpackChunkName: "scan-qr-modal" */ './components/modals/ScanQrModal.vue');
const AddressModal = () =>
    import(/* webpackChunkName: "address-modal" */ './components/modals/AddressModal.vue');

Vue.use(VueRouter);

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
        children: [{
            path: '/send/:senderAddress',
            components: {
                modal: SendModal,
            },
            name: 'send',
            props: true,
        }, {
            path: '/receive',
            components: {
                modal: ReceiveModal,
            },
            name: 'receive',
        }, {
            path: '/transaction/:hash',
            components: {
                modal: TransactionModal,
            },
            name: 'transaction',
            props: true,
        }, {
            path: '/trade',
            components: {
                modal: TradeModal,
            },
            name: 'trade',
            props: true,
        }, {
            path: '/scan',
            components: {
                modal: ScanQrModal,
            },
            name: 'scan',
        }, {
            path: '/address/:address',
            components: {
                modal: AddressModal,
            },
            name: 'address',
            props: true,
        }, {
            path: '/nimiq\\::requestUri',
            components: {
                modal: SendModal,
            },
            name: 'send-via-uri',
            props: (route) => ({ requestUri: route.fullPath.substr(1) }),
        }],
    }, {
        path: '/settings',
        components: {
            settings: Settings,
        },
        name: 'settings',
    }],
}, {
    path: '/network',
    components: {
        basement: Network,
    },
    name: 'network',
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

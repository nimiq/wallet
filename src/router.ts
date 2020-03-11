import VueRouter, { RouteConfig } from 'vue-router';
import Vue from 'vue';

import { provide, inject } from '@vue/composition-api';

import AccountOverview from './components/layouts/AccountOverview.vue';
import AddressOverview from './components/layouts/AddressOverview.vue';

Vue.use(VueRouter);

const routes: RouteConfig[] = [];

routes.push({
    path: '/',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
    },
    name: 'root',
});

const SendModal = () => import(/* webpackChunkName: "send-modal" */ './components/modals/SendModal.vue');
routes.push({
    path: '/send/:senderAddress',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: SendModal,
    },
    name: 'send',
    props: true,
});

const ReceiveModal = () => import(/* webpackChunkName: "receive-modal" */ './components/modals/ReceiveModal.vue');
routes.push({
    path: '/receive',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: ReceiveModal,
    },
    name: 'receive',
});

const TransactionModal = () =>
    import(/* webpackChunkName: "transaction-modal" */ './components/modals/TransactionModal.vue');
routes.push({
    path: '/transaction/:hash',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: TransactionModal,
    },
    name: 'transaction',
    props: true,
});

const SettingsModal = () => import(/* webpackChunkName: "settings-modal" */ './components/modals/SettingsModal.vue');
routes.push({
    path: '/settings',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: SettingsModal,
    },
    name: 'settings',
});

const TradeModal = () => import(/* webpackChunkName: "trade-modal" */ './components/modals/TradeModal.vue');
routes.push({
    path: '/trade',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: TradeModal,
    },
    name: 'trade',
});

const ScanQrModal = () => import(/* webpackChunkName: "scan-qr-modal" */ './components/modals/ScanQrModal.vue');
routes.push({
    path: '/scan',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: ScanQrModal,
    },
    name: 'scan',
});

const AddressModal = () =>
    import(/* webpackChunkName: "address-modal" */ './components/modals/AddressModal.vue');
routes.push({
    path: '/address/:address',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: AddressModal,
    },
    name: 'address',
    props: true,
});

routes.push({
    path: '/nimiq\\::requestUri',
    components: {
        accountOverview: AccountOverview,
        addressOverview: AddressOverview,
        default: SendModal,
    },
    name: 'send-via-uri',
    props: (route) => ({ requestUri: route.fullPath.substr(1) }),
});

const Network = () =>
    import(/* webpackChunkName: "network" */ './components/Network.vue');
routes.push({
    path: '/network',
    components: {
        fullpage: Network as any,
    },
    name: 'network',
});

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

import VueRouter, { RouteConfig } from 'vue-router';
import Vue from 'vue';

import { provide, inject } from '@vue/composition-api';

Vue.use(VueRouter);

const routes: RouteConfig[] = [];

const SendModal = () => import(/* webpackChunkName: "send-modal" */ './components/modals/SendModal.vue');
routes.push({
    path: '/send/:senderAddress',
    component: SendModal,
    name: 'send',
    props: true,
});

const ReceiveModal = () => import(/* webpackChunkName: "receive-modal" */ './components/modals/ReceiveModal.vue');
routes.push({
    path: '/receive',
    component: ReceiveModal,
    name: 'receive',
});

const TransactionModal = () =>
    import(/* webpackChunkName: "transaction-modal" */ './components/modals/TransactionModal.vue');
routes.push({
    path: '/transaction/:hash',
    component: TransactionModal as any,
    name: 'transaction',
    props: true,
});

const SettingsModal = () => import(/* webpackChunkName: "settings-modal" */ './components/modals/SettingsModal.vue');
routes.push({
    path: '/settings',
    component: SettingsModal,
    name: 'settings',
});

const TradeModal = () => import(/* webpackChunkName: "trade-modal" */ './components/modals/TradeModal.vue');
routes.push({
    path: '/trade',
    component: TradeModal,
    name: 'trade',
});

const ScanQrModal = () => import(/* webpackChunkName: "scan-qr-modal" */ './components/modals/ScanQrModal.vue');
routes.push({
    path: '/scan',
    component: ScanQrModal,
    name: 'scan',
});

const AddressInfoModal = () =>
    import(/* webpackChunkName: "address-info-modal" */ './components/modals/AddressInfoModal.vue');
routes.push({
    path: '/address/:address',
    component: AddressInfoModal,
    name: 'address',
    props: true,
});

routes.push({
    path: '/nimiq\\::requestUri',
    component: SendModal,
    name: 'send-via-uri',
    props: (route) => ({ requestUri: route.fullPath.substr(1) }),
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

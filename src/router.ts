import VueRouter, {RouteConfig} from 'vue-router';
import Vue, {VueConstructor} from 'vue';

import { provide, inject } from '@vue/composition-api';

Vue.use(VueRouter);

const routes: RouteConfig[] = [];

const SendModal         = () => import(/*webpackChunkName: "send-modal"*/ './components/modals/SendModal.vue');
routes.push({
    path: '/send',
    component: SendModal,
    name: 'send',
});

const ReceiveModal         = () => import(/*webpackChunkName: "receive-modal"*/ './components/modals/ReceiveModal.vue');
routes.push({
    path: '/receive',
    component: ReceiveModal,
    name: 'receive',
});

const TransactionModal  = () => import(/*webpackChunkName: "transaction-modal"*/ './components/modals/TransactionModal.vue');
routes.push({
    path: '/transaction/:hash',
    component: TransactionModal as any,
    name: 'transaction',
    props: true,
});

const SettingsModal  = () => import(/*webpackChunkName: "transaction-modal"*/ './components/modals/SettingsModal.vue');
routes.push({
    path: '/settings',
    component: SettingsModal,
    name: 'settings',
});

const TradeModal  = () => import(/*webpackChunkName: "transaction-modal"*/ './components/modals/TradeModal.vue');
routes.push({
    path: '/trade',
    component: TradeModal,
    name: 'trade',
});

export default new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes,
});

const RouterSymbol = Symbol();

export function provideRouter(router: VueRouter) {
    provide(RouterSymbol, router);
}

export function useRouter(): VueRouter {
    const router = inject(RouterSymbol) as VueRouter;
    if (!router) throw new Error('Router was not provided.');
    return router;
}

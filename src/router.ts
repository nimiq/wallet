import VueRouter, {RouteConfig} from 'vue-router';
import Vue, {VueConstructor} from 'vue';

import { provide, inject } from '@vue/composition-api';

Vue.use(VueRouter);

const routes: RouteConfig[] = [];

const ReceiveModal         = () => import(/*webpackChunkName: "receive-modal"*/ './components/modals/ReceiveModal.vue');
routes.push({
    path: '/send',
    component: ReceiveModal,
    name: 'send',
});

const SendModal         = () => import(/*webpackChunkName: "send-modal"*/ './components/modals/SendModal.vue');
routes.push({
    path: '/receive',
    component: SendModal,
    name: 'receive',
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

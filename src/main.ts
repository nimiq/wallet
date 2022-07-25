import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';
// @ts-expect-error Could not find a declaration file for module 'vue-virtual-scroller'.
import VueVirtualScroller from 'vue-virtual-scroller';
import { setAssetPublicPath as setVueComponentsAssetPath } from '@nimiq/vue-components';
import { init as initFastspotApi } from '@nimiq/fastspot-api';
import { init as initOasisApi } from '@nimiq/oasis-api';

import Config from 'config';
import App from './App.vue';
import { serviceWorkerHasUpdate } from './registerServiceWorker';
import { initStorage } from './storage';
import { initHubApi, syncFromHub } from './hub';
import { launchNetwork } from './network';
import { launchElectrum } from './electrum';
import { useAccountStore } from './stores/Account';
import { useFiatStore } from './stores/Fiat';
import { useSettingsStore } from './stores/Settings';
import router from './router';
import { i18n, loadLanguage } from './i18n/i18n-setup';
import { CryptoCurrency } from './lib/Constants';
import { startSentry } from './lib/Sentry';
import { initPWA } from './pwa';
import { init as initKycConnection } from './lib/KycConnection';

import '@nimiq/style/nimiq-style.min.css';
import '@nimiq/vue-components/dist/NimiqVueComponents.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import '@/assets/css/main.css';
import '@/scss/themes.scss';

// Set asset path relative to the public path defined in vue.config.json,
// see https://cli.vuejs.org/guide/mode-and-env.html#using-env-variables-in-client-side-code
setVueComponentsAssetPath(`${process.env.BASE_URL}js/`, `${process.env.BASE_URL}img/`);

Vue.config.productionTip = false;

Vue.use(VueCompositionApi);
Vue.use(VueVirtualScroller);

async function start() {
    initPWA(); // Must be called as soon as possible to catch early browser events related to PWA
    await initStorage(); // Must be awaited before starting Vue
    await initHubApi(); // Must be called after VueCompositionApi has been enabled
    syncFromHub(); // Can run parallel to Vue initialization

    serviceWorkerHasUpdate.then((hasUpdate) => useSettingsStore().state.updateAvailable = hasUpdate);

    // Update exchange rates every 2 minutes. If the last update was
    // less than 2 minutes ago, wait the remaining time first.
    const { timestamp: lastExchangeRateUpdateTime, updateExchangeRates } = useFiatStore();
    window.setTimeout(
        () => {
            updateExchangeRates();
            setInterval(() => updateExchangeRates(), 2 * 60 * 1000); // update every 2 min
        },
        Math.max(0, lastExchangeRateUpdateTime.value + 2 * 60 * 1000 - Date.now()),
    );

    // Fetch language file
    const { language } = useSettingsStore();
    loadLanguage(language.value);

    startSentry();

    if (Config.fastspot.apiEndpoint && Config.fastspot.apiKey) {
        initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);
    }

    if (Config.oasis.apiEndpoint) {
        initOasisApi(Config.oasis.apiEndpoint);
    }

    if (Config.TEN31Pass.enabled) {
        initKycConnection();
    }

    // Make config accessible in components
    Vue.prototype.$config = Config;

    const app = new Vue({
        router,
        i18n,
        render: (h) => h(App),
    }).$mount('#app');

    router.afterEach((to, from) => {
        // console.debug('route-changed', from, to);
        app.$emit('route-changed', to, from);
    });

    launchNetwork();

    if (Config.enableBitcoin) {
        launchElectrum();
    } else {
        useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
    }

    router.onReady(() => {
        // console.debug(router.currentRoute, window.history.state);

        // Vue-Router sets a history.state. If a state exists, this means this was
        // a page-reload and we don't need to set up the initial routing anymore.
        if (window.history.state) return;

        if (router.currentRoute.path !== '/') {
            const startRoute = router.currentRoute.fullPath;

            // Verify that this route exists in the app
            if (!router.resolve(startRoute).resolved.matched.length) return;

            app.$once('route-changed', () => Vue.nextTick().then(() => {
                // Use push, so the user is able to use the OS' back button.
                // Use fullpath to also capture query params, like used in payment links.
                router.push(startRoute);
            }));
        }
        router.replace('/').catch(() => { /* ignore */ }); // Make sure to remove any query params, like ?sidebar.
    });
}
start();

declare module 'vue/types/vue' {
    interface Vue {
        $config: typeof Config;
    }
}

declare module '@vue/composition-api/dist/component/component' {
    interface SetupContext {
        readonly refs: { [key: string]: Vue | Element | Vue[] | Element[] };
    }
}

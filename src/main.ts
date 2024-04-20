import Vue from 'vue';
import VueCompositionApi, { watch } from '@vue/composition-api';
// @ts-expect-error Could not find a declaration file for module 'vue-virtual-scroller'.
import VueVirtualScroller from 'vue-virtual-scroller';
import { setAssetPublicPath as setVueComponentsAssetPath } from '@nimiq/vue-components';
import { init as initFastspotApi } from '@nimiq/fastspot-api';
import { init as initOasisApi } from '@nimiq/oasis-api';

import App from './App.vue';
import { serviceWorkerHasUpdate } from './registerServiceWorker';
import { initStorage } from './storage';
import { initHubApi, syncFromHub } from './hub';
import { launchNetwork } from './network';
import { launchElectrum } from './electrum';
import { launchPolygon } from './ethers';
import { useAccountStore } from './stores/Account';
import { useFiatStore } from './stores/Fiat';
import { useSettingsStore } from './stores/Settings';
import router from './router';
import { i18n, loadLanguage } from './i18n/i18n-setup';
import { CryptoCurrency } from './lib/Constants';
import { startSentry } from './lib/Sentry';
import { useConfig } from './composables/useConfig';
import { initPwa } from './composables/usePwaInstallPrompt';
import { init as initKycConnection } from './lib/KycConnection';
import { init as initTrials } from './lib/Trials';

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
    initPwa(); // Must be called as soon as possible to catch early browser events related to PWA
    await initStorage(); // Must be awaited before starting Vue
    initTrials(); // Must be called after storage was initialized, can affect Config
    // Must run after VueCompositionApi has been enabled and after storage was initialized. Could potentially run in
    // background and in parallel to syncFromHub, but RedirectRpcClient.init does not actually run async code anyways.
    await initHubApi();
    syncFromHub(); // Can run parallel to Vue initialization; must be called after storage was initialized.

    serviceWorkerHasUpdate.then((hasUpdate) => useSettingsStore().state.updateAvailable = hasUpdate);

    // Update exchange rates every 2 minutes. If an update takes longer than 2 minutes due to a provider's rate limit,
    // wait until the update succeeds before queueing the next update. If the last update before page load was less than
    // 2 minutes ago, wait the remaining time first.
    const { timestamp: { value: lastExchangeRateUpdateTime }, updateExchangeRates } = useFiatStore();
    let exchangeRateUpdateStart = lastExchangeRateUpdateTime;
    const TWO_MINUTES = 2 * 60 * 1000;
    function queueExchangeRateUpdate() {
        setTimeout(async () => {
            exchangeRateUpdateStart = Date.now(); // in contrast to fiatStore.timestamp set before the update
            await updateExchangeRates(/* failGracefully */ true); // silently ignores errors
            queueExchangeRateUpdate();
        // Also add 2 minutes as upper bound to be immune to the user's system clock being wrong.
        }, Math.max(0, Math.min(exchangeRateUpdateStart + TWO_MINUTES - Date.now(), TWO_MINUTES)));
    }
    queueExchangeRateUpdate();

    // Fetch language file
    const { language } = useSettingsStore();
    loadLanguage(language.value);

    startSentry();

    const { config } = useConfig();

    watch(() => {
        if (!config.fastspot.apiEndpoint || !config.fastspot.apiKey) return;
        initFastspotApi(config.fastspot.apiEndpoint, config.fastspot.apiKey);
    });

    watch(() => {
        if (!config.oasis.apiEndpoint) return;
        initOasisApi(config.oasis.apiEndpoint);
    });

    watch(() => {
        if (!config.ten31Pass.enabled) return;
        initKycConnection();
    });

    // Make reactive config accessible in components
    Vue.prototype.$config = config;

    new Vue({
        router,
        i18n,
        render: (h) => h(App),
    }).$mount('#app');

    launchNetwork();

    const { state: { activeCurrency } } = useAccountStore();

    watch(() => {
        if (!config.enableBitcoin) return;
        launchElectrum();
    });

    watch(() => {
        if (!config.usdc.enabled) return;
        launchPolygon();
    });

    if (
        (activeCurrency === CryptoCurrency.BTC && !config.enableBitcoin)
        || (activeCurrency === CryptoCurrency.USDC && !config.usdc.enabled)
    ) {
        useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
    }
}
start();

declare module 'vue/types/vue' {
    interface Vue {
        $config: ReturnType<typeof useConfig>['config'];
    }
}

declare module '@vue/composition-api/dist/component/component' {
    interface SetupContext {
        readonly refs: { [key: string]: Vue | Element | Vue[] | Element[] };
    }
}

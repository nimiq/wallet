import Vue from 'vue';
import VueCompositionApi, { watch } from '@vue/composition-api';
// @ts-expect-error Could not find a declaration file for module 'vue-virtual-scroller'.
import VueVirtualScroller from 'vue-virtual-scroller';
import { setAssetPublicPath as setVueComponentsAssetPath } from '@nimiq/vue-components';
import { init as initFastspotApi } from '@nimiq/fastspot-api';
import { init as initOasisApi } from '@nimiq/oasis-api';
// @ts-expect-error missing types for this package
import VuePortal from '@linusborg/vue-simple-portal';

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
import { CryptoCurrency, ENV_MAIN } from './lib/Constants';
import { startSentry } from './lib/Sentry';
import { useConfig } from './composables/useConfig';
import { initPwa } from './composables/usePwaInstallPrompt';
import { useInactivityDetection } from './composables/useInactivityDetection';
import { init as initKycConnection } from './lib/KycConnection';
import { init as initTrials } from './lib/Trials';

// Side-effects
import './lib/AddressBook';

import '@nimiq/style/nimiq-style.min.css';
import '@nimiq/vue-components/dist/NimiqVueComponents.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import '@/scss/themes.scss';

// Set asset path relative to the public path defined in vue.config.json,
// see https://cli.vuejs.org/guide/mode-and-env.html#using-env-variables-in-client-side-code
setVueComponentsAssetPath(`${process.env.BASE_URL}js/`, `${process.env.BASE_URL}img/`);

Vue.config.productionTip = false;

Vue.use(VueCompositionApi);
Vue.use(VueVirtualScroller);
Vue.use(VuePortal, { name: 'Portal' });

async function start() {
    initPwa(); // Must be called as soon as possible to catch early browser events related to PWA
    await initStorage(); // Must be awaited before starting Vue
    initTrials(); // Must be called after storage was initialized, can affect Config
    await initHubApi();

    serviceWorkerHasUpdate.then((hasUpdate) => useSettingsStore().state.updateAvailable = hasUpdate);

    // Fetch language file
    const { language } = useSettingsStore();
    loadLanguage(language.value);

    startSentry();

    const { config } = useConfig();

    if (config.environment !== ENV_MAIN) {
        document.title = 'Nimiq Testnet Wallet';
    }

    // Initialize APIs based on config
    if (config.fastspot.apiEndpoint && config.fastspot.apiKey) {
        initFastspotApi(config.fastspot.apiEndpoint, config.fastspot.apiKey);
    }
    if (config.oasis.apiEndpoint) {
        initOasisApi(config.oasis.apiEndpoint);
    }
    if (config.ten31Pass.enabled) {
        initKycConnection();
    }

    // Make reactive config accessible in components
    Vue.prototype.$config = config;

    // Initialize Vue
    const app = new Vue({
        router,
        i18n,
        render: (h) => h(App),
    }).$mount('#app');

    // Then sync from hub after Vue is mounted
    await syncFromHub();

    // Setup watchers and launch network services
    launchNetwork();

    const { state: { activeCurrency } } = useAccountStore();

    if (config.enableBitcoin) {
        launchElectrum();
    }

    if (config.polygon.enabled) {
        launchPolygon();
    }

    if (
        (activeCurrency === CryptoCurrency.BTC && !config.enableBitcoin)
        || (activeCurrency === CryptoCurrency.USDC && !config.polygon.enabled)
        || (activeCurrency === CryptoCurrency.USDT && !config.polygon.enabled)
    ) {
        useAccountStore().setActiveCurrency(CryptoCurrency.NIM);
    }

    // Setup exchange rate updates
    const { timestamp: lastSuccessfulExchangeRateUpdate, updateExchangeRates } = useFiatStore();
    const { isUserInactive } = useInactivityDetection();
    let lastTriedExchangeRateUpdate = lastSuccessfulExchangeRateUpdate.value;
    const TWO_MINUTES = 2 * 60 * 1000;
    const TEN_MINUTES = 5 * TWO_MINUTES;
    let exchangeRateUpdateTimer = -1;
    function queueExchangeRateUpdate() {
        const interval = isUserInactive.value ? TEN_MINUTES : TWO_MINUTES;
        lastTriedExchangeRateUpdate = Math.max(lastTriedExchangeRateUpdate, lastSuccessfulExchangeRateUpdate.value);
        const remainingTime = Math.max(0, Math.min(lastTriedExchangeRateUpdate + interval - Date.now(), interval));
        clearTimeout(exchangeRateUpdateTimer);
        exchangeRateUpdateTimer = window.setTimeout(async () => {
            await updateExchangeRates(/* failGracefully */ true);
            lastTriedExchangeRateUpdate = Date.now();
            queueExchangeRateUpdate();
        }, remainingTime);
    }
    watch(isUserInactive, queueExchangeRateUpdate);
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

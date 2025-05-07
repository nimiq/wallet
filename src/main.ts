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
import { initMatomo } from './matomo';
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
    // Must run after VueCompositionApi has been enabled and after storage was initialized. Could potentially run in
    // background and in parallel to syncFromHub, but RedirectRpcClient.init does not actually run async code anyways.
    await initHubApi();
    syncFromHub(); // Can run parallel to Vue initialization; must be called after storage was initialized.

    serviceWorkerHasUpdate.then((hasUpdate) => useSettingsStore().state.updateAvailable = hasUpdate);

    // Update exchange rates every 2 minutes or every 10 minutes, depending on whether the Wallet is currently actively
    // used. If an update takes longer than that time due to a provider's rate limit, wait until the update succeeds
    // before queueing the next update. If the last update before page load was less than 2 minutes ago, wait the
    // remaining time first.
    const { timestamp: lastSuccessfulExchangeRateUpdate, updateExchangeRates } = useFiatStore();
    const { isUserInactive } = useInactivityDetection();
    let lastTriedExchangeRateUpdate = lastSuccessfulExchangeRateUpdate.value;
    const TWO_MINUTES = 2 * 60 * 1000;
    const TEN_MINUTES = 5 * TWO_MINUTES;
    let exchangeRateUpdateTimer = -1;
    function queueExchangeRateUpdate() {
        const interval = isUserInactive.value ? TEN_MINUTES : TWO_MINUTES;
        // Update lastTriedExchangeRateUpdate as there might have been other exchange rate updates in the meantime, for
        // example on currency change.
        lastTriedExchangeRateUpdate = Math.max(lastTriedExchangeRateUpdate, lastSuccessfulExchangeRateUpdate.value);
        // Also set interval as upper bound to be immune to the user's system clock being wrong.
        const remainingTime = Math.max(0, Math.min(lastTriedExchangeRateUpdate + interval - Date.now(), interval));
        clearTimeout(exchangeRateUpdateTimer);
        exchangeRateUpdateTimer = window.setTimeout(async () => {
            // Silently ignore errors. If successful, this updates fiatStore.timestamp, which then also triggers price
            // chart updates in PriceChart.vue.
            await updateExchangeRates(/* failGracefully */ true);
            // In contrast to lastSuccessfulExchangeRateUpdate also update lastTriedExchangeRateUpdate on failed
            // attempts, to avoid repeated rescheduling on failure. Instead, simply skip the failed attempt and try
            // again at the regular interval. We update the time after the update attempt, instead of before it, because
            // exchange rates are up-to-date at the time an update successfully finishes, and get old from that point,
            // and not from the time the update was started.
            lastTriedExchangeRateUpdate = Date.now();
            queueExchangeRateUpdate();
        }, remainingTime);
    }
    watch(isUserInactive, queueExchangeRateUpdate); // (Re)schedule exchange rate updates at the desired interval.

    // Fetch language file
    const { language } = useSettingsStore();
    loadLanguage(language.value);

    startSentry();

    const { config } = useConfig();

    if (config.environment !== ENV_MAIN) {
        document.title = 'Nimiq Testnet Wallet';
    }

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

    if (config.matomo.enabled) {
        initMatomo(config.matomo.host, config.matomo.siteId, router);
    }

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
        if (!config.polygon.enabled) return;
        launchPolygon();
    });

    if (
        (activeCurrency === CryptoCurrency.BTC && !config.enableBitcoin)
        || (activeCurrency === CryptoCurrency.USDC && !config.polygon.enabled)
        || (activeCurrency === CryptoCurrency.USDT && !config.polygon.enabled)
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

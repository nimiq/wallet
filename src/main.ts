import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';
// @ts-ignore Could not find a declaration file for module 'vue-virtual-scroller'.
import VueVirtualScroller from 'vue-virtual-scroller';

import App from './App.vue';
import './registerServiceWorker';
import { initStorage } from './storage';
import { syncFromHub } from './hub';
import { launchNetwork } from './network';
import { useFiatStore } from './stores/Fiat';
import { useSettingsStore } from './stores/Settings';
import router from './router';
import { i18n, loadLanguageAsync } from './i18n/i18n-setup';

import '@nimiq/style/nimiq-style.min.css';
import '@nimiq/vue-components/dist/NimiqVueComponents.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import '@/assets/css/main.css';
import '@/scss/themes.scss';

declare global {
    interface Window {
        NIMIQ_IQONS_SVG_PATH: string;
    }
}

// Specify where the svg asset for the Nimiq identicons is located.
// The file gets copied to this location via the copy-webpack-plugin
// as specified in vue.config.js
window.NIMIQ_IQONS_SVG_PATH = '/img/iqons.min.svg';

Vue.config.productionTip = false;

Vue.use(VueCompositionApi);
Vue.use(VueVirtualScroller);

initStorage();
syncFromHub();
const { timestamp: lastExchangeRateUpdateTime, updateExchangeRates } = useFiatStore();

// Update exchange rates every 2 minutes. If the last update was
// less than 2 minutes ago, wait the remaining time first.
window.setTimeout(
    () => {
        updateExchangeRates();
        setInterval(() => updateExchangeRates(), 2 * 60 * 1000); // update every 2 min
    },
    Math.max(0, lastExchangeRateUpdateTime.value + 2 * 60 * 1000 - Date.now()),
);

// Fetch language file
const { language } = useSettingsStore();
loadLanguageAsync(language.value);

new Vue({
    router,
    i18n,
    render: (h) => h(App),
}).$mount('#app');

launchNetwork();

declare module '@vue/composition-api/dist/component/component' {
    interface SetupContext {
        readonly refs: { [key: string]: Vue | Element | Vue[] | Element[] };
    }
}

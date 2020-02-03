import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';
import VueI18n from 'vue-i18n';
// @ts-ignore Could not find a declaration file for module 'vue-virtual-scroller'.
import VueVirtualScroller from 'vue-virtual-scroller';

import App from './App.vue';
import './registerServiceWorker';
import { initStorage } from './storage';
import { syncFromHub } from './hub';
import { launchNetwork } from './network';
import router from './router';
import { i18n, autodetectLanguage } from '@/i18n/i18n-setup';

import '@nimiq/style/nimiq-style.min.css';
import '@nimiq/vue-components/dist/NimiqVueComponents.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import '@/assets/css/main.css';

declare global {
  interface Window {
    NIMIQ_IQONS_SVG_PATH: string;
  }
}

// Specify where the svg asset for the Nimiq identicons is located. The file gets copied to this location via
// the copy-webpack-plugin as specified in vue.config.js
window.NIMIQ_IQONS_SVG_PATH = '/img/iqons.min.svg';

Vue.config.productionTip = false;

Vue.use(VueCompositionApi);
Vue.use(VueI18n);
Vue.use(VueVirtualScroller);

initStorage();
syncFromHub();

new Vue({
  router,
  i18n,
  render: h => h(App),
}).$mount('#app');

autodetectLanguage();
launchNetwork();

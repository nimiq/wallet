import Vue from 'vue'
import App from './App.vue'
import VueCompositionApi from '@vue/composition-api';
import './registerServiceWorker'

import { initStorage } from './storage'
import { launchNetwork } from './network'
import router from './router';

import '@/assets/css/tailwind.css'
// import '@nimiq/style/nimiq-style.min.css'
import '@/assets/css/main.css'
import '@nimiq/vue-components/dist/NimiqVueComponents.css';

declare global {
  interface Window {
    NIMIQ_IQONS_SVG_PATH: string;
  }
}

// Specify where the svg asset for the Nimiq identicons is located. The file gets copied to this location via
// the copy-webpack-plugin as specified in vue.config.js
window.NIMIQ_IQONS_SVG_PATH = '/img/iqons.min.svg';

Vue.config.productionTip = false

Vue.use(VueCompositionApi);

initStorage()

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')

launchNetwork()

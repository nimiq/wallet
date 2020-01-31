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

Vue.config.productionTip = false

Vue.use(VueCompositionApi);

initStorage()

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')

launchNetwork()

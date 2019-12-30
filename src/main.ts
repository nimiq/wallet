import Vue from 'vue'
import App from './App.vue'
import VueCompositionApi from '@vue/composition-api';
import './registerServiceWorker'

import { initStorage } from './storage'
import { launchNetwork } from './network'

import '@/assets/css/tailwind.css'
// import '@nimiq/style/nimiq-style.min.css'
import '@/assets/css/main.css'

Vue.config.productionTip = false

Vue.use(VueCompositionApi);

initStorage()

new Vue({
  render: h => h(App),
}).$mount('#app')

launchNetwork()

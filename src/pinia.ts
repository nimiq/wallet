import Vue from 'vue';
import { createPinia, PiniaVuePlugin, setActivePinia } from 'pinia';

Vue.use(PiniaVuePlugin);

export const pinia = createPinia();

// Activate pinia right away, as stores are already used before the Vue app is created, for example to initialize them
// from storage, or at module evaluation time of some modules. Therefore, this module should be imported first.
setActivePinia(pinia);

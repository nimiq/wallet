import { reactive } from 'vue';
// import { UnwrapRef } from 'vue/dist/reactivity/index.d';
import Config from 'config';

// FIXME: In Vue 2, composition-api methods cannot be used before the plugin is activated.
//        When switching to Vue 3, the reactiveConfig variable can be directly instantiated.
// let reactiveConfig: UnwrapRef<typeof Config> | null = null;

export function useConfig() {
    // First-time setup
    // if (!reactiveConfig) {
    //     reactiveConfig = reactive(Config);
    // }

    return {
        // config: reactiveConfig,
        config: reactive(Config),
    };
}

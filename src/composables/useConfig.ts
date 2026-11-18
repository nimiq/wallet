import { reactive, UnwrapNestedRefs } from 'vue';
import Config from 'config';

let reactiveConfig: UnwrapNestedRefs<typeof Config> | null = null;

export function useConfig() {
    // First-time setup
    if (!reactiveConfig) {
        reactiveConfig = reactive(Config);
    }

    return {
        config: reactiveConfig,
    };
}

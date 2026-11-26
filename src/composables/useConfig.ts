import Config from 'config';
import { reactive, UnwrapNestedRefs } from 'vue';

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

// Type declarations for the rollup plugins of webpack-i18n-tools, which are used in vite.config.ts.

declare module 'webpack-i18n-tools/loader/rollup' {
    import type { Plugin } from 'vite';

    export default function rollupPoLoaderPlugin(options?: Record<string, unknown>): Plugin;
}

declare module 'webpack-i18n-tools/optimizer/rollup' {
    import type { Plugin } from 'vite';

    export default function rollupI18nOptimizerPlugin(): Plugin;
}

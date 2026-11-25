import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite-plus';
import { defineConfig, loadEnv } from 'vite-plus';
import type { OxlintConfig } from 'vite-plus/lint';
import vue from '@vitejs/plugin-vue2';
import wasm from 'vite-plugin-wasm';
import { VitePWA } from 'vite-plugin-pwa';
import type { ManifestTransform } from 'workbox-build';
import poLoader from 'webpack-i18n-tools/loader/rollup';
import poOptimizer from 'webpack-i18n-tools/optimizer/rollup';
import {
    airbnbBaseRules,
    typescriptRecommendedRules,
    typescriptRecommendedTypeScriptFileRules,
    vue2EssentialScriptRules,
} from './lint/presets';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command, mode }) => {
    // Note that vp lint and vp check also evaluate this config, as command 'build' in mode 'development', and
    // vp preview as command 'serve' in mode 'production'.
    const isProductionBuild = command === 'build' && mode === 'production';
    const isDevServer = command === 'serve' && mode === 'development';

    // Variables from the environment and from .env files, for example .env.local, see
    // https://vite.dev/guide/env-and-mode.html#env-files. Variables in the environment take priority.
    const env = loadEnv(mode, rootDir, '');

    const buildName = isProductionBuild ? env.build : 'local';
    if (!buildName) {
        throw new Error('Please specify the build config with the `build` environment variable');
    }

    let release: string | undefined;
    if (!isProductionBuild) {
        release = 'dev';
    } else if (env.CI) {
        // CI environment variables are documented at https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
        release = `${env.CI_COMMIT_BRANCH}-${env.CI_PIPELINE_ID}-${env.CI_COMMIT_SHORT_SHA}`;
    } else {
        [release] = execSync('git tag --points-at HEAD').toString().split('\n');
    }
    if (!release) {
        throw new Error('The current commit must be tagged with the release version name.');
    }

    if (isProductionBuild || isDevServer) {
        console.log('Building for:', buildName, ', release:', `"wallet-${release}"`); // eslint-disable-line no-console
    }

    const appName = ({
        mainnet: 'Nimiq Wallet',
        testnet: 'Nimiq Testnet Wallet',
        local: 'Nimiq Local Wallet',
    } as Record<string, string>)[buildName] || 'Nimiq Wallet';

    // For iOS debugging in BrowserStack, BrowserStack's localhost tunnel bs-local.com needs to be used, see
    // https://www.browserstack.com/docs/live/local-testing/ios-troubleshooting-guide. However, on bs-local.com features
    // only available on https like crypto.subtle or service workers don't work unless served as https. The Hub also
    // needs to be served with this option and the Keyguard has to be served over https as well. Safari has problems to
    // open the https page with invalid certificate, but Chrome iOS works and also uses the Safari engine. To be able to
    // use the dev tools with Chrome iOS on BrowserStack, launch BrowserStack with Safari first, then switch to Chrome.
    const httpsKey = env['https-key'];
    const httpsCert = env['https-cert'];
    const useHttps = !!(httpsKey && httpsCert) || !!env['browserstack-ios-testing'];

    // Output file names, in the folder structure formerly created by Vue CLI.
    const outputOptions = {
        // Full minification as by default, but keep the names of $t variables, like `const { $t } = useI18n()`, as
        // webpack-i18n-tools' optimizer detects translation usages via these names in the minified code.
        minify: {
            compress: true,
            mangle: { reserved: ['$t', '$tc', '$te'] },
            codegen: { removeWhitespace: true },
        },
        hashCharacters: 'hex' as const,
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: (chunk: { facadeModuleId: string | null }) => chunk.facadeModuleId?.endsWith('.po')
            ? 'js/lang-[name]-po.[hash].js'
            : 'js/[name].[hash].js',
        assetFileNames: (asset: { names: string[] }) => {
            const extension = path.extname(asset.names[0] || '').substring(1);
            const directory = extension === 'css' ? 'css'
                : /^(png|jpe?g|gif|svg|webp|avif|ico)$/.test(extension) ? 'img'
                    : /^(woff2?|eot|ttf|otf)$/.test(extension) ? 'fonts'
                        : /^(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(extension) ? 'media'
                            : 'assets';
            return `${directory}/[name].[hash][extname]`;
        },
    };

    // Node.js built-ins and globals that dependencies expect, which are not available in browsers.
    const nodeGlobalsInjection = {
        Buffer: ['buffer', 'Buffer'] as [string, string],
        process: 'process/browser',
    };

    return {
        plugins: [
            vue(),
            wasm(),
            poLoader(),
            translationsOptimizerPlugin(),
            credentialsPlugin(env),
            staticCopyPlugin({
                'img/nimiq-style.icons.svg': 'node_modules/@nimiq/style/nimiq-style.icons.svg',
                ...Object.fromEntries(fs.globSync(
                    'node_modules/@nimiq/vue-components/dist/iqons.min.*.svg',
                    { cwd: rootDir },
                ).map((file) => [`img/${path.basename(file)}`, file])),
                // The bundled NimiqVueComponents.umd.js loads the language files from the asset path set in main.ts and
                // tries to load the non-minified files.
                ...Object.fromEntries(fs.globSync(
                    'node_modules/@nimiq/vue-components/dist/NimiqVueComponents.umd.min.lang-*.js',
                    { cwd: rootDir },
                ).map((file) => [`js/${path.basename(file).replace('.min', '')}`, file])),
            }),
            pwaManifestPlugin(appName),
            VitePWA({
                // Registered in registerServiceWorker.ts via register-service-worker.
                injectRegister: false,
                // Generated by pwaManifestPlugin.
                manifest: false,
                filename: 'service-worker.js',
                // Only warn about files that are too large to be precached, like webpack did.
                showMaximumFileSizeToCacheInBytesWarning: true,
                workbox: {
                    cacheId: '@nimiq/wallet', // as formerly set by @vue/cli-plugin-pwa
                    globPatterns: ['**/*'],
                    globIgnores: [
                        'service-worker.js',
                        'workbox-*.js',
                        'server-time', // File needs to be fetched from server in Time.ts
                        // Formerly the defaults of @vue/cli-plugin-pwa, which is in line with the recommendation to not
                        // cache icons, see https://developer.chrome.com/docs/workbox/precaching-dos-and-donts
                        '**/*.map',
                        'img/icons/**',
                        'favicon.ico',
                    ],
                    // Files with a content hash in the file name don't need a separate revision.
                    dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
                    // Don't serve index.html for navigation requests to any url, e.g. to swap-kyc-handler.html.
                    navigateFallback: undefined,
                    cleanupOutdatedCaches: true,
                    // Start controlling all clients when activated (should prevent stale secondary tabs).
                    clientsClaim: true,
                    manifestTransforms: [subresourceIntegrityManifestTransform(path.join(rootDir, 'dist'))],
                },
            }),
            ...(useHttps && !(httpsKey && httpsCert)
                ? [(await import('@vitejs/plugin-basic-ssl')).default()] // self-signed certificate
                : []),
        ],
        resolve: {
            alias: [
                { find: /^@\//, replacement: `${path.join(rootDir, 'src')}/` },
                { find: /^config$/, replacement: path.join(rootDir, `src/config/config.${buildName}.ts`) },
                // Polyfill for the Node.js built-in. The assert, buffer and process polyfills are resolved as regular
                // packages of the same name.
                { find: /^stream$/, replacement: 'readable-stream' },
            ],
        },
        define: {
            // Replaced by the respective node global objects, as previously done by webpack.
            global: 'globalThis',
            'import.meta.env.SENTRY_RELEASE': JSON.stringify(`wallet-${release}`),
            'import.meta.env.VERSION': JSON.stringify(release),
            'import.meta.env.COPYRIGHT_YEAR': JSON.stringify(new Date().getUTCFullYear().toString()), // year at build
        },
        build: {
            sourcemap: true,
            // Like Vue CLI, never inline svgs as data urls, but always emit them as separate files.
            assetsInlineLimit: (filePath: string) => (/\.svg(?:\?|$)/.test(filePath) ? false : undefined),
            rolldownOptions: {
                // The html pages, which are also allowlisted for nginx by scripts/makeNginxAllowlist.js.
                input: {
                    index: path.join(rootDir, 'index.html'),
                    'swap-kyc-handler': path.join(rootDir, 'swap-kyc-handler.html'),
                },
                transform: {
                    inject: nodeGlobalsInjection,
                },
                output: {
                    ...outputOptions,
                    codeSplitting: {
                        groups: [{
                            // Like Vue CLI's chunk-vendors, put the dependencies of the entry points into a separate
                            // chunk, which can be cached long-term, and which webpack-i18n-tools' optimizer skips, such
                            // that it doesn't rewrite translation usages in dependencies, like @nimiq/vue-components,
                            // which come with their own translations.
                            name: 'vendor',
                            test: /[\\/]node_modules[\\/]/,
                            tags: ['$initial'],
                        }],
                    },
                },
            },
        },
        optimizeDeps: {
            // Loads its WebAssembly modules and workers relative to its own files.
            exclude: ['@nimiq/core'],
            rolldownOptions: {
                transform: {
                    inject: nodeGlobalsInjection,
                },
            },
        },
        worker: {
            format: 'es',
            plugins: () => [wasm()],
            rolldownOptions: {
                output: outputOptions,
            },
        },
        server: {
            port: 8081,
            hmr: {
                overlay: false,
            },
            ...(useHttps ? {
                https: httpsKey && httpsCert ? {
                    key: fs.readFileSync(httpsKey),
                    cert: fs.readFileSync(httpsCert),
                } : {},
                // Allow to serve locally on wallet.nimiq.com via custom cert, or on bs-local.com.
                allowedHosts: true,
            } : {}),
        },
        // Note: the service worker is only set up in production builds, thus to test it, a production build has to be
        // built and served via `vp preview`.
        preview: {
            port: 8081,
        },
        lint: lintConfig,
        check: {
            // The code is not formatted with Oxfmt (vp fmt) yet, but its style is checked by the linters.
            fmt: false,
        },
    };
});

/**
 * Oxlint config for vp lint and vp check. Templates of Vue single file components are additionally linted by ESLint,
 * see eslint.config.mjs.
 */
const lintConfig: OxlintConfig = {
    // Only enable the configured rules.
    plugins: ['eslint', 'typescript', 'import', 'vue'],
    categories: {
        correctness: 'off',
    },
    jsPlugins: [
        '@stylistic/eslint-plugin',
        // The name `import` is reserved for Oxlint's native implementation.
        { name: 'import-js', specifier: 'eslint-plugin-import' },
        './lint/eslint-core-rules.mjs',
    ],
    options: {
        typeAware: true, // for typescript/consistent-return and typescript/dot-notation
    },
    // deployment-wallet/ is the checkout of the deployment repository, made by scripts/deploy.sh.
    ignorePatterns: ['dist/**', 'deployment-wallet/**', 'public/**', 'scripts/**', 'types/**'],
    env: {
        browser: true,
        node: true,
        es2024: true,
    },
    settings: {
        'import/resolver': {
            node: { extensions: ['.mjs', '.js', '.json', '.ts', '.vue'] },
        },
        'import/extensions': ['.js', '.jsx', '.mjs', '.ts', '.tsx'],
        'import/internal-regex': '^@/',
        'import/ignore': ['node_modules', '\\.(coffee|scss|css|less|hbs|svg|json)$'],
    },
    rules: {
        ...airbnbBaseRules,
        ...vue2EssentialScriptRules,
        ...typescriptRecommendedRules,

        'import/extensions': ['error', 'always', {
            js: 'never',
            mjs: 'never',
            jsx: 'never',
            ts: 'never',
            tsx: 'never',
        }],
        // Errors in production builds, see the verify script in package.json.
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'eslint-js/function-paren-newline': 'off',
        'eslint-js/indent': ['error', 4, { SwitchCase: 1 }],
        'eslint-js/max-len': ['error', 120],
        'no-underscore-dangle': 'off',
        'no-param-reassign': 'off',
        'no-plusplus': 'off',
        'no-continue': 'off',
        'eslint-js/no-confusing-arrow': 'off',
        'eslint-js/no-floating-decimal': 'off',
        'no-return-assign': 'off',
        'eslint-js/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'import/prefer-default-export': 'off',
        'import/no-cycle': 'off',
        'eslint-js/implicit-arrow-linebreak': 'off',
        'eslint-js/object-curly-newline': ['error', { ObjectPattern: { multiline: true } }],
        'eslint-js/prefer-const': ['error', { destructuring: 'all' }],
        'no-nested-ternary': 'off',
        // Do not restrict usage of for...of
        'eslint-js/no-restricted-syntax': [
            'error',
            ...(airbnbBaseRules['eslint-js/no-restricted-syntax'] as [string, ...Array<{ selector: string }>])
                .slice(1)
                .filter((restriction) => typeof restriction === 'object' && restriction.selector !== 'ForOfStatement'),
        ],

        '@stylistic/member-delimiter-style': ['error', {
            overrides: { typeLiteral: { multiline: { delimiter: 'comma' }, singleline: { delimiter: 'comma' } } },
        }],
        'typescript/no-explicit-any': 'off',
        // As in typescript-eslint's recommended config before version 8.
        'typescript/no-unused-vars': ['warn', { caughtErrors: 'none' }],
        'typescript/no-non-null-assertion': 'off',

        'no-useless-constructor': 'off',
        'typescript/no-useless-constructor': 'error',

        'no-use-before-define': 'off',

        // False positives that are checked by TS
        'no-redeclare': 'off',
    },
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.vue'],
            rules: typescriptRecommendedTypeScriptFileRules,
        },
        {
            // Oxlint only lints the scripts of Vue files. Rules which check the lines of the entire file are therefore
            // applied by ESLint, including the templates and styles, see eslint.config.mjs.
            files: ['**/*.vue'],
            rules: {
                'eslint-js/eol-last': 'off',
                'eslint-js/linebreak-style': 'off',
                'eslint-js/max-len': 'off',
                'eslint-js/no-mixed-spaces-and-tabs': 'off',
                'eslint-js/no-multiple-empty-lines': 'off',
                'eslint-js/no-tabs': 'off',
                'eslint-js/no-trailing-spaces': 'off',
                'no-irregular-whitespace': 'off',
                'unicode-bom': 'off',
            },
        },
        {
            files: ['src/lib/NetworkMap.ts'],
            rules: {
                'max-classes-per-file': 'off',
            },
        },
        {
            // In plain CommonJS modules, `import foo = require('foo')` can't be used instead.
            files: ['**/*.js', '**/*.cjs'],
            rules: {
                'typescript/no-require-imports': 'off',
            },
        },
        {
            // Configuration files at the project root can use the dev dependencies. They're listed explicitly, as a
            // pattern like *.ts matches files in all directories in Oxlint, not only at the project root.
            files: ['eslint.config.mjs', 'vite.config.ts', 'lint/**'],
            rules: {
                'import-js/no-extraneous-dependencies': ['error', { devDependencies: true }],
            },
        },
    ],
};

/**
 * Inject credentials defined in the environment, for example via an .env.local file, into the code, for use in the
 * effective build config. We define constants for all environments, mainnet, testnet and local, such that the configs
 * can choose which variant they actually want to use, for example config.local.ts could use mainnet credentials for
 * local mainnet testing.
 * We define these as plain constants, not via import.meta.env, as otherwise they would be injected into the client
 * code's import.meta.env object, regardless of whether they're used. By not putting them on a parent object, only
 * credentials that are actually used in a build are injected. For this, they should be only accessed by the effective
 * config file, not other shared code imported across testnet and mainnet.
 * For each injected constant, a type must also be registered in credentials.d.ts.
 *
 * Note that the injected values will be visible in the client code, therefore do not use this for credentials or API
 * keys that actually need to remain secret.
 */
function credentialsPlugin(env: Record<string, string>): Plugin {
    const credentialNames = ['ALBATROSS_WATCHTOWER_PASSWORD', 'ALCHEMY_API_KEY', 'ALCHEMY_ETH_API_KEY']
        .flatMap((baseName) => [`${baseName}_LOCAL`, `${baseName}_TESTNET`, `${baseName}_MAINNET`]);
    const getWarning = (credentialName: string) =>
        `process.env.${credentialName} is unset. Please set it, for example via an .env.local file.`;
    const missingCredentialNames = credentialNames.filter((credentialName) => env[credentialName] === undefined);

    return {
        name: 'wallet:credentials',
        config: () => ({
            define: Object.fromEntries(credentialNames.map((credentialName) => [
                credentialName,
                credentialName in env
                    ? JSON.stringify(env[credentialName]) // Empty values are allowed.
                    // Only for CI, allow to build, but at least generate a build that throws at runtime.
                    : `(() => { throw new Error(${JSON.stringify(getWarning(credentialName))}); })()`,
            ])),
        }),
        transform: {
            filter: { id: { exclude: /\/node_modules\// } },
            handler(code) {
                // Only check modules that are part of the build and use the constant.
                for (const credentialName of missingCredentialNames) {
                    if (!new RegExp(`\\b${credentialName}\\b`).test(code)) continue;
                    if (!env.CI) this.error(getWarning(credentialName)); // Throw at build time.
                    this.warn(getWarning(credentialName));
                }
            },
        },
    };
}

/**
 * Optimizes the translations imported via webpack-i18n-tools' loader in the generated bundle, see
 * webpack-i18n-tools/optimizer. As the optimizer rewrites the translation usages in the code after the file name
 * hashes have been calculated, the content of the source language file en.po is additionally included in the hashes of
 * all files that could be affected, such that they're correctly cache-busted, for example by the service worker.
 */
function translationsOptimizerPlugin(): Plugin {
    const optimizer = poOptimizer() as Plugin;
    const augmentLanguageChunkHash = optimizer.augmentChunkHash as Extract<
        Plugin['augmentChunkHash'],
        (...args: any[]) => any
    >;
    // A superset of the translation usages that webpack-i18n-tools' optimizer rewrites.
    const translationUsageRegex = /[$.]t[ec]?\s*\(|i18n|keypath/;
    return {
        ...optimizer,
        augmentChunkHash(chunk) {
            const languageChunkHashAugmentation = augmentLanguageChunkHash.call(this, chunk);
            if (languageChunkHashAugmentation) return languageChunkHashAugmentation;
            if (path.basename(chunk.fileName).startsWith('vendor.')) return undefined; // skipped by the optimizer
            if (!Object.values(chunk.modules).some(({ code }) => code && translationUsageRegex.test(code))) {
                return undefined;
            }
            const referenceLanguageModuleId = [...this.getModuleIds()].find((moduleId) => /\ben\.po$/.test(moduleId));
            return this.getModuleInfo(referenceLanguageModuleId || '')?.code || undefined;
        },
    };
}

/**
 * Copies additional files to the build output and serves them in the dev server.
 * @param files - Map of output file names to source files, relative to the project root.
 */
function staticCopyPlugin(files: Record<string, string>): Plugin {
    return {
        name: 'wallet:static-copy',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const fileName = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
                if (!(fileName in files)) return next();
                res.setHeader('Content-Type', fileName.endsWith('.svg') ? 'image/svg+xml' : 'text/javascript');
                fs.createReadStream(path.join(rootDir, files[fileName])).pipe(res);
            });
        },
        generateBundle() {
            for (const [fileName, sourceFile] of Object.entries(files)) {
                this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(path.join(rootDir, sourceFile)) });
            }
        },
    };
}

/**
 * Generates the web app manifest and injects the related icons and meta tags into the html pages, as formerly done
 * by @vue/cli-plugin-pwa.
 */
function pwaManifestPlugin(appName: string): Plugin {
    const themeColor = '#4DBA87';
    const manifest = JSON.stringify({
        name: appName,
        short_name: appName,
        theme_color: themeColor,
        icons: [128, 192, 196].map((size) => ({
            src: `./img/icons/android-chrome-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png',
        })),
        start_url: '/',
        display: 'standalone',
        background_color: '#F8F8F8',
        description: 'Securely manage your Nimiq and Bitcoin accounts. Send and receive NIM and BTC, view balances, '
            + 'swap between NIM and BTC, and buy and sell with Nimiq OASIS.',
        screenshots: [
            '01-Send-and-receive',
            '02-More-than-NIM',
            '03-Buy-and-sell',
            '04-Your-keys-your-coins',
            '05-Security-first',
            // '06-Prestake-NIM',
        ].map((name) => ({
            src: `./img/screenshots/${name}.png`,
            sizes: '490x836',
            type: 'image/png',
        })),
    });
    return {
        name: 'wallet:pwa-manifest',
        configureServer(server) {
            server.middlewares.use('/manifest.json', (req, res) => {
                res.setHeader('Content-Type', 'application/manifest+json');
                res.end(manifest);
            });
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'manifest.json', source: manifest });
        },
        // Append the tags to the head, as @vue/cli-plugin-pwa did, instead of prepending them, which is Vite's
        // default. The theme-color metas for light and dark mode in the html pages then take precedence over the
        // generic theme-color, as browsers use the first matching one.
        transformIndexHtml: () => [
            ...[32, 16].map((size) => ({
                tag: 'link',
                attrs: {
                    rel: 'icon',
                    type: 'image/png',
                    sizes: `${size}x${size}`,
                    href: `/img/icons/favicon-${size}x${size}.png`,
                },
            })),
            { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.json' } },
            { tag: 'meta', attrs: { name: 'theme-color', content: themeColor } },
            { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'no' } },
            { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'default' } },
            { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: appName } },
            { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/img/icons/apple-touch-icon-152x152.png' } },
            {
                tag: 'link',
                attrs: { rel: 'mask-icon', href: '/img/icons/safari-pinned-tab.svg', color: themeColor },
            },
            { tag: 'meta', attrs: { name: 'msapplication-TileColor', content: '#1F2348' } },
        ].map((tag) => ({ ...tag, injectTo: 'head' as const })),
    };
}

/**
 * Adds subresource integrity (SRI) hashes to the service worker's precache manifest.
 */
function subresourceIntegrityManifestTransform(outDir: string): ManifestTransform {
    return (originalManifest) => {
        let sriAddedCounter = 0;
        let sriSkippedCounter = 0;
        const warnings: string[] = [];

        const manifest = originalManifest.map((entry) => {
            const assetPath = path.join(outDir, entry.url);
            if (!fs.existsSync(assetPath)) {
                warnings.push(`Could not find asset to add SRI for ${entry.url}`);
                sriSkippedCounter++;
                return entry;
            }

            const hash = createHash('sha384').update(fs.readFileSync(assetPath)).digest('base64');
            entry.integrity = `sha384-${hash}`;
            sriAddedCounter++;

            return entry;
        });

        // eslint-disable-next-line no-console
        console.log('\nSRI ADDED TO', sriAddedCounter, 'FILES,', sriSkippedCounter, 'SKIPPED');

        return { warnings, manifest };
    };
}

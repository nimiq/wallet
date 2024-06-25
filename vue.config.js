const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const createHash = require('crypto').createHash;

const webpack = require('webpack');
const PoLoaderOptimizer = require('webpack-i18n-tools/optimizer/webpack');

// Fix build for Node version with OpenSSL 3
const crypto = require('crypto');
const origCreateHash = crypto.createHash;
crypto.createHash = (alg, opts) => {
    return origCreateHash(alg === 'md4' ? 'md5' : alg, opts);
};

const buildName = process.env.NODE_ENV === 'production' ? process.env.build : 'local';
if (!buildName) {
    throw new Error('Please specify the build config with the `build` environment variable');
}

let release;
if (process.env.NODE_ENV !== 'production') {
    release = 'dev';
} else if (process.env.CI) {
    // CI environment variables are documented at https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
    release = `${process.env.CI_COMMIT_BRANCH}-${process.env.CI_PIPELINE_ID}-${process.env.CI_COMMIT_SHORT_SHA}`;
} else {
    release = child_process.execSync("git tag --points-at HEAD").toString().split('\n')[0];
}
if (!release) {
    throw new Error('The current commit must be tagged with the release version name.');
}

/**
 * Generate a subresource integrity (SRI) hash
 * @param {Buffer} asset
 * @return {string}
 */
function sri(asset) {
    const hash = createHash('sha384').update(asset).digest('base64');
    return `sha384-${hash}`;
}

// Accessible within client code via process.env.VUE_APP_*,
// see https://cli.vuejs.org/guide/mode-and-env.html#using-env-variables-in-client-side-code
process.env.VUE_APP_BITCOIN_JS_INTEGRITY_HASH = sri(fs.readFileSync(path.join(__dirname, 'public/bitcoin/BitcoinJS.min.js')));
process.env.VUE_APP_COPYRIGHT_YEAR = new Date().getUTCFullYear().toString(); // year at build time

console.log('Building for:', buildName, ', release:', `"wallet-${release}"`);

module.exports = {
    pages: {
        index: 'src/main.ts',
        'swap-kyc-handler': {
            // Unfortunately this includes the complete chunk-vendors and chunk-common, and even their css. Can we
            // improve this? The `chunks` option doesn't seem to be too useful here. At least the chunks should be
            // cached already, so maybe it's not that much of an overhead actually.
            entry: 'src/swap-kyc-handler.ts',
        },
    },
    /* Disable built-in integrity until compatible with configureWebpack.optimization.realContentHash, or that is removed. */
    // integrity: process.env.NODE_ENV === 'production',
    configureWebpack: {
        plugins: [
            new PoLoaderOptimizer(),
            new webpack.DefinePlugin({
                'process.env.SENTRY_RELEASE': `"wallet-${release}"`,
                'process.env.VERSION': `"${release}"`,
            }),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser', // Needed by stream-browserify
            }),
        ],
        // Resolve config for yarn build
        resolve: {
            alias: {
                config: path.join(__dirname, `src/config/config.${buildName}.ts`)
            },
            // In Webpack 5, NodeJS polyfills have to be explicitly configured
            fallback: {
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'), // Needed by bitcoinjs-lib/tiny-secp256k1
            },
        },
        // externals: {
        //     'bitcoinjs-lib': 'BitcoinJS',
        //     'buffer': 'BitcoinJS',
        // },
        optimization: {
            // Required to correctly cache-bust, as the ServiceWorker omits revision hashes when it detects a hash
            // in the filename. But that only works when filename hashes are calculated based on the real content
            // after e.g. i18n optimization.
            realContentHash: true,
        },
        experiments: {
            asyncWebAssembly: true,
        },
    },
    chainWebpack(config) {
        config
            .plugin('copy')
            .tap(([options]) => {
                return [{
                    patterns: [...options.patterns, {
                        from: 'node_modules/@nimiq/style/nimiq-style.icons.svg',
                        to: 'img',
                    }, {
                        from: 'node_modules/@nimiq/vue-components/dist/iqons.min.*.svg',
                        to: './img/[name][ext]',
                    }, {
                        from: 'node_modules/@nimiq/vue-components/dist/NimiqVueComponents.umd.min.lang-*.js',
                        to({ absoluteFilename }) {
                            const segments = absoluteFilename.split('/');
                            const fileName = segments[segments.length - 1];
                            // The bundled NimiqVueComponents.umd.js tries to load the non-minified files
                            return `./js/${fileName.replace('.min', '')}`;
                        },
                    }],
                }];
            });

        // Prefetching is disabled when `integrity: true` is used.
        if (config.plugins.has('prefetch')) config
            .plugin('prefetch')
            .tap(options => {
                // Ignore rarely used files.
                // Note that for production build, also the hash in the filename needs to be matched by the regexes.
                const blacklist = options[0].fileBlacklist || [];
                options[0].fileBlacklist = [
                    ...blacklist,
                    /\.map$/,
                    /settings.*?\.(js|css)$/,
                    /(migration-)?welcome-modal.*?\.(js|css)$/,
                    /disclaimer-modal.*?\.(js|css)$/,
                    /country-names-.+?\.js$/, // only needed for Intl.DisplayNames polyfill and only one of them needed
                    /lang-[^-]+-po.*?\.js$/, // only one of them needed
                ];
                return options
            });

        config.module
            .rule('po')
                .test(/\.pot?$/)
                    .use('po-loader')
                        .loader('webpack-i18n-tools')
                        .end()
                .end();

        config.module
            .rule('ts')
            .use('ts-loader')
                .loader('ts-loader')
                .tap(options => {
                    options.configFile = `tsconfig.${buildName}.json`
                    return options
                });
    },
    // Note: the pwa is only setup on production builds, thus to test this config, a production build has to be built
    // and manually served, e.g. via python -m SimpleHTTPServer 8081, instead of a simple yarn --serve
    pwa: {
        name: {
            mainnet: 'Nimiq PoS Wallet',
            testnet: 'PoS Testnet Wallet',
            local: 'PoS Local Wallet',
        }[buildName],
        msTileColor: '#1F2348',
        manifestOptions: {
            start_url: '/',
            display: 'standalone',
            background_color: '#F8F8F8',
            icons: [
                {
                    src: "./img/icons/android-chrome-128x128.png",
                    sizes: "128x128",
                    type: "image/png"
                },
                {
                    src: "./img/icons/android-chrome-192x192.png",
                    sizes: "192x192",
                    type: "image/png"
                },
                {
                    src: "./img/icons/android-chrome-196x196.png",
                    sizes: "196x196",
                    type: "image/png"
                },
            ],
            description: "Securely manage your Nimiq and Bitcoin accounts. Send and receive NIM and BTC, view balances, swap between NIM and BTC, and buy and sell with Nimiq OASIS.",
            screenshots: [
                {
                    src: "./img/screenshots/01-Send-and-receive.png",
                    sizes: "490x836",
                    type: "image/png"
                },
                {
                    src: "./img/screenshots/02-More-than-NIM.png",
                    sizes: "490x836",
                    type: "image/png"
                },
                {
                    src: "./img/screenshots/03-Buy-and-sell.png",
                    sizes: "490x836",
                    type: "image/png"
                },
                {
                    src: "./img/screenshots/04-Your-keys-your-coins.png",
                    sizes: "490x836",
                    type: "image/png"
                },
                {
                    src: "./img/screenshots/05-Security-first.png",
                    sizes: "490x836",
                    type: "image/png"
                },
                // {
                //     src: "./img/screenshots/06-Prestake-NIM.png",
                //     sizes: "490x836",
                //     type: "image/png"
                // },
            ]
        },
        iconPaths: {
            faviconSVG: null,
            msTileImage: null,
        },
        workboxOptions: {
            exclude: [
                /^server-time$/, // File needs to be fetched from server in Time.ts
                // Defaults set by @vue/cli-plugin-pwa, which is in line with the recommendation to not cache icons,
                // developer.chrome.com/docs/workbox/precaching-dos-and-donts/#dont-precache-responsive-images-or-favicons
                /\.map$/,
                /img\/icons\//,
                /favicon\.ico$/,
                /^manifest.*\.js?$/
            ],
            cleanupOutdatedCaches: true,
            clientsClaim: true, // Start controlling all clients when activated (should prevent stale secondary tabs)
            manifestTransforms: [
                (originalManifest, compilation) => {
                    let sriAddedCounter = 0;
                    let sriSkippedCounter = 0;

                    const warnings = [];

                    const manifest = originalManifest.map(entry => {
                        const assetName = entry.url.substring(1);
                        const asset = compilation.getAsset(assetName);

                        if (!asset) {
                            warnings.push(`Could not find asset to add SRI for ${entry.url}`);
                            sriSkippedCounter++;
                            return entry;
                        }

                        entry.integrity = sri(asset.source.source());
                        sriAddedCounter++;

                        return entry;
                    });

                    console.log("\nSRI ADDED TO", sriAddedCounter, "FILES,", sriSkippedCounter, "SKIPPED");

                    return { warnings, manifest };
                },
            ],
        },
    },

    // For iOS debugging in BrowserStack, BrowserStack's localhost tunnel bs-local.com needs to be used, see
    // https://www.browserstack.com/docs/live/local-testing/ios-troubleshooting-guide. However, on bs-local.com features
    // only available on https like crypto.subtle or service workers do not work unless served as https. The Hub also
    // needs to served with this option and the Keyguard has to be served over https as well. Safari has problems to
    // open the https page with invalid certificate, but Chrome iOS works and also uses the Safari engine. To be able to
    // use the dev tools with Chrome iOS on BrowserStack, launch BrowserStack with Safari first, then switch to Chrome.
    ...(process.env['browserstack-ios-testing'] ? {
        devServer: {
            https: true,
            allowedHosts: 'all',
        },
    } : null),
};

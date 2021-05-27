const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const createHash = require('crypto').createHash;

const webpack = require('webpack');
const SriPlugin = require('webpack-subresource-integrity');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const PoLoaderOptimizer = require('webpack-i18n-tools')();

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

// Accesible within client code via process.env.VUE_APP_BITCOIN_JS_INTEGRITY_HASH,
// see https://cli.vuejs.org/guide/mode-and-env.html#using-env-variables-in-client-side-code
process.env.VUE_APP_BITCOIN_JS_INTEGRITY_HASH = `sha384-${createHash('sha384')
    .update(fs.readFileSync(path.join(__dirname, 'public/bitcoin/BitcoinJS.min.js')))
    .digest('base64')}`;

console.log('Building for:', buildName, ', release:', `"wallet-${release}"`);

module.exports = {
    integrity: true,
    configureWebpack: {
        output: {
            crossOriginLoading: 'anonymous',
        },
        plugins: [
            new SriPlugin({
                hashFuncNames: ['sha384'],
                enabled: process.env.NODE_ENV === 'production',
            }),
            new PoLoaderOptimizer(),
            new webpack.DefinePlugin({
                'process.env': {
                    SENTRY_RELEASE: `"wallet-${release}"`,
                },
            }),
        ],
        // Resolve config for yarn build
        resolve: {
            alias: {
                config: path.join(__dirname, `src/config/config.${buildName}.ts`)
            }
        },
        devtool: 'source-map', // TEMP: only 'source-map' allowed by webpack-i18-tools, will be fixed in future versions.
        // externals: {
        //     'bitcoinjs-lib': 'BitcoinJS',
        //     'buffer': 'BitcoinJS',
        // },
    },
    chainWebpack(config) {
        config
            .plugin('copy-webpack-plugin')
            .use(CopyWebpackPlugin, [[
                { from: 'node_modules/@nimiq/style/nimiq-style.icons.svg', to: 'img' },
                {
                    from: 'node_modules/@nimiq/vue-components/dist/iqons.min.*.svg',
                    to: './img/',
                    flatten: true,
                },
                {
                    from: 'node_modules/@nimiq/vue-components/dist/qr-scanner-worker.min.*.js',
                    to: './js/',
                    flatten: true,
                },
                {
                    from: 'node_modules/@nimiq/vue-components/dist/NimiqVueComponents.umd.min.lang-*.js',
                    to: './js/',
                    flatten: true,
                    transformPath(path) {
                        // The bundled NimiqVueComponents.umd.js tries to load the the non-minified files
                        return path.replace('.min', '');
                    },
                },
            ]]);

        config
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
            .rule('eslint')
            .use('eslint-loader')
                .loader('eslint-loader')
                .tap(options => {
                    options.emitWarning = process.env.NODE_ENV === 'production' ? false : true;
                    return options;
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
    pwa: {
        name: 'Nimiq Wallet',
        themeColor: null,
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
        },
    },
};

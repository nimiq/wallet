// eslint-disable-next-line @typescript-eslint/no-var-requires
const CopyWebpackPlugin = require('copy-webpack-plugin');
const PoLoaderOptimizer = require('webpack-i18n-tools')();

module.exports = {
    configureWebpack: {
        plugins: [
            new PoLoaderOptimizer(),
        ],
        devtool: 'source-map', // TEMP: only 'source-map' allowed by webpack-i18-tools, will be fixed in future versions.
    },
    chainWebpack(config) {
        config
            .plugin('copy-webpack-plugin')
            .use(CopyWebpackPlugin, [[
                { from: 'node_modules/@nimiq/style/nimiq-style.icons.svg', to: 'img' },
                { from: 'node_modules/@nimiq/vue-components/dist/img/iqons.min*.svg', to: 'img/iqons.min.svg' },
                { from: 'node_modules/@nimiq/vue-components/dist/qr-scanner-worker.min.js', to: 'js/qr-scanner-worker.min.js' },
            ]]);

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
    },
};

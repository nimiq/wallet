// eslint-disable-next-line @typescript-eslint/no-var-requires
const CopyWebpackPlugin = require('copy-webpack-plugin');
const PoLoaderOptimizer = require('webpack-i18n-tools')();

module.exports = {
    configureWebpack: {
        plugins: [
            new PoLoaderOptimizer(),
        ],
        devtool: 'source-map', // TEMP: needed by webpack-i18-tools
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
            .rule('po')
                .test(/\.pot?$/)
                    .use('po-loader')
                        .loader('webpack-i18n-tools')
                        .end()
                .end();
    },
};

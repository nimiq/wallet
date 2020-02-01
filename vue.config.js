const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    chainWebpack(config) {
        config
            .plugin('copy-webpack-plugin')
            .use(CopyWebpackPlugin, [[
                { from: 'node_modules/@nimiq/style/nimiq-style.icons.svg', to: 'img' },
                // { from: 'node_modules/@nimiq/core-web/worker*', to: 'nimiq', flatten: true },
                { from: 'node_modules/@nimiq/vue-components/dist/img/iqons.min*.svg', to: 'img/iqons.min.svg' },
            ]]);
    },
}

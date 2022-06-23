import { ENV_TEST } from '../lib/Constants';

export default {
    hubEndpoint: 'https://hub.nimiq-testnet.com',
    environment: ENV_TEST,
    nimiqScript: 'https://cdn.nimiq-testnet.com/v1.5.8/web.js',
    reportToSentry: true,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 2 * 60e3, // 2 minutes

    fastspot: {
        enabled: true,
        apiEndpoint: 'https://api.test.fastspot.io/fast/v1',
        // This is a publishable key
        apiKey: 'd011aeea-41cf-4c05-a31d-436495bed9b7',
        watchtowerEndpoint: 'https://watch.fastspot.io/test',
        feePercentage: 0.0025, // 0.25%
        sepaFee: 0, // Euro
    },

    oasis: {
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1%
        minFee: 0.50, // Euro
        minBuyAmount: 0, // Euro
    },

    TEN31Pass: {
        apiEndpoint: 'https://test.pass.ten31.com',
        appId: 'e0d5cdbe-bdb6-41a1-83bf-72cf72dc48ac',
    },

    moonpay: {
        enabled: false,
        // This is a publishable key
        widgetUrl: 'https://buy-staging.moonpay.com?apiKey=pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO',
        signatureEndpoint: 'https://mun.soerenschwert.de',
    },

    simplex: {
        enabled: false,
        formScriptUrl: 'https://iframe.sandbox.test-simplexcc.com/form-sdk.js',
        sdkScriptUrl: 'https://cdn.test-simplexcc.com/sdk/v1/js/sdk.js',
        splxScriptUrl: null,
        apiKey: 'pk_test_4cc61433-31dc-4020-b442-ba7b77cc9fa7',
    },
};

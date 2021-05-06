import { ENV_DEV } from '../lib/Constants';

export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    networkEndpoint: 'https://network.nimiq-testnet.com',
    reportToSentry: false,
    enableBitcoin: true,

    fastspot: {
        apiEndpoint: 'https://api.test.fastspot.io/fast/v1',
        // This is a publishable key
        apiKey: 'd011aeea-41cf-4c05-a31d-436495bed9b7',
        watchtowerEndpoint: 'https://watch.fastspot.io/test',
        feePercentage: 0.0025, // 0.25%
        sepaFee: 0, // Euro
    },

    oasis: {
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1% - only used for estimate creation
        minFee: 0.10, // Euro
    },

    moonpay: {
        // This is a publishable key
        widgetUrl: 'https://buy-staging.moonpay.com?apiKey=pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO',
        signatureEndpoint: 'https://mun.soerenschwert.de',
    },

    simplex: {
        formScriptUrl: 'https://iframe.sandbox.test-simplexcc.com/form-sdk.js',
        sdkScriptUrl: 'https://cdn.test-simplexcc.com/sdk/v1/js/sdk.js',
        apiKey: 'pk_test_0c3e2ecd-1546-4068-ae01-d49382e1266a',
    },
};

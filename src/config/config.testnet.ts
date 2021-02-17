import { ENV_TEST } from '../lib/Constants';

export default {
    hubEndpoint: 'https://hub.nimiq-testnet.com',
    environment: ENV_TEST,
    networkEndpoint: 'https://network.nimiq-testnet.com',
    reportToSentry: true,
    enableBitcoin: true,

    fastspot: {
        apiEndpoint: 'https://api.test.fastspot.io/fast/v1',
        // This is a publishable key
        apiKey: 'd011aeea-41cf-4c05-a31d-436495bed9b7',
        watchtowerEndpoint: 'https://watch.fastspot.io/test',
        feePercentage: 0.0025, // 0.25%
    },

    oasis: {
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1%
    },

    moonpay: {
        // This is a publishable key
        widgetUrl: 'https://buy-staging.moonpay.com?apiKey=pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO',
        signatureEndpoint: 'https://mun.soerenschwert.de',
    },
};

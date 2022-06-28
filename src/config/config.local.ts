import { ENV_DEV } from '../lib/Constants';

export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    nimiqScript: 'https://cdn.nimiq-testnet.com/v1.5.8/web.js',
    networkEndpoint: 'https://seed1.v2.nimiq-testnet.com:8648/ws?secret=Chei2Agh2obo5each1shuopop',
    faucetEndpoint: 'https://faucet.nimiq-testnet.com',
    reportToSentry: false,
    enableBitcoin: false,
    pageVisibilityTxRefreshInterval: 1 * 60e3, // 1 minute

    fastspot: {
        enabled: false,
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
        minFee: 0.50, // Euro
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
        splxScriptUrl: null as string | null,
        apiKey: 'pk_test_0c3e2ecd-1546-4068-ae01-d49382e1266a',
    },
};

import { ENV_DEV } from '../lib/Constants';

export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    networkEndpoint: 'https://network.nimiq-testnet.com',
    reportToSentry: false,
    enableBitcoin: true,

    fastspot: {
        apiEndpoint: 'https://api.test.fastspot.io/fast/v1',
        apiKey: 'd011aeea-41cf-4c05-a31d-436495bed9b7',
        watchtowerEndpoint: 'https://watch.fastspot.io/test',
    },

    oasis: {
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1% - only used for estimate creation
    },
};

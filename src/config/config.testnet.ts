import { ENV_TEST } from '../lib/Constants';

export default {
    hubEndpoint: 'https://hub.nimiq-testnet.com',
    environment: ENV_TEST,
    networkEndpoint: 'https://network.nimiq-testnet.com',
    reportToSentry: true,
    enableBitcoin: true,

    fastspot: {
        apiEndpoint: 'https://testnet-v1.fastspot.io/fast/v1',
        apiKey: 'd011aeea-41cf-4c05-a31d-436495bed9b7',
    },
};

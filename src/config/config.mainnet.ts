import { ENV_MAIN } from '../lib/Constants';

export default {
    hubEndpoint: 'https://hub.nimiq.com',
    environment: ENV_MAIN,
    networkEndpoint: 'https://network.nimiq.com',
    reportToSentry: true,
    enableBitcoin: true,

    fastspot: {
        apiEndpoint: 'https://v1.fastspot.io/fast/v1',
        apiKey: '',
    },
};

import { ENV_DEV } from '../lib/Constants';

export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    networkEndpoint: 'https://network.nimiq-testnet.com',
    reportToSentry: false,
};

import { ENV_MAIN } from '../lib/Constants';

export default {
    hubEndpoint: 'https://hub.nimiq.com',
    environment: ENV_MAIN,
    networkEndpoint: 'https://network.nimiq.com',
    reportToSentry: true,
    enableBitcoin: true,

    fastspot: {
        apiEndpoint: 'https://api.go.fastspot.io/fast/v1',
        // This is a publishable key
        apiKey: 'c20d43d0-8f60-4fca-a298-85e80f64d042',
        watchtowerEndpoint: 'https://watch.fastspot.io/main',
        feePercentage: 0.0025, // 0.25%
        sepaFee: 0.25, // Euro
    },

    oasis: {
        apiEndpoint: 'https://oasis.ten31.com/v1',
        feePercentage: 0.01, // 1%
        minFee: 0.10, // Euro
    },

    moonpay: {
        // This is a publishable key
        widgetUrl: 'https://buy.moonpay.com?apiKey=pk_live_fBJsMWLtYLqqRR1mtw8mr4fQ7lCMakNL',
        signatureEndpoint: 'https://mun.soerenschwert.de',
    },
};

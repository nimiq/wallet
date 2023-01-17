import { ENV_MAIN } from '../lib/Constants';

export default {
    hubEndpoint: 'https://hub.nimiq.com',
    environment: ENV_MAIN,
    nimiqScript: 'https://cdn.nimiq.com/v1.5.8/web.js',
    reportToSentry: false,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 5 * 60e3, // 5 minutes

    usdc: {
        enabled: true,
        networkId: 137 as number | string, // Can also be 'matic'
        rpcEndoint: 'https://polygon-rpc.com',
        usdcContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        usdcTransferContract: '',
        relayHubContract: '0x6C28AfC105e65782D9Ea6F2cA68df84C9e7d750d',
        uniswapFactoryContract: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        wmaticContract: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        startHistoryScanHeight: 36774144, // From which block to fetch transaction history
    },

    fastspot: {
        enabled: true,
        apiEndpoint: 'https://api.go.fastspot.io/fast/v1',
        // This is a publishable key
        apiKey: 'c20d43d0-8f60-4fca-a298-85e80f64d042',
        watchtowerEndpoint: 'https://watch.fastspot.io/main',
        feePercentage: 0.0025, // 0.25%
        sepaFee: 0.25, // Euro
    },

    oasis: {
        underMaintenance: true,
        apiEndpoint: 'https://oasis.ten31.com/v1',
        feePercentage: 0.01, // 1%
        minFee: 1, // Euro
        minBuyAmount: 5, // Euro
        maxFreeAmount: 999, // Euro
        maxKycAmount: 4999, // Euro
    },

    ten31Pass: {
        enabled: false,
        apiEndpoint: 'https://pass.ten31.com',
        appId: '',
        services: {},
    },

    moonpay: {
        enabled: true,
        // This is a publishable key
        widgetUrl: 'https://buy.moonpay.com?apiKey=pk_live_fBJsMWLtYLqqRR1mtw8mr4fQ7lCMakNL',
        signatureEndpoint: 'https://mun.soerenschwert.de',
    },

    simplex: {
        enabled: true,
        formScriptUrl: 'https://iframe.simplex-affiliates.com/form-sdk.js',
        sdkScriptUrl: 'https://cdn.simplex.com/sdk/v1/js/sdk.js',
        splxScriptUrl: 'https://checkout.simplexcc.com/splx.js',
        apiKey: 'pk_live_c33fd2b9-39e7-472b-8330-f96a9ff07573',
    },
};

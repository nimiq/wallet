import { ENV_TEST } from '../lib/Constants';

// Note: you'll usually want to use the reactive variant exported by useConfig instead of the plain Config, especially
// in component templates (where the reactive config is also available as $config), computed props and watchers. Use of
// the reactive config is not possible in Vue 2 before the composition-api plugin has been registered.
export default {
    hubEndpoint: 'https://hub.nimiq-testnet.com',
    environment: ENV_TEST,
    nimiqScript: 'https://cdn.nimiq-testnet.com/v1.5.8/web.js',
    reportToSentry: false,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 2 * 60e3, // 2 minutes

    usdc: {
        enabled: true,
        networkId: 80001 as number | string, // Can also be 'maticmum'
        rpcEndoint: 'https://matic-mumbai.chainstacklabs.com',
        usdcContract: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
        usdcTransferContract: '0x443EAAd5EeAacCdC3887477c188CF2875B3dcf7c',
        relayHubContract: '0x6646cD15d33cE3a6933e36de38990121e8ba2806',
        uniswapFactoryContract: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        uniswapQuoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        wmaticContract: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
        startHistoryScanHeight: 29621817, // From which block to fetch transaction history
    },

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
        underMaintenance: false,
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1%
        minFee: 0.50, // Euro
        minBuyAmount: 0, // Euro
        maxFreeAmount: 999, // Euro
        maxKycAmount: 4999, // Euro
    },

    ten31Pass: {
        enabled: true,
        apiEndpoint: 'https://test.pass.ten31.com',
        appId: 'e0d5cdbe-bdb6-41a1-83bf-72cf72dc48ac',
        services: {
            s3: {
                // Fastspot test instance
                serviceId: '6cc93627-6b35-4c3f-9763-f03fe749631c',
                usageIds: {
                    swap: '2b099ff4-6ab8-45f4-a872-af8a321790a8',
                },
            },
            oasis: {
                // OASIS sandbox
                serviceId: '1bb1475f-4535-4019-b0a8-7e07486e9b6a',
                usageIds: {
                    clearing: 'fb4f315c-15d0-4b78-8f63-6838de698e96',
                    settling: '016db75e-b86e-4a8d-83aa-74cc7d80dc03',
                },
            },
        },
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

import { SwapAsset } from '@nimiq/fastspot-api';
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

    prestaking: {
        startDate: new Date('3024-10-07T00:00:00Z'),
        endDate: new Date('3024-11-11T00:00:00Z'),
        totalPrestakeEndpoint: 'https://v2.test.nimiqwatch.com/api/v2/total-prestake',
    },

    usdc: {
        enabled: true,
        networkId: 80001,
        rpcEndpoint: 'wss://polygon-mumbai.g.alchemy.com/v2/#ALCHEMY_API_KEY#',
        rpcMaxBlockRange: 1_296_000, // 30 days - Range not limited, only limited by number of logs returned
        usdcContract: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
        nativeUsdcContract: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97',
        transferContract: '0x2805f3187dcDfa424EFA8c55Db6012Cf08Fa6eEc', // v3
        nativeTransferContract: '0x5D101A320547f8D640c44fDfe5d1f35224f00B8B', // v1
        htlcContract: '0x2EB7cd7791b947A25d629219ead941fCd8f364BF', // v3
        nativeHtlcContract: '0xA9fAbABE97375565e4A9Ac69A57Df33c91FCB897',
        swapContract: '0xf4a619F6561CeE543BDa9BBA0cAC68758B607714', // v2
        swapPoolContract: '0x8292Be650A20D30A21436601bFb1ea0e1143d901',
        relayHubContract: '0x6646cD15d33cE3a6933e36de38990121e8ba2806',
        uniswapQuoterContract: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        wmaticContract: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
        earliestHistoryScanHeight: 29621817, // see config.local.ts
        earliestNativeHistoryScanHeight: 36560732, // Native USDC contract creation block
    },

    fastspot: {
        enabled: true, // Set to false to hide the swap feature.
        enabledSwapAssets: [SwapAsset.NIM, SwapAsset.BTC, SwapAsset.USDC_MATIC],
        apiEndpoint: 'https://api.test.fastspot.io/fast/v1',
        // This is a publishable key
        apiKey: 'd011aeea-41cf-4c05-a31d-436495bed9b7',
        watchtowerEndpoint: 'https://watch.fastspot.io/test',
        feePercentage: 0.0025, // 0.25%
        sepaFee: 0, // Euro
    },

    oasis: {
        underMaintenance: true,
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1%
        minFee: 0.50, // Euro
        minBuyAmount: 35, // Euro
        maxFreeAmount: 999, // Euro
        maxKycAmount: 4999, // Euro
    },

    ten31Pass: {
        enabled: false,
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
        clientApiKey: 'pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO',
        signatureEndpoint: 'https://moosign.nimiq.network',
    },

    simplex: {
        enabled: false,
        formScriptUrl: 'https://iframe.sandbox.test-simplexcc.com/form-sdk.js',
        sdkScriptUrl: 'https://cdn.test-simplexcc.com/sdk/v1/js/sdk.js',
        splxScriptUrl: null,
        apiKey: 'pk_test_4cc61433-31dc-4020-b442-ba7b77cc9fa7',
    },

    goCrypto: {
        enabled: true,
        apiEndpoint: 'https://api.staging.gocrypto.com/',
        // This is a publishable key. This is the key from chapter 4 of the documentation.
        apiKey: 'ae7344d0-3839-4732-bf57-c2489b92dc62',
    },

    nimiqPay: {
        cosignerPublicKeys: [
            'c1534c708122968212c6709526801d18218ce9303590f2bca473213d99b24aaf',
        ],
    },
};

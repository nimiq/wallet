import { SwapAsset } from '@nimiq/fastspot-api';
import { ENV_TEST } from '../lib/Constants';

// Note: you'll usually want to use the reactive variant exported by useConfig instead of the plain Config, especially
// in component templates (where the reactive config is also available as $config), computed props and watchers. Use of
// the reactive config is not possible in Vue 2 before the composition-api plugin has been registered.
export default {
    hubEndpoint: 'https://hub.nimiq-testnet.com',
    environment: ENV_TEST,
    nimiqSeeds: [
        '/dns4/seed1.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed2.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed3.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed4.pos.nimiq-testnet.com/tcp/8443/wss',
    ],
    disableNetworkInteraction: false,
    showHelpButton: true,
    faucetEndpoint: 'https://faucet.pos.nimiq-testnet.com',
    reportToSentry: true,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 2 * 60e3, // 2 minutes

    demo: {
        // Controls if demo mode is enabled. When set to a string, demo mode is only enabled
        // if the current hostname matches this value. When true, demo mode is always enabled.
        enabled: false,
    },

    staking: {
        prestakingStartBlock: 3_023_730,
        prestakingEndBlock: 3_028_050,
        transitionBlock: 3_032_010,
        validatorsApiBase: 'https://validators-api-testnet.nuxt.dev',
        validatorsPath: '/api/v1/validators',
        stakeEventsEndpoint: 'https://v2.test.nimiqwatch.com/api/v2/staker/ADDRESS/events?filter=add-stake',
        genesis: {
            height: 3032010,
            date: new Date('2024-11-13T20:00:00Z'),
            supply: 12_030_755_339_52899,
        },
    },

    polygon: {
        enabled: false,
        networkId: 80002,
        rpcEndpoint: 'wss://polygon-amoy.g.alchemy.com/v2/#ALCHEMY_API_KEY#',
        rpcMaxBlockRange: 1_296_000, // 30 days - Range not limited, only limited by number of logs returned
        usdc_bridged: {
            tokenContract: '',
            transferContract: '', // v3
            htlcContract: '', // v3
            earliestHistoryScanHeight: 13320830, // Block when Wallet was switched to Amoy testnet
        },
        usdc: {
            tokenContract: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
            transferContract: '', // v1
            htlcContract: '',
            earliestHistoryScanHeight: 13320830, // Block when Wallet was switched to Amoy testnet
        },
        usdt_bridged: {
            tokenContract: '0x1616d425Cd540B256475cBfb604586C8598eC0FB',
            transferContract: '',
            htlcContract: '',
            earliestHistoryScanHeight: 13320830, // Block when USDT was added to the Wallet
        },
        usdcConversion: {
            swapContract: '', // v2
            swapPoolContract: '',
        },
        openGsnRelayHubContract: '',
        uniswapQuoterContract: '',
        wpolContract: '0xA5733b3A8e62A8faF43b0376d5fAF46E89B3033E',
    },

    fastspot: {
        enabled: true, // Set to false to hide the swap feature.
        enabledSwapAssets: [SwapAsset.NIM, SwapAsset.BTC],
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
            '1a0fc4eb1376b604c7df66d098b29bbb2fcfd68ef328ce98ae0f7d19f4f6d456',
        ],
    },

    matomo: {
        enabled: false,
        host: '',
        siteId: 0,
    },
};

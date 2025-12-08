import { SwapAsset } from '@nimiq/fastspot-api';
import { ENV_DEV } from '../lib/Constants';

// Note: you'll usually want to use the reactive variant exported by useConfig instead of the plain Config, especially
// in component templates (where the reactive config is also available as $config), computed props and watchers. Use of
// the reactive config is not possible in Vue 2 before the composition-api plugin has been registered.
export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    debugMainnetMode: true, // Enable mainnet connection for local debugging
    nimiqSeeds: [
        '/dns4/aurora.seed.nimiq.com/tcp/443/wss',
        '/dns4/catalyst.seed.nimiq.network/tcp/443/wss',
        '/dns4/cipher.seed.nimiq-network.com/tcp/443/wss',
        '/dns4/eclipse.seed.nimiq.cloud/tcp/443/wss',
        '/dns4/lumina.seed.nimiq.systems/tcp/443/wss',
        '/dns4/nebula.seed.nimiq.com/tcp/443/wss',
        '/dns4/nexus.seed.nimiq.network/tcp/443/wss',
        '/dns4/polaris.seed.nimiq-network.com/tcp/443/wss',
        '/dns4/photon.seed.nimiq.cloud/tcp/443/wss',
        '/dns4/pulsar.seed.nimiq.systems/tcp/443/wss',
        '/dns4/quasar.seed.nimiq.com/tcp/443/wss',
        '/dns4/solstice.seed.nimiq.network/tcp/443/wss',
        '/dns4/vortex.seed.nimiq.cloud/tcp/443/wss',
        '/dns4/zenith.seed.nimiq.systems/tcp/443/wss',
    ],
    disableNetworkInteraction: false,
    showHelpButton: true,
    faucetEndpoint: '', // No faucet on mainnet
    reportToSentry: false,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 1 * 60e3, // 1 minute (dev-friendly, faster than mainnet's 5 min)

    staking: {
        // Mainnet staking configuration
        prestakingStartBlock: 3_392_200, // 2024-10-06T02:53:18Z
        prestakingEndBlock: 3_456_000, // ~2024-11-19T16:00:00Z
        transitionBlock: 3_456_000,
        validatorsApiBase: 'https://validators-api-mainnet.nuxt.dev',
        validatorsPath: '/api/v1/validators',
        stakeEventsEndpoint: 'https://v2.nimiqwatch.com/api/v2/staker/ADDRESS/events/restake-grouped',
        genesis: {
            height: 3456000,
            date: new Date('2024-11-19T16:00:00Z'),
            supply: 12_893_109_654_06244,
        },
    },

    polygon: {
        enabled: true, // Mainnet Polygon enabled
        networkId: 137, // Mainnet
        rpcEndpoint: 'wss://polygon-mainnet.g.alchemy.com/v2/#ALCHEMY_API_KEY#',
        rpcMaxBlockRange: 648_000, // 15 days - Maximum supported range by Alchemy?
        usdc_bridged: {
            tokenContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            transferContract: '0x98E69a6927747339d5E543586FC0262112eBe4BD',
            htlcContract: '0xF615bD7EA00C4Cc7F39Faad0895dB5f40891359f',
            earliestHistoryScanHeight: 39624290, // see config.local.ts
        },
        usdc: {
            tokenContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            transferContract: '0x3157d422cd1be13AC4a7cb00957ed717e648DFf2',
            htlcContract: '0x0cFD862bE942846Cebad797d7c1BC6e47714959b',
            earliestHistoryScanHeight: 45319261, // Native USDC contract creation block
        },
        usdt_bridged: {
            tokenContract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            transferContract: '0x98E69a6927747339d5E543586FC0262112eBe4BD',
            htlcContract: '0xF615bD7EA00C4Cc7F39Faad0895dB5f40891359f',
            earliestHistoryScanHeight: 63189500, // Block when USDT was added to the Wallet
        },
        usdcConversion: {
            swapContract: '0xfAbBed813017bF535b40013c13b8702638aC25CD',
            swapPoolContract: '0xD36ec33c8bed5a9F7B6630855f1533455b98a418',
        },
        openGsnRelayHubContract: '0x6C28AfC105e65782D9Ea6F2cA68df84C9e7d750d',
        uniswapQuoterContract: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        wpolContract: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    },

    fastspot: {
        enabled: true, // Set to false to hide the swap feature.
        enabledSwapAssets: [SwapAsset.NIM, SwapAsset.BTC, SwapAsset.USDC_MATIC, SwapAsset.USDT_MATIC],
        apiEndpoint: 'https://api.go.fastspot.io/fast/v1', // Mainnet
        // This is a publishable key
        apiKey: 'c20d43d0-8f60-4fca-a298-85e80f64d042', // Mainnet key
        watchtowerEndpoint: 'https://watch.fastspot.io/main', // Mainnet
        feePercentage: 0.0025, // 0.25%
        sepaFee: 0.25, // Euro
    },

    oasis: {
        underMaintenance: true,
        apiEndpoint: 'https://oasis.ten31.com/v1', // Mainnet
        feePercentage: 0.01, // 1% - only used for estimate creation
        minFee: 1, // Euro
        minBuyAmount: 5, // Euro
        maxFreeAmount: 999, // Euro
        maxKycAmount: 4999, // Euro
    },

    ten31Pass: {
        enabled: false,
        apiEndpoint: window.sessionStorage['use-local-kyc-server'] // switch that can be set to use local kyc server
            // Note that locally signed grants are not actually eligible for higher limits on the deployed Fastspot and
            // OASIS test instances because they don't exist in the deployed TEN31 Pass's database.
            ? `http://${window.location.hostname}:8082`
            : 'https://test.pass.ten31.com',
        appId: window.location.protocol === 'https:'
            ? 'ecf6f03e-7af0-4af8-a4a8-c3a8cc16e168'
            : 'acd38dfa-f77b-4c40-b6b1-f461bf47f9d4',
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
        splxScriptUrl: null as string | null,
        apiKey: 'pk_test_0c3e2ecd-1546-4068-ae01-d49382e1266a',
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

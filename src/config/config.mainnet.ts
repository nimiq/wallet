import { SwapAsset } from '@nimiq/fastspot-api';
import { ENV_MAIN } from '../lib/Constants';

// Note: you'll usually want to use the reactive variant exported by useConfig instead of the plain Config, especially
// in component templates (where the reactive config is also available as $config), computed props and watchers. Use of
// the reactive config is not possible in Vue 2 before the composition-api plugin has been registered.
export default {
    hubEndpoint: 'https://hub.nimiq.com',
    environment: ENV_MAIN,
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
    enableFeedback: true,
    faucetEndpoint: '',
    reportToSentry: true,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 5 * 60e3, // 5 minutes

    staking: {
        // The block heights determining the on-chain pre-staking window. All transactions inside this window count
        // for pre-staking.
        prestakingStartBlock: 3_392_200, // 2024-10-06T02:53:18Z
        prestakingEndBlock: 3_456_000, // ~2024-11-19T16:00:00Z
        transitionBlock: 3_456_000,
        validatorsApiBase: 'https://validators-api-mainnet.nuxt.dev',
        validatorsPath: '/api/v1/validators',
        stakeEventsEndpoint: 'https://v2.nimiqwatch.com/api/v2/staker/ADDRESS/events?filter=add-stake',
        genesis: {
            height: 3456000,
            date: new Date('2024-11-19T16:00:00Z'),
            supply: 12_893_109_654_06244,
        },
    },

    polygon: {
        enabled: true,
        networkId: 137,
        rpcEndpoint: 'wss://polygon-mainnet.g.alchemy.com/v2/#ALCHEMY_API_KEY#',
        rpcMaxBlockRange: 1_296_000, // 30 days - Range not limited, only limited by number of logs returned
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
        clientApiKey: 'pk_live_fBJsMWLtYLqqRR1mtw8mr4fQ7lCMakNL',
        signatureEndpoint: 'https://moosign.nimiq.network',
    },

    simplex: {
        enabled: true,
        formScriptUrl: 'https://iframe.simplex-affiliates.com/form-sdk.js',
        sdkScriptUrl: 'https://cdn.simplex.com/sdk/v1/js/sdk.js',
        splxScriptUrl: 'https://checkout.simplexcc.com/splx.js',
        apiKey: 'pk_live_c33fd2b9-39e7-472b-8330-f96a9ff07573',
    },

    goCrypto: {
        enabled: true,
        apiEndpoint: 'https://api.gocrypto.com/',
        // This is a publishable key.
        apiKey: '606abde2-bc23-46c6-9f2e-a53307bae0bb',
    },

    nimiqPay: {
        cosignerPublicKeys: [
            '91b21f4b100273bd7034f6369c29d1f7ba72dba7de6720ad3cd8b81916218913',
        ],
    },

    matomo: {
        enabled: true,
        host: 'https://stats.nimiq-network.com',
        siteId: 214,
    },
};

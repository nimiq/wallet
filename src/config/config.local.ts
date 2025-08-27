import { SwapAsset } from '@nimiq/fastspot-api';
import { ENV_DEV } from '../lib/Constants';

// Note: you'll usually want to use the reactive variant exported by useConfig instead of the plain Config, especially
// in component templates (where the reactive config is also available as $config), computed props and watchers. Use of
// the reactive config is not possible in Vue 2 before the composition-api plugin has been registered.
export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    nimiqSeeds: [
        '/dns4/seed1.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed2.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed3.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed4.pos.nimiq-testnet.com/tcp/8443/wss',
    ],
    disableNetworkInteraction: false,
    showHelpButton: true,
    faucetEndpoint: 'https://faucet.pos.nimiq-testnet.com',
    reportToSentry: false,
    enableBitcoin: true,
    pageVisibilityTxRefreshInterval: 1 * 60e3, // 1 minute

    demo: {
        // Controls if demo mode is enabled. When set to a string, demo mode is only enabled
        // if the current hostname matches this value. When true, demo mode is always enabled.
        enabled: false,
    },

    staking: {
        // The block heights determining the on-chain pre-staking window. All transactions inside this window count
        // for pre-staking.
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
        enabled: true,
        networkId: 80002,
        rpcEndpoint: 'wss://polygon-amoy.g.alchemy.com/v2/#ALCHEMY_API_KEY#',
        rpcMaxBlockRange: 1_296_000, // 30 days - Range not limited, only limited by number of logs returned
        // eslint-disable-next-line max-len
        // rpcEndpoint: 'wss://shy-sparkling-wind.matic-testnet.discover.quiknode.pro/4461ca78cea96dd6a168a58d8fc30a021cabf01d/',
        usdc_bridged: {
            /** @deprecated */
            tokenContract: '',
            /** @deprecated */
            transferContract: '', // v3
            /** @deprecated */
            htlcContract: '', // v3
            /**
             * **At which block to stop the reverse transaction-history scan**
             *
             * Address history is looked up in reverse, stopping when both the address's nonce and balance become zero.
             * To limit the duration and number of blocks that need to be scanned, we configure this number as the block
             * height at which the Wallet's USDC-integration was launched in the network that this config is for.
             *
             * This means, if an address was already used for USDC-on-Polygon before we launched the USDC-integration,
             * those transfers will not show up in the transaction history. That should not matter for almost all our
             * users. Most likely users to encounter missing txs could be Ledger users who used their USDC account
             * before. This is a trade-off we have to make for performance. The balance displayed for all users will be
             * correct, however.
             *
             * Set to `0` to disable early stopping.
             */
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
            swapContract: '',
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
        feePercentage: 0.01, // 1% - only used for estimate creation
        minFee: 0.50, // Euro
        minBuyAmount: 35, // Euro
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

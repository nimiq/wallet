import { ENV_DEV } from '../lib/Constants';

// Note: you'll usually want to use the reactive variant exported by useConfig instead of the plain Config, especially
// in component templates (where the reactive config is also available as $config), computed props and watchers. Use of
// the reactive config is not possible in Vue 2 before the composition-api plugin has been registered.
export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    nimiqScript: 'https://cdn.nimiq-testnet.com/v1.5.8/web.js',
    networkEndpoint: 'https://seed1.v2.nimiq-testnet.com:8648/ws?secret=Chei2Agh2obo5each1shuopop',
    reportToSentry: false,
    enableBitcoin: false,
    pageVisibilityTxRefreshInterval: 1 * 60e3, // 1 minute

    usdc: {
        enabled: true,
        networkId: 80001,
        rpcEndpoint: 'wss://polygon-mumbai.g.alchemy.com/v2/#ALCHEMY_API_KEY#',
        rpcMaxBlockRange: 1_296_000, // 30 days - Range not limited, only limited by number of logs returned
        // eslint-disable-next-line max-len
        // rpcEndpoint: 'wss://shy-sparkling-wind.matic-testnet.discover.quiknode.pro/4461ca78cea96dd6a168a58d8fc30a021cabf01d/',
        /** @deprecated */
        usdcContract: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
        nativeUsdcContract: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97',
        /** @deprecated */
        transferContract: '0x2805f3187dcDfa424EFA8c55Db6012Cf08Fa6eEc', // v3
        nativeTransferContract: '0x5D101A320547f8D640c44fDfe5d1f35224f00B8B', // v1
        /** @deprecated */
        htlcContract: '0x2EB7cd7791b947A25d629219ead941fCd8f364BF', // v3
        nativeHtlcContract: '0xA9fAbABE97375565e4A9Ac69A57Df33c91FCB897',
        swapContract: '0xf4a619F6561CeE543BDa9BBA0cAC68758B607714', // v2
        swapPoolContract: '0x8292Be650A20D30A21436601bFb1ea0e1143d901',
        relayHubContract: '0x6646cD15d33cE3a6933e36de38990121e8ba2806',
        uniswapQuoterContract: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        wmaticContract: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
        /**
         * **At which block to stop the reverse transaction-history scan**
         *
         * Address history is looked up in reverse, stopping when both the address's nonce and balance become zero. To
         * limit the duration and number of blocks that need to be scanned, we configure this number as the block height
         * at which the Wallet's USDC-integration was launched in the network that this config is for.
         *
         * This means, if an address was already used for USDC-on-Polygon before we launched the USDC-integration, those
         * transfers will not show up in the transaction history. That should not matter for almost all our users. Most
         * likely users to encounter missing txs could be Ledger users who used their USDC account before. This is a
         * trade-off we have to make for performance. The balance displayed for all users will be correct, however.
         *
         * Set to `0` to disable early stopping.
         */
        earliestHistoryScanHeight: 29621817,
        earliestNativeHistoryScanHeight: 36560732, // Native USDC contract creation block
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
        underMaintenance: true,
        apiEndpoint: 'https://api-sandbox.nimiqoasis.com/v1',
        feePercentage: 0.01, // 1% - only used for estimate creation
        minFee: 0.50, // Euro
        minBuyAmount: 35, // Euro
        maxFreeAmount: 999, // Euro
        maxKycAmount: 4999, // Euro
    },

    ten31Pass: {
        enabled: true,
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
        enabled: true,
        // This is a publishable key
        clientApiKey: 'pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO',
        signatureEndpoint: 'https://moosign.nimiq.network',
    },

    simplex: {
        enabled: true,
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
        ],
    },
};

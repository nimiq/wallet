import { ENV_DEV } from '../lib/Constants';

export default {
    hubEndpoint: `${window.location.protocol}//${window.location.hostname}:8080`,
    environment: ENV_DEV,
    nimiqScript: 'https://cdn.nimiq-testnet.com/v1.5.8/web.js',
    reportToSentry: false,
    enableBitcoin: false,
    pageVisibilityTxRefreshInterval: 1 * 60e3, // 1 minute

    usdc: {
        enabled: true,
        networkId: 80001 as number | string, // Can also be 'maticmum'
        rpcEndoint: 'https://matic-mumbai.chainstacklabs.com',
        usdcContract: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
        openGsnContract: '',
        explorer: 'https://mumbai.polygonscan.com',
        /**
         * From which block to fetch transaction history
         *
         * When asking the RPC node to scan for logs from block 0, the request times out.
         * So we need to set a block height that is still acceptable for the RPC node and
         * returns results. We therefore set the height to the current block height at the
         * first deployment of the Wallet in the respective network. This will not display
         * any potential transactions on the USDC account before that block, which should
         * not matter for almost all users. Most likely users to encounter missing txs
         * could be Ledger users who used their USDC account before. This is a trade-off
         * we have to make. The balance displayed for all users will be correct, however.
         */
        startHistoryScanHeight: 29621817,
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
        widgetUrl: 'https://buy-staging.moonpay.com?apiKey=pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO',
        signatureEndpoint: 'https://mun.soerenschwert.de',
    },

    simplex: {
        enabled: true,
        formScriptUrl: 'https://iframe.sandbox.test-simplexcc.com/form-sdk.js',
        sdkScriptUrl: 'https://cdn.test-simplexcc.com/sdk/v1/js/sdk.js',
        splxScriptUrl: null as string | null,
        apiKey: 'pk_test_0c3e2ecd-1546-4068-ae01-d49382e1266a',
    },
};

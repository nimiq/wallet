import { useConfig } from '@/composables/useConfig';
import { watch } from '@vue/composition-api';
import { BigNumber, Contract } from 'ethers';
import { PolygonClient } from '../../ethers';
import { UNISWAP_FACTORY_CONTRACT_ABI, UNISWAP_POOL_CONTRACT_ABI, UNISWAP_QUOTER_ABI } from './ContractABIs';

let poolPromise: Promise<Contract> | null = null;

let unwatchGetUniswapPoolConfig: (() => void) | null = null;
export async function getUniswapPool({ ethers, provider, usdcTransfer }: PolygonClient) {
    const { config } = useConfig();
    unwatchGetUniswapPoolConfig = watch(() => [
        config.usdc.uniswapFactoryContract,
        config.usdc.usdcContract,
        config.usdc.wmaticContract,
    ], () => {
        // Reset poolPromise when the usdc config changes.
        poolPromise = null;
        if (!unwatchGetUniswapPoolConfig) return;
        unwatchGetUniswapPoolConfig();
        unwatchGetUniswapPoolConfig = null;
    }, { lazy: true });

    // eslint-disable-next-line no-async-promise-executor
    return poolPromise || (poolPromise = new Promise(async (resolve) => {
        const uniswapFactory = new ethers.Contract(
            config.usdc.uniswapFactoryContract,
            UNISWAP_FACTORY_CONTRACT_ABI,
            provider,
        );

        const poolFee = await usdcTransfer.registeredTokenPoolFee(config.usdc.usdcContract) as BigNumber;

        // TODO: Handle error and renew the promise when getPool fails
        const uniswapPoolAddress = await uniswapFactory.getPool(
            config.usdc.usdcContract,
            config.usdc.wmaticContract,
            poolFee,
        ) as string;

        resolve(new ethers.Contract(uniswapPoolAddress, UNISWAP_POOL_CONTRACT_ABI, provider));
    }));
}

// https://docs.uniswap.org/sdk/v3/guides/quoting
export async function getUsdcPrice(client: PolygonClient) {
    const pool = await getUniswapPool(client);
    const [usdc, wmatic, fee] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.fee(),
    ]);

    const { config } = useConfig();

    const quoterContract = new client.ethers.Contract(
        config.usdc.uniswapQuoter,
        UNISWAP_QUOTER_ABI,
        client.provider,
    );

    const quotedAmountOut = await quoterContract.callStatic.quoteExactOutputSingle(
        usdc, // in
        wmatic, // out
        fee,
        '1000000', // 1 USDC
        0,
    ) as BigNumber;

    return quotedAmountOut;
}

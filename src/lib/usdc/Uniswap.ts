import type { BigNumber, Contract } from 'ethers';
import { watch } from '@vue/composition-api';
import { PolygonClient } from '../../ethers';
import { UNISWAP_FACTORY_CONTRACT_ABI, UNISWAP_POOL_CONTRACT_ABI } from './ContractABIs';
import { useConfig } from '../../composables/useConfig';

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

export async function getUsdcPrice(client: PolygonClient) {
    const [sqrtPriceX96] = await getUniswapPool(client).then((pool) => pool.slot0()) as [BigNumber];

    // sqrtPriceX96^2 / 2^192 - https://docs.uniswap.org/sdk/v3/guides/fetching-prices#token0price
    const priceToken0 = sqrtPriceX96.mul(sqrtPriceX96).div(client.ethers.BigNumber.from(2).pow(192));

    return priceToken0;
}

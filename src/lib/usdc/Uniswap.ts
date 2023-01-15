import type { BigNumber, Contract } from 'ethers';
import Config from 'config';
import { PolygonClient } from '../../ethers';
import { UNISWAP_FACTORY_CONTRACT_ABI, UNISWAP_POOL_CONTRACT_ABI } from './ContractABIs';

const POOL_FEE = 1 * 1e4; // 1% // TODO should be fetched from nimiqUsdcContract when it exposes it

let poolPromise: Promise<Contract> | undefined;

export async function getUniswapPool({ ethers, provider }: PolygonClient) {
    return poolPromise || (poolPromise = new Promise(async (resolve) => {
        const uniswapFactory = new ethers.Contract(
            Config.usdc.uniswapFactoryContract,
            UNISWAP_FACTORY_CONTRACT_ABI,
            provider,
        );

        // TODO: Handle error and renew the promise when getPool fails
        const uniswapPoolAddress = await uniswapFactory.getPool(
            Config.usdc.usdcContract,
            Config.usdc.wmaticContract,
            POOL_FEE,
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

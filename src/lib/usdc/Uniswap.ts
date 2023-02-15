import { useConfig } from '@/composables/useConfig';
import { watch } from '@vue/composition-api';
import { BigNumber, Contract } from 'ethers';
import { PolygonClient } from '../../ethers';
import { UNISWAP_FACTORY_CONTRACT_ABI, UNISWAP_POOL_CONTRACT_ABI, UNISWAP_QUOTER_CONTRACT_ABI } from './ContractABIs';

let poolPromise: Promise<{ contract: Contract, fee: BigNumber }> | null = null;

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

        const poolContract = new ethers.Contract(
            uniswapPoolAddress,
            UNISWAP_POOL_CONTRACT_ABI,
            provider,
        );

        resolve({
            contract: poolContract,
            fee: poolFee,
        });
    }));
}

// https://docs.uniswap.org/sdk/v3/guides/quoting
export async function getUsdcPrice(client: PolygonClient) {
    const { contract: pool, fee: poolFee } = await getUniswapPool(client);
    const { config } = useConfig();

    const quoterContract = new client.ethers.Contract(
        config.usdc.uniswapQuoterContract,
        UNISWAP_QUOTER_CONTRACT_ABI,
        client.provider,
    );

    // MATIC amount that would be received for swapping 1 USDC
    const usdcPrice = await quoterContract.callStatic.quoteExactInputSingle(
        config.usdc.usdcContract, // in
        config.usdc.wmaticContract, // out
        poolFee,
        1_000_000, // 1 USDC
        0,
    ) as BigNumber;

    // Convert to USDC smallest unit. We cannot get directly the USDC price for
    // USDC smallest unit because is so small that the result is 0, which is
    // not true.
    return usdcPrice.div(1_000_000);
}

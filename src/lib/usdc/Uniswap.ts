import { useConfig } from '@/composables/useConfig';
import type { BigNumber } from 'ethers';
import { PolygonClient } from '../../ethers';
import { UNISWAP_POOL_CONTRACT_ABI, UNISWAP_QUOTER_CONTRACT_ABI } from './ContractABIs';

let poolAddress: string | undefined;
let poolFee: BigNumber | undefined;

export async function getPoolAddress(client: PolygonClient) {
    if (!poolAddress) {
        const { config } = useConfig();
        poolAddress = await client.usdcTransfer.registeredTokenPool(config.usdc.usdcContract) as string;
    }

    return poolAddress;
}

// https://docs.uniswap.org/sdk/v3/guides/quoting
export async function getUsdcPrice(client: PolygonClient) {
    const { config } = useConfig();

    if (!poolFee) {
        const poolContract = new client.ethers.Contract(
            await getPoolAddress(client),
            UNISWAP_POOL_CONTRACT_ABI,
            client.provider,
        );
        poolFee = await poolContract.fee() as BigNumber;
    }

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

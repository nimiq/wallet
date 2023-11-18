import { useConfig } from '@/composables/useConfig';
import type { BigNumber, Contract } from 'ethers';
import { PolygonClient } from '../../ethers';
import { UNISWAP_POOL_CONTRACT_ABI, UNISWAP_QUOTER_CONTRACT_ABI } from './ContractABIs';

let poolAddresses: Record<string, string | undefined>;
let poolFees: Record<string, BigNumber | undefined>;

export async function getPoolAddress(contract: Contract, token: string) {
    const key = `${contract.address}-${token}`;
    if (!poolAddresses[key]) {
        poolAddresses[key] = await contract.registeredTokenPool(token) as string;
    }

    return poolAddresses[key]!;
}

// https://docs.uniswap.org/sdk/v3/guides/quoting
export async function getUsdcPrice(token: string, client: PolygonClient) {
    const { config } = useConfig();

    if (!poolFees[token]) {
        const transferContract = token === config.usdc.usdcContract ? client.usdcTransfer : client.nativeUsdcTransfer;
        const poolContract = new client.ethers.Contract(
            await getPoolAddress(transferContract, token),
            UNISWAP_POOL_CONTRACT_ABI,
            client.provider,
        );
        poolFees[token] = await poolContract.fee() as BigNumber;
    }

    const quoterContract = new client.ethers.Contract(
        config.usdc.uniswapQuoterContract,
        UNISWAP_QUOTER_CONTRACT_ABI,
        client.provider,
    );

    // MATIC amount that would be received for swapping 1 USDC
    const usdcPrice = await quoterContract.callStatic.quoteExactInputSingle(
        token, // in
        config.usdc.wmaticContract, // out
        poolFees[token]!,
        1_000_000, // 1 USDC
        0,
    ) as BigNumber;

    // Convert to USDC smallest unit. We cannot get directly the USDC price for
    // USDC smallest unit because is so small that the result is 0, which is
    // not true.
    return usdcPrice.div(1_000_000);
}

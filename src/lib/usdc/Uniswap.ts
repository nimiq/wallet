import { useConfig } from '@/composables/useConfig';
import type { BigNumber, Contract } from 'ethers';
import { PolygonClient } from '../../ethers';
import { UNISWAP_POOL_CONTRACT_ABI, UNISWAP_QUOTER_CONTRACT_ABI } from './ContractABIs';

const poolAddresses = new Map<string, string | undefined>();
const poolFees = new Map<string, BigNumber | undefined>();

export async function getPoolAddress(contract: Contract, token: string) {
    const key = `${contract.address}-${token}`;
    if (!poolAddresses.has(key)) {
        poolAddresses.set(key, await contract.registeredTokenPool(token));
    }

    return poolAddresses.get(key)!;
}

// https://docs.uniswap.org/sdk/v3/guides/quoting
export async function getUsdcPrice(token: string, client: PolygonClient) {
    const { config } = useConfig();

    if (!poolFees.has(token)) {
        const transferContract = token === config.usdc.nativeUsdcContract
            ? client.nativeUsdcTransfer
            : client.usdcTransfer;
        const poolContract = new client.ethers.Contract(
            await getPoolAddress(transferContract, token),
            UNISWAP_POOL_CONTRACT_ABI,
            client.provider,
        );
        poolFees.set(token, await poolContract.fee());
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
        poolFees.get(token)!,
        1_000_000, // 1 USDC
        0,
    ) as BigNumber;

    // Convert to USDC smallest unit. We cannot get directly the USDC price for
    // USDC smallest unit because is so small that the result is 0, which is
    // not true.
    return usdcPrice.div(1_000_000);
}

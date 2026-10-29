import type { Contract } from 'ethers';

const poolAddresses = new Map<string, string | undefined>();

export async function getPoolAddress(contract: Contract, token: string) {
    const key = `${contract.address}-${token}`;
    if (!poolAddresses.has(key)) {
        poolAddresses.set(key, await contract.registeredTokenPool(token));
    }

    return poolAddresses.get(key)!;
}

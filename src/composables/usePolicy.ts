/*
 * Lightweight Policy composable to mirror the subset of @nimiq/core Policy we need in the wallet.
 *
 * Goals:
 * - Provide blocksPerBatch, batchesPerEpoch directly from @nimiq/core Policy (fixed chain constants),
 * - Provide blocksPerEpoch derived from those constants,
 * - Provide genesisBlockNumber from runtime config,
 * - Provide electionBlockAfter(height) aligned with chain policy using the configured genesis.
 *
 * Behavior:
 * - We always load BLOCKS_PER_BATCH and BATCHES_PER_EPOCH from @nimiq/core and wait until available
 *   (WASM may need a short warm-up). There are no wallet-side fallbacks.
 * - The genesis block number is read from the wallet config so we can target the correct network
 *   (e.g., testnet vs mainnet) when aligning epoch math with other components (like the watchtower).
 */

import { useConfig } from '@/composables/useConfig';

// Core-provided constants (initialized once when core is ready)
let cachedBlocksPerBatch = 0;
let cachedBatchesPerEpoch = 0;
let coreLoaded = false;
let loadingPromise: Promise<void> | null = null;

async function loadCorePolicyConstants(): Promise<void> {
    if (coreLoaded) return Promise.resolve();
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
        const { Policy } = await import('@nimiq/core');
        await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const timer = window.setInterval(() => {
                const bpb = (Policy as any).BLOCKS_PER_BATCH;
                const bpe = (Policy as any).BATCHES_PER_EPOCH;
                if (typeof bpb === 'number' && bpb > 0 && typeof bpe === 'number' && bpe > 0) {
                    cachedBlocksPerBatch = bpb;
                    cachedBatchesPerEpoch = bpe;
                    window.clearInterval(timer);
                    resolve();
                } else if (++attempts >= 50) {
                    window.clearInterval(timer);
                    reject(new Error('Failed to load Policy constants from @nimiq/core'));
                }
            }, 50);
        });
        coreLoaded = true;
    })();
    return loadingPromise;
}

function computeBlocksPerEpoch(): number {
    return cachedBlocksPerBatch * cachedBatchesPerEpoch;
}

function electionBlockAfter(height: number, genesis: number, blocksPerEpoch: number): number {
    if (height < genesis) return genesis;
    const relative = height - genesis;
    const k = Math.floor(relative / blocksPerEpoch) + 1;
    return genesis + k * blocksPerEpoch;
}

export async function usePolicy() {
    // Ensure core constants are loaded before exposing the API
    await loadCorePolicyConstants();

    const { config } = useConfig();
    const genesisBlockNumber = config.staking?.genesis?.height || 0;

    const blocksPerBatch = (): number => cachedBlocksPerBatch;
    const batchesPerEpoch = (): number => cachedBatchesPerEpoch;
    const blocksPerEpoch = (): number => computeBlocksPerEpoch();
    const electionBlockAfterBound = (height: number): number =>
        electionBlockAfter(height, genesisBlockNumber, computeBlocksPerEpoch());

    return {
        // Constants/getters
        blocksPerBatch,
        batchesPerEpoch,
        blocksPerEpoch,
        genesisBlockNumber,
        // Functions
        electionBlockAfter: electionBlockAfterBound,
    };
}

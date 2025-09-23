/*
 * Lightweight Policy composable to mirror the subset of @nimiq/core Policy we need in the wallet.
 *
 * Goals:
 * - Provide blocksPerBatch, batchesPerEpoch from core Policy (fixed constants),
 * - Provide blocksPerEpoch derived from those constants,
 * - Provide genesisBlockNumber from runtime config,
 * - Provide electionBlockAfter(height) aligned with chain policy using the configured genesis.
 *
 * Notes:
 * - We read BATCHES_PER_EPOCH and BLOCKS_PER_BATCH from @nimiq/core once (lazy),
 *   but also initialize with sane defaults (60, 720) which match current chain policy.
 */

import { useConfig } from '@/composables/useConfig';

let cachedBlocksPerBatch = 60; // Matches core for mainnet/testnet
let cachedBatchesPerEpoch = 720; // Matches core for mainnet/testnet
let coreLoaded = false;

async function loadCorePolicyConstants(): Promise<void> {
    if (coreLoaded) return;
    try {
        const { Policy } = await import('@nimiq/core');
        // If available, prefer the constants from core
        const bpb = (Policy as any).BLOCKS_PER_BATCH;
        const bpe = (Policy as any).BATCHES_PER_EPOCH;
        if (typeof bpb === 'number' && bpb > 0) cachedBlocksPerBatch = bpb;
        if (typeof bpe === 'number' && bpe > 0) cachedBatchesPerEpoch = bpe;
        coreLoaded = true;
    } catch {
        // Keep defaults; core might not be ready in this context
    }
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

export function usePolicy() {
    // Kick off a lazy load of core constants
    // They equal our defaults today, but this ensures future-proofing.
    loadCorePolicyConstants();

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

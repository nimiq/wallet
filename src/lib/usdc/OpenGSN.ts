import type { BigNumber, Contract } from 'ethers';
import Config from 'config';
import type { PolygonClient } from '../../ethers';
import { RELAY_HUB_CONTRACT_ABI } from './ContractABIs';
import { useUsdcNetworkStore } from '../../stores/UsdcNetwork';

let relayHubContract: Contract | undefined;

export function getRelayHub({ ethers, provider }: PolygonClient) {
    return relayHubContract || (relayHubContract = new ethers.Contract(
        Config.usdc.relayHubContract,
        RELAY_HUB_CONTRACT_ABI,
        provider,
    ));
}

export interface RelayServerInfo {
    baseRelayFee: BigNumber;
    pctRelayFee: BigNumber;
    url: string;
    relayWorkerAddress: string;
    minGasPrice: BigNumber;
}

// Must be updated for new defaults when switching to OpenGSN v3
const MAX_PCT_RELAY_FEE = 70;
const MAX_BASE_RELAY_FEE = 0;

export async function getBestRelay(client: PolygonClient, requiredMaxAcceptanceBudget: BigNumber) {
    console.debug('Finding best relay'); // eslint-disable-line no-console
    const relayGen = relayServerRegisterGen(client, requiredMaxAcceptanceBudget);
    const relayServers: RelayServerInfo[] = [];

    let bestRelay: RelayServerInfo | undefined;

    while (true) { // eslint-disable-line no-constant-condition
        // eslint-disable-next-line no-await-in-loop
        const relay = await relayGen.next();
        if (!relay.value) break;

        const { pctRelayFee, baseRelayFee } = relay.value;

        // If both fees are maximally our accepted fees, we found an acceptable relay
        if (pctRelayFee.lte(MAX_PCT_RELAY_FEE) && baseRelayFee.lte(MAX_BASE_RELAY_FEE)) {
            bestRelay = relay.value;
            break;
        }

        relayServers.push(relay.value);
    }

    if (bestRelay) return bestRelay;

    // With no relay found, we take the one with the lowest fees among the ones we fetched.
    // We could also go again to the contract and fetch more relays, but most likely we will
    // find relays with similar fees and higher probabilities of being offline.

    // Sort relays first by lowest baseRelayFee and then by lowest pctRelayFee
    [bestRelay] = relayServers.sort((a, b) => {
        if (a.baseRelayFee.lt(b.baseRelayFee)) return -1;
        if (a.baseRelayFee.gt(b.baseRelayFee)) return 1;
        if (a.pctRelayFee.lt(b.pctRelayFee)) return -1;
        if (a.pctRelayFee.gt(b.pctRelayFee)) return 1;
        return 0;
    });

    if (!bestRelay) throw new Error('No relay found');

    return bestRelay;
}

/**
 * Polygon has 2-second blocks
 */
export const POLYGON_BLOCKS_PER_MINUTE = 60 / 2;
/**
 * The number of blocks to filter at a time
 */
const FILTER_BLOCKS_SIZE = 3 * POLYGON_BLOCKS_PER_MINUTE;
/**
 * Servers registered more than 1 hour ago have a high risk of being down
 */
const OLDEST_BLOCK_TO_FILTER = 60 * POLYGON_BLOCKS_PER_MINUTE;
/**
 * The maximum number of relay servers to try
 */
const MAX_RELAY_SERVERS_TRIES = 10;

// Iteratively fetches RelayServerRegistered events from the RelayHub contract.
// It yields them one by one. The goal is to find the relay with the lowest fee.
//   - It will fetch the last OLDEST_BLOCK_TO_FILTER blocks
//   - in FILTER_BLOCKS_SIZE blocks batches
async function* relayServerRegisterGen(client: PolygonClient, requiredMaxAcceptanceBudget: BigNumber) {
    let events = [];

    const batchBlocks = batchBlocksGen({
        height: useUsdcNetworkStore().state.height,
        untilBlock: OLDEST_BLOCK_TO_FILTER,
        batchSize: FILTER_BLOCKS_SIZE,
    });

    let count = 0;

    while (count < MAX_RELAY_SERVERS_TRIES && !events.length) {
        // eslint-disable-next-line no-await-in-loop
        const blocks = await batchBlocks.next();
        if (!blocks.value) break;
        const { fromBlock, toBlock } = blocks.value;

        const relayHub = getRelayHub(client);
        // eslint-disable-next-line no-await-in-loop
        events = await relayHub.queryFilter(
            relayHub.filters.RelayServerRegistered(),
            fromBlock,
            toBlock,
        );

        while (events.length) {
            const relayServer = events.shift();
            if (relayServer?.args?.length !== 4) continue;
            const [
                relayManagerAddress, // eslint-disable-line @typescript-eslint/no-unused-vars
                baseRelayFee,
                pctRelayFee,
                url,
            ] = relayServer.args as [string, BigNumber, BigNumber, string];
            // eslint-disable-next-line no-await-in-loop
            const relayAddr = await getRelayAddr(url);
            if (!relayAddr) continue;
            if (!relayAddr.ready) continue;
            if (!relayAddr.version.startsWith('2.')) continue; // TODO: Make OpenGSN version used configurable
            if (relayAddr.networkId !== Config.usdc.networkId.toString()) continue;
            if (client.ethers.BigNumber.from(relayAddr.maxAcceptanceBudget).lt(requiredMaxAcceptanceBudget)) continue;
            yield <RelayServerInfo> {
                baseRelayFee,
                pctRelayFee,
                url,
                relayWorkerAddress: relayAddr.relayWorkerAddress,
                minGasPrice: client.ethers.BigNumber.from(relayAddr.minGasPrice),
            };

            count += 1;
            if (count >= MAX_RELAY_SERVERS_TRIES) break;
        }
    }
}

interface BatchBlocksGenParams {
    height: number;
    untilBlock: number;
    batchSize: number;
}

/**
 * Generator that yields blocks in batches of batchSize
 */
async function* batchBlocksGen({ height, untilBlock, batchSize }: BatchBlocksGenParams) {
    let toBlock = height;
    let fromBlock = toBlock - batchSize;

    do {
        yield {
            fromBlock,
            toBlock,
        };
        toBlock = fromBlock - 1;
        fromBlock = toBlock - batchSize;
    } while (toBlock > untilBlock);
}

type RelayAddr = {
    chainId: string, // same as networkId
    maxAcceptanceBudget: string, // decimal number
    minGasPrice: string, // decimal number
    networkId: string, // same as chainId
    ownerAddress: string,
    ready: boolean,
    relayHubAddress: string,
    relayManagerAddress: string,
    relayWorkerAddress: string,
    version: string,
}

async function getRelayAddr(relayUrl: string) {
    console.debug('Pinging relay server', relayUrl); // eslint-disable-line no-console

    // Set a 1s timeout
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), 1e3);

    const response = await fetch(`${relayUrl}/getaddr`, {
        signal: abortController.signal,
    }).catch(() => ({ ok: false }));
    if (!response.ok) return false;
    return (response as Response).json() as Promise<RelayAddr>;
}

import type { BigNumber, Contract } from 'ethers';
import Config from 'config';
import type { PolygonClient } from '../../ethers';
import { RELAY_HUB_CONTRACT_ABI } from './ContractABIs';
import { useUsdcNetworkStore } from '../../stores/UsdcNetwork';

let relayHub: Contract | undefined;

function getRelayHub({ ethers, provider }: PolygonClient) {
    return relayHub || (relayHub = new ethers.Contract(
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

// const MAX_PCT_RELAY_FEE = 70;
// const MAX_BASE_RELAY_FEE = 0;

export async function getBestRelay(client: PolygonClient) {
    console.log('Finding best relay');
    const relayGen = relayServerRegisterGen(client);
    const relayServers: RelayServerInfo[] = [];

    let bestRelay: RelayServerInfo | undefined;

    while (true) { // eslint-disable-line no-constant-condition
        // eslint-disable-next-line no-await-in-loop
        const relay = await relayGen.next();
        if (!relay.value) continue;

        const { pctRelayFee, baseRelayFee } = relay.value;

        // if both fees are 0, we found the best relay
        if (pctRelayFee.eq(0) && baseRelayFee.eq(0)) {
            bestRelay = relay.value;
            break;
        }

        // // Ignore relays with higher fees than the maximum allowed
        // if (pctRelayFee.gt(MAX_PCT_RELAY_FEE) || baseRelayFee.gt(MAX_BASE_RELAY_FEE)) continue;

        if (!bestRelay
            || baseRelayFee.lt(bestRelay.baseRelayFee)
            || pctRelayFee.lt(bestRelay.pctRelayFee)) {
            bestRelay = relay.value;
        }

        relayServers.push(relay.value);

        if (relay.done) break;
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

export const POLYGON_BLOCKS_PER_MINUTE = 60 / 2; // Polygon has 2 second blocks
const FILTER_BLOCKS_SIZE = 3 * POLYGON_BLOCKS_PER_MINUTE; // The number of blocks to filter at a time
const OLDEST_BLOCK_TO_FILTER = 60 * POLYGON_BLOCKS_PER_MINUTE; // Servers registered more than 1 hour ago, high risk are down
const MAX_RELAY_SERVERS_TRIES = 10; // The maximum number of relay servers to try

// Iteratively fetches RelayServerRegistered events from the RelayHub contract.
// It yields them one by one. The goal is to find the relay with the lowest fee.
//   - It will fetch the last OLDEST_BLOCK_TO_FILTER blocks
//   - in FILTER_BLOCKS_SIZE blocks batches
async function* relayServerRegisterGen(client: PolygonClient) {
    let events = [];

    const batchBlocks = batchBlocksGen({
        height: useUsdcNetworkStore().state.height,
        untilBlock: OLDEST_BLOCK_TO_FILTER,
        batchSize: FILTER_BLOCKS_SIZE,
    });

    let count = 0;

    while (count <= MAX_RELAY_SERVERS_TRIES && !events.length) {
        // eslint-disable-next-line no-await-in-loop
        const blocks = await batchBlocks.next();
        if (!blocks.value) break;
        const { fromBlock, toBlock } = blocks.value;

        // eslint-disable-next-line no-await-in-loop
        const relayHub = getRelayHub(client);
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
            yield <RelayServerInfo> {
                baseRelayFee,
                pctRelayFee,
                url,
                relayWorkerAddress: relayAddr.relayWorkerAddress,
                minGasPrice: client.ethers.BigNumber.from(relayAddr.minGasPrice),
            };

            if (count++ > MAX_RELAY_SERVERS_TRIES) break;
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
    console.log('Pinging relay server', relayUrl);

    // Set a 1s timeout
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), 1e3);

    const response = await fetch(`${relayUrl}/getaddr`, {
        signal: abortController.signal,
    }).catch(() => ({ ok: false }));
    if (!response.ok) return false;
    return (response as Response).json() as Promise<RelayAddr>;
}

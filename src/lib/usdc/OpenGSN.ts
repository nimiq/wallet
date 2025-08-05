/* eslint-disable no-console */
import type { BigNumber, Contract } from 'ethers';
import { getPolygonBlockNumber, PolygonClient, safeQueryFilter } from '../../ethers';
import { OPENGSN_RELAY_HUB_CONTRACT_ABI } from './ContractABIs';
import { useConfig } from '../../composables/useConfig';
import { ENV_MAIN } from '../Constants';

let relayHubContract: Contract | undefined;

export function getRelayHub({ ethers, provider }: PolygonClient) {
    return relayHubContract || (relayHubContract = new ethers.Contract(
        useConfig().config.polygon.openGsnRelayHubContract,
        OPENGSN_RELAY_HUB_CONTRACT_ABI,
        provider,
    ));
}

export interface RelayServerInfo {
    baseRelayFee: BigNumber;
    pctRelayFee: BigNumber;
    url: string;
    relayManagerAddress: string;
    relayWorkerAddress: string;
    minGasPrice: BigNumber;
}

// Must be updated for new defaults when switching to OpenGSN v3
const MAX_PCT_RELAY_FEE = 70;
const MAX_BASE_RELAY_FEE = 0;

export async function getBestRelay(
    client: PolygonClient,
    requiredMaxAcceptanceBudget: BigNumber,
    calculateFee: (baseRelayFee: BigNumber, pctRelayFee: BigNumber, minGasPrice: BigNumber) => {
        chainTokenFee: BigNumber,
    },
) {
    console.debug('Finding best relay'); // eslint-disable-line no-console
    const relayGen = relayServerRegisterGen(client, requiredMaxAcceptanceBudget, calculateFee);
    const relayServers: RelayServerInfo[] = [];

    while (true) { // eslint-disable-line no-constant-condition
        // eslint-disable-next-line no-await-in-loop
        const relay = await relayGen.next();
        if (!relay.value) break;

        const { pctRelayFee, baseRelayFee } = relay.value;

        // If both fees are maximally our accepted fees, we found an acceptable relay
        if (pctRelayFee.lte(MAX_PCT_RELAY_FEE) && baseRelayFee.lte(MAX_BASE_RELAY_FEE)) {
            return relay.value;
        }

        relayServers.push(relay.value);
    }

    // With no relay found, we take the one with the lowest fees among the ones we fetched.
    // We could also go again to the contract and fetch more relays, but most likely we will
    // find relays with similar fees and higher probabilities of being offline.

    // Sort relays first by lowest baseRelayFee and then by lowest pctRelayFee
    const [bestRelay] = relayServers.sort((a, b) => {
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
const FILTER_BLOCKS_SIZE = 10 * POLYGON_BLOCKS_PER_MINUTE;
/**
 * Servers registered more than 1 hour ago have a high risk of being down
 */
const MAX_BLOCKS_TO_FILTER = 60 * POLYGON_BLOCKS_PER_MINUTE;
/**
 * The maximum number of relay servers to try
 */
const MAX_RELAY_SERVERS_TRIES = 10;

// Iteratively fetches RelayServerRegistered events from the RelayHub contract.
// It yields them one by one. The goal is to find the fastest relay that fulfills all requirements.
//   - It will fetch the last OLDEST_BLOCK_TO_FILTER blocks
//   - in FILTER_BLOCKS_SIZE blocks batches
async function* relayServerRegisterGen(
    client: PolygonClient,
    requiredMaxAcceptanceBudget: BigNumber,
    calculateFee: (baseRelayFee: BigNumber, pctRelayFee: BigNumber, minGasPrice: BigNumber) => {
        chainTokenFee: BigNumber,
    },
) {
    let events = [];

    const blockHeight = await getPolygonBlockNumber();
    const batchBlocks = batchBlocksGen({
        height: blockHeight,
        untilBlock: blockHeight - MAX_BLOCKS_TO_FILTER,
        batchSize: FILTER_BLOCKS_SIZE,
    });

    let count = 0;
    const relayHub = getRelayHub(client);

    while (count < MAX_RELAY_SERVERS_TRIES) {
        // eslint-disable-next-line no-await-in-loop
        const blocks = await batchBlocks.next();
        if (!blocks.value) break;
        const { fromBlock, toBlock } = blocks.value;

        // eslint-disable-next-line no-await-in-loop
        events = await safeQueryFilter(
            relayHub,
            relayHub.filters.RelayServerRegistered(),
            fromBlock,
            toBlock,
        );

        const { config } = useConfig();

        type RelayRegistration = {
            relayManagerAddress: string,
            baseRelayFee: BigNumber,
            pctRelayFee: BigNumber,
            url: string,
        }

        let registrations = events.map((event) => {
            if (event.args?.length !== 4) return false;

            const [
                relayManagerAddress,
                baseRelayFee,
                pctRelayFee,
                url,
            ] = event.args as [string, BigNumber, BigNumber, string];

            try {
                new URL(url); // eslint-disable-line no-new
            } catch (error) {
                // Invalid URL, skip this relay
                return false;
            }

            return <RelayRegistration>{
                relayManagerAddress,
                baseRelayFee,
                pctRelayFee,
                url,
            };
        }).filter(Boolean) as RelayRegistration[];

        // Filter out duplicates
        registrations = registrations.filter((reg, i, array) => {
            const firstIndex = array.findIndex((reg2) => reg2.url === reg.url);
            return firstIndex === i;
        });

        // Race pings and do static checks

        const abortController = new AbortController();
        // Every 2 seconds, check if we have 1 or more final relays already and if so, abort the rest
        const abortInterval = window.setInterval(() => {
            let finalRelaysCount = 0;
            orderedRelays.forEach((relay) => {
                if (relay.isFinal) finalRelaysCount += 1;
            });
            if (finalRelaysCount >= 1) {
                window.clearInterval(abortInterval);
                window.clearTimeout(abortTimeout);
                abortController.abort();
            }
        }, 2e3);
        // Abort after a 10s hard timeout
        const abortTimeout = window.setTimeout(() => {
            window.clearInterval(abortInterval);
            window.clearTimeout(abortTimeout);
            abortController.abort();
        }, 10e3);

        const orderedRelays = new Map<string, RelayServerInfo & { isFinal: boolean }>();
        // eslint-disable-next-line no-await-in-loop,no-loop-func
        await Promise.all(registrations.map(async (reg) => {
            const { baseRelayFee, pctRelayFee, url } = reg;
            const relayAddr = await getRelayAddr(url, abortController.signal);
            if (!relayAddr) {
                console.debug('Skipping relay: no addr info, timeout');
                return;
            }
            if (!relayAddr.ready) {
                console.debug('Skipping relay: not ready');
                return;
            }
            if (!relayAddr.version.startsWith('2.')) { // TODO: Make OpenGSN version used configurable
                console.debug('Skipping relay: wrong version:', relayAddr.version);
                return;
            }
            if (relayAddr.networkId !== config.polygon.networkId.toString(10)) {
                console.debug('Skipping relay: wrong networkId:', relayAddr.networkId);
                return;
            }
            if (client.ethers.BigNumber.from(relayAddr.maxAcceptanceBudget).lt(requiredMaxAcceptanceBudget)) {
                console.debug(
                    'Skipping relay: too small acceptance budget:',
                    relayAddr.maxAcceptanceBudget,
                    ', required:',
                    requiredMaxAcceptanceBudget.toString(),
                );
                return;
            }

            const relay: RelayServerInfo & { isFinal: boolean } = {
                baseRelayFee,
                pctRelayFee,
                url,
                relayManagerAddress: relayAddr.relayManagerAddress,
                relayWorkerAddress: relayAddr.relayWorkerAddress,
                minGasPrice: client.ethers.BigNumber.from(relayAddr.minGasPrice),
                isFinal: false,
            };

            // Insert into map already so that the map is ordered by fastest responding relay
            orderedRelays.set(url, relay);

            // Check if this relay has enough balance to cover the fee
            const { chainTokenFee } = calculateFee(
                baseRelayFee, pctRelayFee, client.ethers.BigNumber.from(relay.minGasPrice));
            const requiredBalance = chainTokenFee.mul(2);
            // eslint-disable-next-line no-await-in-loop
            const relayBalance = await client.provider.getBalance(relay.relayWorkerAddress);
            if (relayBalance.lt(requiredBalance)) {
                console.debug(
                    'Skipping relay: not enough balance:',
                    relayBalance.toString(),
                    ', required:',
                    requiredBalance.toString(),
                );
                orderedRelays.delete(url);
                return;
            }

            // Check if this relay has sent a transaction in the last hours
            const filter = relayHub.filters.TransactionRelayed(
                relay.relayManagerAddress,
                relay.relayWorkerAddress,
            );
            let startBlock = blockHeight;
            const hoursToLookBackwards = config.environment === ENV_MAIN ? 48 : 24;
            const earliestBlock = startBlock - hoursToLookBackwards * 60 * POLYGON_BLOCKS_PER_MINUTE;

            const STEP_BLOCKS = config.polygon.rpcMaxBlockRange;

            while (startBlock > earliestBlock) {
                const filterToBlock = startBlock;
                const filterFromBlock = Math.max(filterToBlock - STEP_BLOCKS, earliestBlock);

                // eslint-disable-next-line no-await-in-loop
                const logs = await safeQueryFilter(relayHub, filter, filterFromBlock, filterToBlock);
                if (logs.length) break;

                startBlock = filterFromBlock;
            }
            if (startBlock === earliestBlock) { // Found no logs
                if (!url.endsWith('.fastspot.io')) {
                    console.debug('Skipping relay: no recent activity');
                    orderedRelays.delete(url);
                    return;
                }
            }

            count += 1;

            // Leave the relay in the map and update its finality
            relay.isFinal = true;
        }));

        // Yield the relays that we found so far, fastest first
        for (const relay of [...orderedRelays.values()]) {
            if (relay) yield relay as RelayServerInfo;
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

export async function getRelayAddr(relayUrl: string, abortSignal?: AbortSignal) {
    console.debug('Pinging relay server', relayUrl); // eslint-disable-line no-console
    const response = await fetch(`${relayUrl}/getaddr`, {
        signal: abortSignal,
    }).catch(() => ({ ok: false }));
    if (!response.ok) return false;
    return (response as Response).json() as Promise<RelayAddr>;
}

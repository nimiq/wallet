/* eslint-disable no-console */
import { ref, watch } from '@vue/composition-api';
import type { BigNumber, Contract, ethers, Event, EventFilter, providers } from 'ethers';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Block, Log } from '@ethersproject/abstract-provider';
import type { RelayRequest } from '@opengsn/common/dist/EIP712/RelayRequest';
import Config from 'config';
import { UsdcAddressInfo, useUsdcAddressStore } from './stores/UsdcAddress';
import { useUsdcNetworkStore } from './stores/UsdcNetwork';
import {
    Transaction as PlainTransaction,
    TransactionState,
    useUsdcTransactionsStore,
} from './stores/UsdcTransactions';
import { ENV_MAIN } from './lib/Constants';

interface PolygonClient {
    provider: providers.Provider;
    usdc: Contract;
    nimiqUsdc: Contract;
    ethers: typeof ethers;
    relayHub: Contract;
    uniswapPool: Contract;
}

let isLaunched = false;
let clientPromise: Promise<PolygonClient>;

type Balances = Map<string, number>;
const balances: Balances = new Map(); // Balances in USDC-base units, excluding pending txs

export async function getPolygonClient(): Promise<PolygonClient> {
    if (clientPromise) return clientPromise;

    let resolver: (client: PolygonClient) => void;
    clientPromise = new Promise<PolygonClient>((resolve) => {
        resolver = resolve;
    });

    const ethers = await import(/* webpackChunkName: "ethers-js" */ 'ethers');
    const provider = new ethers.providers.StaticJsonRpcProvider(
        Config.usdc.rpcEndoint,
        ethers.providers.getNetwork(Config.usdc.networkId),
    );

    await provider.ready;
    console.log('Polygon connection established');
    useUsdcNetworkStore().state.consensus = 'established';

    const FEE = 10000; // TODO should be fetched from usdcContract

    const usdc = new ethers.Contract(Config.usdc.usdcContract, USDC_CONTRACT_ABI, provider);
    const nimiqUsdc = new ethers.Contract(Config.usdc.nimiqUsdcContract, NIMIQ_USDC_CONTRACT_ABI, provider);
    const relayHub = new ethers.Contract(Config.usdc.relayHubContract, RELAY_HUB_CONTRACT_ABI, provider);

    const uniswapFactory = new ethers.Contract(
        Config.usdc.uniswapFactoryContract, UNISWAP_FACTORY_CONTRACT_ABI, provider);
    const uniswapPoolAddress = await uniswapFactory.getPool(Config.usdc.usdcContract, Config.usdc.wmaticContract, FEE);

    const uniswapPool = new ethers.Contract(uniswapPoolAddress, UNISWAP_POOL_CONTRACT_ABI, provider);
    console.log('uniswapPoolAddress', uniswapPoolAddress);

    resolver!({
        provider,
        usdc,
        nimiqUsdc,
        ethers,
        relayHub,
        uniswapPool,
    });

    return clientPromise;
}

async function getBalance(address: string) {
    const client = await getPolygonClient();
    const balance = await client.usdc.balanceOf(address) as BigNumber;
    return balance.toNumber(); // With Javascript numbers we can represent up to 9,007,199,254 USDC, enough for now
}

async function updateBalances(addresses: string[] = [...balances.keys()]) {
    if (!addresses.length) return;
    const accounts = await Promise.all(addresses.map((address) => getBalance(address)));
    const newBalances: Balances = new Map(
        accounts.map((balance, i) => [addresses[i], balance]),
    );

    for (const [address, newBalance] of newBalances) {
        if (balances.get(address) === newBalance) {
            // Balance did not change since last check.
            // Remove from newBalances Map to not update the store.
            newBalances.delete(address);
        } else {
            // Update balances cache
            balances.set(address, newBalance);
        }
    }

    if (!newBalances.size) return;
    console.log('Got new USDC balances for', [...newBalances.keys()]);
    const { patchAddress } = useUsdcAddressStore();
    for (const [address, balance] of newBalances) {
        patchAddress(address, { balance });
    }
}

function forgetBalances(addresses: string[]) {
    for (const address of addresses) {
        balances.delete(address);
    }
}

const subscribedAddresses = new Set<string>();
const fetchedAddresses = new Set<string>();

let currentSubscriptionFilter: EventFilter | undefined;
function subscribe(addresses: string[]) {
    getPolygonClient().then((client) => {
        // Only subscribe to incoming logs
        const newFilterIncoming = client.usdc.filters.Transfer(null, [...subscribedAddresses]);
        client.usdc.on(newFilterIncoming, transactionListener);
        if (currentSubscriptionFilter) client.usdc.off(currentSubscriptionFilter, transactionListener);
        currentSubscriptionFilter = newFilterIncoming;
    });
    updateBalances(addresses);
    return true;
}

async function transactionListener(from: string, to: string, value: BigNumber, log: TransferEvent) {
    if (!balances.has(from) && !balances.has(to)) return;

    log.getBlock().then((block) => {
        const plain = logAndBlockToPlain(log, block);
        const { addTransactions } = useUsdcTransactionsStore();
        addTransactions([plain]);
    });

    const addresses: string[] = [];
    if (balances.has(from)) {
        addresses.push(from);
    }
    if (balances.has(to)) {
        addresses.push(to);
    }
    updateBalances(addresses);
}

export async function launchPolygon() {
    if (isLaunched) return;
    isLaunched = true;

    const client = await getPolygonClient();

    const { state: network$ } = useUsdcNetworkStore();
    const transactionsStore = useUsdcTransactionsStore();

    // Start block listener
    client.provider.on('block', (height: number) => {
        console.debug('Polygon is now at', height);
        network$.height = height;
    });

    // Subscribe to new addresses (for balance updates and transactions)
    // Also remove logged out addresses from fetched (so that they get fetched on next login)
    const addressStore = useUsdcAddressStore();
    watch(addressStore.addressInfo, () => {
        const newAddresses: string[] = [];
        const removedAddresses = new Set(subscribedAddresses);

        for (const address of Object.keys(addressStore.state.addressInfos)) {
            if (subscribedAddresses.has(address)) {
                removedAddresses.delete(address);
                continue;
            }

            subscribedAddresses.add(address);
            newAddresses.push(address);
        }

        if (removedAddresses.size) {
            for (const removedAddress of removedAddresses) {
                subscribedAddresses.delete(removedAddress);
                fetchedAddresses.delete(removedAddress);
            }
            // Let the network forget the balances of the removed addresses,
            // so that they are reported as new again at re-login.
            forgetBalances([...removedAddresses]);
        }

        if (!newAddresses.length) return;

        console.log('Subscribing USDC addresses', newAddresses);
        subscribe(newAddresses);
    });

    // Fetch transactions for active address
    const txFetchTrigger = ref(0);
    watch([addressStore.addressInfo, txFetchTrigger], ([addressInfo]) => {
        const address = (addressInfo as UsdcAddressInfo | null)?.address;
        if (!address || fetchedAddresses.has(address)) return;
        fetchedAddresses.add(address);

        console.log('Scheduling USDC transaction fetch for', address);

        const knownTxs = Object.values(transactionsStore.state.transactions)
            .filter((tx) => tx.sender === address || tx.recipient === address);
        const lastConfirmedHeight = knownTxs
            .filter((tx) => Boolean(tx.blockHeight))
            .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), Config.usdc.startHistoryScanHeight);

        network$.fetchingTxHistory++;

        updateBalances([address]);

        console.log('Fetching USDC transaction history for', address, knownTxs);
        // EventFilters only allow to query with an AND condition between arguments (topics). So while
        // we could specify an array of parameters to match for each topic (which are OR'd), we cannot
        // OR two AND pairs. That requires two separate requests.
        const filterIncoming = client.usdc.filters.Transfer(null, address);
        const filterOutgoing = client.usdc.filters.Transfer(address);
        Promise.all([
            client.usdc.queryFilter(filterIncoming, lastConfirmedHeight - 10),
            client.usdc.queryFilter(filterOutgoing, lastConfirmedHeight - 10),
            // TODO Check limitations of start block in the RPC server
        ])
            .then(([logsIn, logsOut]) => {
                // Filter known txs
                const knownHashes = knownTxs.map(
                    (tx) => `${tx.transactionHash}:${tx.logIndex}`,
                );
                const newLogs = logsIn.concat(logsOut).filter((log) => {
                    if (log.args?.to === Config.usdc.nimiqUsdcContract) {
                        // TODO Store this as the fee
                        return false;
                    }
                    const hash = `${log.transactionHash}:${log.logIndex}`;
                    return !knownHashes.includes(hash);
                }) as TransferEvent[];

                return Promise.all(newLogs.map(async (log) => ({
                    log,
                    block: await log.getBlock(),
                })));
            })
            .then((logsAndBlocks) => {
                transactionsStore.addTransactions(logsAndBlocks.map(
                    ({ log, block }) => logAndBlockToPlain(log, block),
                ));
            })
            .catch((error) => {
                console.log('error', error);
                fetchedAddresses.delete(address);
            })
            .then(() => network$.fetchingTxHistory--);
    });
}

function logAndBlockToPlain(log: TransferEvent | TransferLog, block?: Block): PlainTransaction {
    return {
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        sender: log.args.from,
        recipient: log.args.to,
        value: log.args.value.toNumber(), // With Javascript numbers we can represent up to 9,007,199,254 USDC
        // fee: number,
        state: block ? TransactionState.MINED : TransactionState.PENDING,
        blockHeight: block?.number,
        timestamp: block?.timestamp,
    };
}

export async function createTransactionRequest(recipient: string, amount: number) {
    const addressInfo = useUsdcAddressStore().addressInfo.value;
    if (!addressInfo) throw new Error('No active USDC address');
    const fromAddress = addressInfo.address;

    const client = await getPolygonClient();

    const [
        gasPrice,
        gasLimit,
        usdcNonce,
        forwarderNonce,
        { baseRelayFee, pctRelayFee, relayWorkerAddress, minGasPrice, url: relayUrl },
        [sqrtPriceX96],
    ] = await Promise.all([
        client.provider.getGasPrice().then((price) => price.mul(110).div(100)),
        client.nimiqUsdc.requiredRelayGas() as Promise<BigNumber>,
        client.usdc.getNonce(fromAddress) as Promise<BigNumber>,
        client.nimiqUsdc.getNonce(fromAddress) as Promise<BigNumber>,
        getBestRelay(client),
        client.uniswapPool.slot0() as [BigNumber],
    ]);

    // sqrtPriceX96^2 / 2^192 - https://docs.uniswap.org/sdk/v3/guides/fetching-prices#token0price
    const priceToken0 = sqrtPriceX96.mul(sqrtPriceX96).div(client.ethers.BigNumber.from(2).pow(192));

    const actualGasPrice = gasPrice.gte(minGasPrice) ? gasPrice : minGasPrice;
    // (gasPrice * gasLimit) * (1 + pctRelayFee) + baseRelayFee
    const chainTokenFee = actualGasPrice.mul(gasLimit).mul(pctRelayFee.add(100)).div(100).add(baseRelayFee);

    // main 10%, test 25% as it is more volatile
    const uniswapBufferPercentage = Config.environment === ENV_MAIN ? 110 : 125;
    const fee = chainTokenFee.div(priceToken0).mul(uniswapBufferPercentage).div(100);

    const data = await client.nimiqUsdc.interface.encodeFunctionData('executeWithApproval', [
        /* address token */ Config.usdc.usdcContract,
        /* address userAddress */ fromAddress,
        /* uint256 amount */ amount,
        /* address target */ recipient,
        /* uint256 fee */ fee,
        /* uint256 chainTokenFee */ chainTokenFee,
        /* uint256 approval */ fee.add(amount),
        /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
        /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
        /* uint8 sigV */ 0,
    ]);

    const relayRequest: RelayRequest = {
        request: {
            from: fromAddress,
            to: Config.usdc.nimiqUsdcContract,
            data,
            value: '0',
            nonce: forwarderNonce.toString(),
            gas: gasLimit.toString(),
            validUntil: (useUsdcNetworkStore().state.height + 2 * 60 * BLOCKS_PER_MINUTE).toString(), // 2 hours
        },
        relayData: {
            gasPrice: actualGasPrice.toString(),
            pctRelayFee: pctRelayFee.toString(),
            baseRelayFee: baseRelayFee.toString(),
            relayWorker: relayWorkerAddress,
            paymaster: Config.usdc.nimiqUsdcContract,
            paymasterData: '0x',
            clientId: Math.floor(Math.random() * 1e6).toString(),
            forwarder: Config.usdc.nimiqUsdcContract,
        },
    };

    const approval: {
        tokenNonce: number,
    } = {
        tokenNonce: usdcNonce.toNumber(),
    };

    const relay: {
        url: string,
    } = {
        url: relayUrl,
    };

    return {
        relayRequest,
        approval,
        relay,
    };
}

const MAX_PCT_RELAY_FEE = 70;
const MAX_BASE_RELAY_FEE = 0;
async function getBestRelay(polygonClient: PolygonClient) {
    console.log('Finding best relay');
    const relayGen = relayServerRegisterGen(polygonClient);
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

        // Ignore relays with higher fees than the maximum allowed
        if (pctRelayFee.gt(MAX_PCT_RELAY_FEE) || baseRelayFee.gt(MAX_BASE_RELAY_FEE)) continue;

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

interface RelayServerInfo {
    baseRelayFee: BigNumber;
    pctRelayFee: BigNumber;
    url: string;
    relayWorkerAddress: string;
    minGasPrice: BigNumber;
}

const BLOCKS_PER_MINUTE = 60 / 2; // Polygon has 2 second blocks
const FILTER_BLOCKS_SIZE = 3 * BLOCKS_PER_MINUTE; // The number of blocks to filter at a time
const OLDEST_BLOCK_TO_FILTER = 60 * BLOCKS_PER_MINUTE; // Servers registered more than 1 hour ago, high risk are down
const MAX_RELAY_SERVERS_TRIES = 10; // The maximum number of relay servers to try

// Iteratively fetches RelayServerRegistered events from the RelayHub contract.
// It yields them one by one. The goal is to find the relay with the lowest fee.
//   - It will fetch the last OLDEST_BLOCK_TO_FILTER blocks
//   - in FILTER_BLOCKS_SIZE blocks batches
async function* relayServerRegisterGen({ provider, relayHub, ethers }: PolygonClient) {
    let events = [];

    const batchBlocks = batchBlocksGen({
        height: await provider.getBlockNumber(),
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
                minGasPrice: ethers.BigNumber.from(relayAddr.minGasPrice),
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

async function getRelayAddr(relayUrl: string): Promise<RelayAddr | false> {
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

export async function sendTransaction(relayRequest: RelayRequest, signature: string, relayUrl: string) {
    const client = await getPolygonClient();
    const [{ HttpClient, HttpWrapper }, currentNonce] = await Promise.all([
        import('@opengsn/common'),
        client.provider.getTransactionCount(relayRequest.relayData.relayWorker),
    ]);
    const httpClient = new HttpClient(new HttpWrapper(), console);
    const relayTx = await httpClient.relayTransaction(relayUrl, {
        relayRequest,
        metadata: {
            approvalData: '0x',
            relayHubAddress: Config.usdc.relayHubContract,
            relayMaxNonce: currentNonce + 3,
            signature,
        },
    });

    // TODO: Audit and validate transaction like in
    // https://github.com/opengsn/gsn/blob/v2.2.5/packages/provider/src/RelayClient.ts#L270

    let txResponse = await client.provider.sendTransaction(relayTx)
        .catch((error) => {
            console.debug('Failed to also send relay transaction:', error);
        });

    if (!txResponse) {
        const tx = client.ethers.utils.parseTransaction(relayTx);
        txResponse = await client.provider.getTransaction(tx.hash!);
    }

    const receipt = await txResponse.wait(1);
    const logs = receipt.logs.map((log) => {
        try {
            const { args, name } = client.usdc.interface.parseLog(log);
            return {
                ...log,
                args,
                name,
            };
        } catch (error) {
            return null;
        }
    });

    const relevantLog = logs.find(
        (log) =>
            log?.name === 'Transfer'
            && 'from' in log.args
            && log.args.from === relayRequest.request.from
            // TODO: Use the transfer to the nimiqUsdcContract address as the fee
            && log.args.to !== Config.usdc.nimiqUsdcContract,
    ) as TransferLog;
    const block = await client.provider.getBlock(relevantLog.blockHash);
    return logAndBlockToPlain(relevantLog, block);
}

// @ts-expect-error debugging
window.gimmePolygonClient = async () => getPolygonClient();

interface TransferResult extends ReadonlyArray<any> {
    0: string;
    1: string;
    2: BigNumber;
    3: BigNumber;
    from: string;
    to: string;
    value: BigNumber;
    fee: BigNumber;
}

interface TransferLog extends Log {
    args: TransferResult;
    name: string;
}

interface TransferEvent extends Event {
    args: TransferResult;
}

/* eslint-disable max-len */
const USDC_CONTRACT_ABI = [
    // 'constructor()',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event MetaTransactionExecuted(address userAddress, address relayerAddress, bytes functionSignature)',
    // 'event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)',
    // 'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
    // 'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    // 'function CHILD_CHAIN_ID() view returns (uint256)',
    // 'function CHILD_CHAIN_ID_BYTES() view returns (bytes)',
    // 'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    // 'function DEPOSITOR_ROLE() view returns (bytes32)',
    // 'function ERC712_VERSION() view returns (string)',
    // 'function ROOT_CHAIN_ID() view returns (uint256)',
    // 'function ROOT_CHAIN_ID_BYTES() view returns (bytes)',
    // 'function allowance(address owner, address spender) view returns (uint256)',
    // 'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    // 'function decimals() view returns (uint8)',
    // 'function decreaseAllowance(address spender, uint256 subtractedValue) returns (bool)',
    // 'function deposit(address user, bytes depositData)',
    // 'function executeMetaTransaction(address userAddress, bytes functionSignature, bytes32 sigR, bytes32 sigS, uint8 sigV) payable returns (bytes)',
    // 'function getChainId() pure returns (uint256)',
    // 'function getDomainSeperator() view returns (bytes32)',
    'function getNonce(address user) view returns (uint256 nonce)',
    // 'function getRoleAdmin(bytes32 role) view returns (bytes32)',
    // 'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
    // 'function getRoleMemberCount(bytes32 role) view returns (uint256)',
    // 'function grantRole(bytes32 role, address account)',
    // 'function hasRole(bytes32 role, address account) view returns (bool)',
    // 'function increaseAllowance(address spender, uint256 addedValue) returns (bool)',
    // 'function initialize(string name_, string symbol_, uint8 decimals_, address childChainManager)',
    // 'function name() view returns (string)',
    // 'function renounceRole(bytes32 role, address account)',
    // 'function revokeRole(bytes32 role, address account)',
    // 'function symbol() view returns (string)',
    // 'function totalSupply() view returns (uint256)',
    // 'function transfer(address recipient, uint256 amount) returns (bool)',
    // 'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)',
    // 'function withdraw(uint256 amount)',
];

const NIMIQ_USDC_CONTRACT_ABI = [
    // 'constructor()',
    // 'event DomainRegistered(bytes32 indexed domainSeparator, bytes domainValue)',
    // 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
    // 'event RequestTypeRegistered(bytes32 indexed typeHash, string typeStr)',
    // 'function CALLDATA_SIZE_LIMIT() view returns (uint256)',
    // 'function EIP712_DOMAIN_TYPE() view returns (string)',
    // 'function domains(bytes32) view returns (bool)',
    // 'function execute(address token, address userAddress, uint256 amount, address target, uint256 fee, uint256 chainTokenFee)',
    // 'function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data, uint256 validUntil) request, bytes32 domainSeparator, bytes32 requestTypeHash, bytes suffixData, bytes signature) payable returns (bool success, bytes ret)',
    'function executeWithApproval(address token, address userAddress, uint256 amount, address target, uint256 fee, uint256 chainTokenFee, uint256 approval, bytes32 sigR, bytes32 sigS, uint8 sigV)',
    // 'function getGasAndDataLimits() view returns (tuple(uint256 acceptanceBudget, uint256 preRelayedCallGasLimit, uint256 postRelayedCallGasLimit, uint256 calldataSizeLimit) limits)',
    // 'function getHubAddr() view returns (address)',
    // 'function getMinimumRelayFee(tuple(uint256 gasPrice, uint256 pctRelayFee, uint256 baseRelayFee, address relayWorker, address paymaster, address forwarder, bytes paymasterData, uint256 clientId) relayData) view returns (uint256 amount)',
    'function getNonce(address from) view returns (uint256)',
    // 'function getRelayHubDeposit() view returns (uint256)',
    // 'function isRegisteredToken(address token) view returns (bool)',
    // 'function isTrustedForwarder(address forwarder) view returns (bool)',
    // 'function owner() view returns (address)',
    // 'function postRelayedCall(bytes context, bool success, uint256 gasUseWithoutPost, tuple(uint256 gasPrice, uint256 pctRelayFee, uint256 baseRelayFee, address relayWorker, address paymaster, address forwarder, bytes paymasterData, uint256 clientId) relayData)',
    // 'function preApprovedGasDiscount() view returns (uint256)',
    // 'function preRelayedCall(tuple(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data, uint256 validUntil) request, tuple(uint256 gasPrice, uint256 pctRelayFee, uint256 baseRelayFee, address relayWorker, address paymaster, address forwarder, bytes paymasterData, uint256 clientId) relayData) relayRequest, bytes signature, bytes approvalData, uint256 maxPossibleGas) returns (bytes context, bool revertOnRecipientRevert)',
    // 'function registerDomainSeparator(string name, string version)',
    // 'function registerRequestType(string typeName, string typeSuffix)',
    // 'function registerToken(address token, uint24 poolFee)',
    // 'function renounceOwnership()',
    'function requiredRelayGas() view returns (uint256 amount)',
    // 'function setRelayHub(address hub)',
    // 'function setSwapRouter(address _swapRouter)',
    // 'function setWrappedChainToken(address _wrappedChainToken)',
    // 'function swapRouter() view returns (address)',
    // 'function transferOwnership(address newOwner)',
    // 'function trustedForwarder() view returns (address forwarder)',
    // 'function typeHashes(bytes32) view returns (bool)',
    // 'function unregisterToken(address token)',
    // 'function updatePreApprovedGasDiscount(uint256 _preApprovedGasDiscount)',
    // 'function updateRelayGas(uint256 preRelayedCallGasLimit, uint256 postRelayedCallGasLimit, uint256 executeCallGasLimit, uint256 relayOverhead)',
    // 'function verify(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data, uint256 validUntil) forwardRequest, bytes32 domainSeparator, bytes32 requestTypeHash, bytes suffixData, bytes signature) view',
    // 'function versionPaymaster() view returns (string)',
    // 'function versionRecipient() view returns (string)',
    // 'function withdraw(uint256 amount, address target)',
    // 'function withdrawRelayHubDeposit(uint256 amount, address target)',
    // 'function wrappedChainToken() view returns (address)',
];

/* eslint-disable max-len */
const RELAY_HUB_CONTRACT_ABI = [
    // 'constructor(address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)',
    // 'event Deposited(address indexed,address indexed,uint256)',
    // 'event HubDeprecated(uint256)',
    // 'event OwnershipTransferred(address indexed,address indexed)',
    // 'event RelayHubConfigured(tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))',
    'event RelayServerRegistered(address indexed,uint256,uint256,string)',
    // 'event RelayWorkersAdded(address indexed,address[],uint256)',
    // 'event TransactionRejectedByPaymaster(address indexed,address indexed,address indexed,address,address,bytes4,uint256,bytes)',
    // 'event TransactionRelayed(address indexed,address indexed,address indexed,address,address,bytes4,uint8,uint256)',
    // 'event TransactionResult(uint8,bytes)',
    // 'event Withdrawn(address indexed,address indexed,uint256)',
    // 'function G_NONZERO() view returns (uint256)',
    // 'function addRelayWorkers(address[])',
    // 'function balanceOf(address) view returns (uint256)',
    // 'function calculateCharge(uint256,tuple(uint256,uint256,uint256,address,address,address,bytes,uint256)) view returns (uint256)',
    // 'function calldataGasCost(uint256) view returns (uint256)',
    // 'function depositFor(address) payable',
    // 'function deprecateHub(uint256)',
    // 'function deprecationBlock() view returns (uint256)',
    // 'function getConfiguration() view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))',
    // 'function innerRelayCall(tuple(tuple(address,address,uint256,uint256,uint256,bytes,uint256), tuple(uint256, uint256, uint256, address, address, address, bytes, uint256)),bytes,bytes,tuple(uint256,uint256,uint256,uint256), uint256, uint256) returns(uint8, bytes)',
    // 'function isDeprecated() view returns (bool)',
    // 'function isRelayManagerStaked(address) view returns (bool)',
    // 'function owner() view returns (address)',
    // 'function penalize(address,address)',
    // 'function penalizer() view returns (address)',
    // 'function registerRelayServer(uint256,uint256,string)',
    // 'function relayCall(uint256,tuple(tuple(address,address,uint256,uint256,uint256,bytes,uint256), tuple(uint256, uint256, uint256, address, address, address, bytes, uint256)),bytes,bytes,uint256) returns (bool, bytes)',
    // 'function renounceOwnership()',
    // 'function setConfiguration(tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))',
    // 'function stakeManager() view returns (address)',
    // 'function transferOwnership(address)',
    // 'function versionHub() view returns (string)',
    // 'function withdraw(uint256,address)',
    // 'function workerCount(address) view returns (uint256)',
    // 'function workerToManager(address) view returns (address)'
];

/* eslint-disable max-len */
const UNISWAP_FACTORY_CONTRACT_ABI = [
    // 'constructor()',
    // 'event FeeAmountEnabled(uint24 indexed fee, int24 indexed tickSpacing)',
    // 'event OwnerChanged(address indexed oldOwner, address indexed newOwner)',
    // 'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)',
    // 'function createPool(address tokenA, address tokenB, uint24 fee) returns (address pool)',
    // 'function enableFeeAmount(uint24 fee, int24 tickSpacing)',
    // 'function feeAmountTickSpacing(uint24) view returns (int24)',
    'function getPool(address, address, uint24) view returns (address)',
    // 'function owner() view returns (address)',
    // 'function parameters() view returns (address factory, address token0, address token1, uint24 fee, int24 tickSpacing)',
    // 'function setOwner(address _owner)',
];

/* eslint-disable max-len */
const UNISWAP_POOL_CONTRACT_ABI = [
    // 'event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
    // 'event Collect(address indexed owner, address recipient, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount0, uint128 amount1)',
    // 'event CollectProtocol(address indexed sender, address indexed recipient, uint128 amount0, uint128 amount1)',
    // 'event Flash(address indexed sender, address indexed recipient, uint256 amount0, uint256 amount1, uint256 paid0, uint256 paid1)',
    // 'event IncreaseObservationCardinalityNext(uint16 observationCardinalityNextOld, uint16 observationCardinalityNextNew)',
    // 'event Initialize(uint160 sqrtPriceX96, int24 tick)',
    // 'event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
    // 'event SetFeeProtocol(uint8 feeProtocol0Old, uint8 feeProtocol1Old, uint8 feeProtocol0New, uint8 feeProtocol1New)',
    // 'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
    // 'function burn(int24 tickLower, int24 tickUpper, uint128 amount) returns (uint256 amount0, uint256 amount1)',
    // 'function collect(address recipient, int24 tickLower, int24 tickUpper, uint128 amount0Requested, uint128 amount1Requested) returns (uint128 amount0, uint128 amount1)',
    // 'function collectProtocol(address recipient, uint128 amount0Requested, uint128 amount1Requested) returns (uint128 amount0, uint128 amount1)',
    // 'function factory() view returns (address)',
    // 'function fee() view returns (uint24)',
    // 'function feeGrowthGlobal0X128() view returns (uint256)',
    // 'function feeGrowthGlobal1X128() view returns (uint256)',
    // 'function flash(address recipient, uint256 amount0, uint256 amount1, bytes data)',
    // 'function increaseObservationCardinalityNext(uint16 observationCardinalityNext)',
    // 'function initialize(uint160 sqrtPriceX96)',
    // 'function liquidity() view returns (uint128)',
    // 'function maxLiquidityPerTick() view returns (uint128)',
    // 'function mint(address recipient, int24 tickLower, int24 tickUpper, uint128 amount, bytes data) returns (uint256 amount0, uint256 amount1)',
    // 'function observations(uint256 index) view returns (uint32 blockTimestamp, int56 tickCumulative, uint160 secondsPerLiquidityCumulativeX128, bool initialized)',
    // 'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
    // 'function positions(bytes32 key) view returns (uint128 _liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    // 'function protocolFees() view returns (uint128 token0, uint128 token1)',
    // 'function setFeeProtocol(uint8 feeProtocol0, uint8 feeProtocol1)',
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    // 'function snapshotCumulativesInside(int24 tickLower, int24 tickUpper) view returns (int56 tickCumulativeInside, uint160 secondsPerLiquidityInsideX128, uint32 secondsInside)',
    // 'function swap(address recipient, bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96, bytes data) returns (int256 amount0, int256 amount1)',
    // 'function tickBitmap(int16 wordPosition) view returns (uint256)',
    // 'function tickSpacing() view returns (int24)',
    // 'function ticks(int24 tick) view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)',
    // 'function token0() view returns (address)',
    // 'function token1() view returns (address)',
];

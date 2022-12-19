/* eslint-disable no-console */
import { ref, watch } from '@vue/composition-api';
import type { BigNumber, Contract, Event, EventFilter, providers } from 'ethers';
import type { Block } from '@ethersproject/abstract-provider'; // eslint-disable-line import/no-extraneous-dependencies
import Config from 'config';
import { UsdcAddressInfo, useUsdcAddressStore } from './stores/UsdcAddress';
import { useUsdcNetworkStore } from './stores/UsdcNetwork';
import { useUsdcTransactionsStore, Transaction as PlainTransaction, TransactionState } from './stores/UsdcTransactions';

interface PolygonClient {
    provider: providers.Provider;
    usdc: Contract;
    // openGsn: Contract;
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

    const usdc = new ethers.Contract(Config.usdc.usdcContract, USDC_CONTRACT_ABI, provider);
    // const openGsn = new ethers.Contract(Config.usdc.openGsnContract, OPENGSN_CONTRACT_ABI, provider);

    resolver!({
        provider,
        usdc,
        // openGsn: openGsn,
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
        console.log('Polygon is now at', height);
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
        ])
            .then(([logsIn, logsOut]) => {
                // Filter known txs
                const knownHashes = knownTxs.map(
                    (tx) => `${tx.transactionHash}:${tx.logIndex}`,
                );
                const newLogs = logsIn.concat(logsOut).filter((log) => {
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
            .catch(() => fetchedAddresses.delete(address))
            .then(() => network$.fetchingTxHistory--);
    });
}

function logAndBlockToPlain(log: TransferEvent, block: Block): PlainTransaction {
    return {
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        sender: log.args.from,
        recipient: log.args.to,
        value: log.args.value.toNumber(), // With Javascript numbers we can represent up to 9,007,199,254 USDC
        // fee: number,
        state: TransactionState.MINED,
        blockHeight: block.number,
        timestamp: block.timestamp,
    };
}

// @ts-expect-error debugging
window.gimmePolygonClient = async () => getPolygonClient();

interface TransferResult extends ReadonlyArray<any> {
    0: string;
    1: string;
    2: BigNumber;
    from: string;
    to: string;
    value: BigNumber;
}

interface TransferEvent extends Event {
    args: TransferResult;
}

const USDC_CONTRACT_ABI = [
    // 'constructor()',
    // 'event Approval(address indexed owner, address indexed spender, uint256 value)',
    // 'event MetaTransactionExecuted(address userAddress, address relayerAddress, bytes functionSignature)',
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
    // eslint-disable-next-line max-len
    // 'function executeMetaTransaction(address userAddress, bytes functionSignature, bytes32 sigR, bytes32 sigS, uint8 sigV) payable returns (bytes)',
    // 'function getChainId() pure returns (uint256)',
    // 'function getDomainSeperator() view returns (bytes32)',
    // 'function getNonce(address user) view returns (uint256 nonce)',
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

// const OPENGSN_CONTRACT_ABI = [];

/* eslint-disable no-console */
import { ref, watch } from '@vue/composition-api';
import type { BigNumber, Contract, ethers, Event, EventFilter, providers } from 'ethers';
import type { Result } from 'ethers/lib/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Block, Log, TransactionReceipt } from '@ethersproject/abstract-provider';
import type { RelayRequest } from '@opengsn/common/dist/EIP712/RelayRequest';
import { UsdcAddressInfo, useUsdcAddressStore } from './stores/UsdcAddress';
import { useUsdcNetworkStore } from './stores/UsdcNetwork';
import {
    HtlcEvent,
    Transaction,
    TransactionState,
    useUsdcTransactionsStore,
} from './stores/UsdcTransactions';
import { useConfig } from './composables/useConfig';
import { ENV_MAIN } from './lib/Constants';
import {
    USDC_TRANSFER_CONTRACT_ABI,
    USDC_CONTRACT_ABI,
    USDC_HTLC_CONTRACT_ABI,
    NATIVE_USDC_CONTRACT_ABI,
    NATIVE_USDC_TRANSFER_CONTRACT_ABI,
} from './lib/usdc/ContractABIs';
import {
    getBestRelay,
    getRelayAddr,
    getRelayHub,
    POLYGON_BLOCKS_PER_MINUTE,
    RelayServerInfo,
} from './lib/usdc/OpenGSN';
import { getPoolAddress, getUsdcPrice } from './lib/usdc/Uniswap';
import { replaceKey } from './lib/KeyReplacer';

export async function loadEthersLibrary() {
    return import(/* webpackChunkName: "ethers-js" */ 'ethers');
}

export interface PolygonClient {
    provider: providers.Provider;
    usdc: Contract;
    usdcTransfer: Contract;
    nativeUsdc: Contract;
    nativeUsdcTransfer: Contract;
    ethers: typeof ethers;
}

function consensusEstablishedHandler(height: number) {
    useUsdcNetworkStore().state.outdatedHeight = height;
    console.log('Polygon connection established');
    useUsdcNetworkStore().state.consensus = 'established';
}

let isLaunched = false;

type Balances = Map<string, number>;
/**
 * Balances in bridged USDC-base units, excluding pending txs.
 */
const balances: Balances = new Map();
/**
 * Balances in native USDC-base units, excluding pending txs.
 */
const nativeBalances: Balances = new Map();

let clientPromise: Promise<PolygonClient> | null = null;
let unwatchGetPolygonClientConfig: (() => void) | null = null;
export async function getPolygonClient(): Promise<PolygonClient> {
    if (clientPromise) return clientPromise;

    let resolver: (client: PolygonClient) => void;
    clientPromise = new Promise<PolygonClient>((resolve) => {
        resolver = resolve;
    });

    const { config } = useConfig();
    unwatchGetPolygonClientConfig = watch(() => [
        config.usdc.rpcEndpoint,
        config.usdc.networkId,
        config.usdc.usdcContract,
        config.usdc.transferContract,
    ], () => {
        // Reset clientPromise when the usdc config changes.
        clientPromise = null;
        if (!unwatchGetPolygonClientConfig) return;
        unwatchGetPolygonClientConfig();
        unwatchGetPolygonClientConfig = null;
    }, { lazy: true });

    let provider: providers.BaseProvider;
    const [ethers, rpcEndpoint] = await Promise.all([
        loadEthersLibrary(),
        replaceKey(config.usdc.rpcEndpoint),
    ]);
    if (rpcEndpoint.substring(0, 4) === 'http') {
        provider = new ethers.providers.StaticJsonRpcProvider(
            rpcEndpoint,
            ethers.providers.getNetwork(config.usdc.networkId),
        );
    } else if (rpcEndpoint.substring(0, 2) === 'ws') {
        // No need to optimize this import as it's the ethers-js chunk which is already loaded via loadEthersLibrary.
        const SturdyWebsocket = (await import(/* webpackChunkName: "ethers-js" */ 'sturdy-websocket')).default;
        const socket = new SturdyWebsocket(rpcEndpoint, {
            debug: true,
        });
        socket.addEventListener('down', () => {
            console.log('Polygon connection lost');
            useUsdcNetworkStore().state.consensus = 'connecting';
        });
        socket.addEventListener('reopen', async () => {
            useUsdcNetworkStore().state.consensus = 'syncing';
            const client = await getPolygonClient();
            client.provider.once('block', consensusEstablishedHandler);
        });
        provider = new ethers.providers.WebSocketProvider(
            socket,
            ethers.providers.getNetwork(config.usdc.networkId),
        );
    } else {
        throw new Error('Invalid RPC endpoint URL');
    }

    await provider.ready;

    // Wait for a block event to make sure we are really connected
    await new Promise<void>((resolve) => {
        provider.once('block', (height: number) => {
            consensusEstablishedHandler(height);
            resolve();
        });
    });

    const usdc = new ethers.Contract(config.usdc.usdcContract, USDC_CONTRACT_ABI, provider);
    const usdcTransfer = new ethers.Contract(config.usdc.transferContract, USDC_TRANSFER_CONTRACT_ABI, provider);

    const nativeUsdc = new ethers.Contract(config.usdc.nativeUsdcContract, NATIVE_USDC_CONTRACT_ABI, provider);
    const nativeUsdcTransfer = new ethers.Contract(
        config.usdc.nativeTransferContract, NATIVE_USDC_TRANSFER_CONTRACT_ABI, provider);

    resolver!({
        provider,
        usdc,
        usdcTransfer,
        nativeUsdc,
        nativeUsdcTransfer,
        ethers,
    });

    return clientPromise;
}

async function getBalance(address: string) {
    const client = await getPolygonClient();
    const balance = await client.usdc.balanceOf(address) as BigNumber;
    return balance.toNumber(); // With Javascript numbers we can represent up to 9,007,199,254 USDC, enough for now
}

async function getNativeBalance(address: string) {
    const client = await getPolygonClient();
    const balance = await client.nativeUsdc.balanceOf(address) as BigNumber;
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

    const nativeAccounts = await Promise.all(addresses.map((address) => getNativeBalance(address)));
    const newNativeBalances: Balances = new Map(
        nativeAccounts.map((balance, i) => [addresses[i], balance]),
    );
    for (const [address, newBalance] of newNativeBalances) {
        if (nativeBalances.get(address) === newBalance) {
            // Balance did not change since last check.
            // Remove from newBalances Map to not update the store.
            newNativeBalances.delete(address);
        } else {
            // Update balances cache
            nativeBalances.set(address, newBalance);
        }
    }

    if (!newBalances.size && !newNativeBalances.size) return;
    if (newBalances.size) {
        console.debug('Got new bridged USDC balances for', [...newBalances.keys()], [...newBalances.values()]);
    }
    if (newNativeBalances.size) {
        console.warn(
            'Got new native USDC balances for', [...newNativeBalances.keys()], [...newNativeBalances.values()],
        );
    }
    const { patchAddress } = useUsdcAddressStore();
    for (const [address, balance] of newBalances) {
        patchAddress(address, { balance });
    }
    for (const [address, nativeBalance] of newNativeBalances) {
        patchAddress(address, { nativeBalance });
    }
}

function forgetBalances(addresses: string[]) {
    for (const address of addresses) {
        balances.delete(address);
        nativeBalances.delete(address);
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
    if (value.isZero()) return; // Ignore address poisoning scam transactions

    const { config } = useConfig();

    const [block, receipt] = await Promise.all([
        log.getBlock(),
        // Handle HTLC redeem/refund events
        from === config.usdc.htlcContract ? log.getTransactionReceipt() : Promise.resolve(null),
    ]);

    let tx: Transaction;
    if (receipt) {
        tx = await receiptToTransaction(receipt, undefined, block);
    } else {
        tx = logAndBlockToPlain(log, block);
    }

    useUsdcTransactionsStore().addTransactions([tx]);

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

    const { state: network$ } = useUsdcNetworkStore();
    const transactionsStore = useUsdcTransactionsStore();
    const { config } = useConfig();

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

        console.debug('Subscribing USDC addresses', newAddresses);
        subscribe(newAddresses);
    });

    // Fetch transactions for active address
    const txFetchTrigger = ref(0);
    watch([addressStore.addressInfo, txFetchTrigger, () => config.usdc], async ([addressInfo, trigger]) => {
        const address = (addressInfo as UsdcAddressInfo | null)?.address;
        if (!address || fetchedAddresses.has(address)) return;
        fetchedAddresses.add(address);

        console.debug('Scheduling USDC transaction fetch for', address);

        const knownTxs = Object.values(transactionsStore.state.transactions)
            .filter((tx) => tx.sender === address || tx.recipient === address);
        const lastConfirmedHeight = knownTxs
            .filter((tx) => Boolean(tx.blockHeight))
            .reduce((maxHeight, tx) => Math.max(tx.blockHeight!, maxHeight), 0);
        const earliestHeightToCheck = Math.max(config.usdc.earliestHistoryScanHeight, lastConfirmedHeight - 1000);

        network$.fetchingTxHistory++;

        if ((trigger as number) > 0) updateBalances([address]);

        const client = await getPolygonClient();
        const poolAddress = await getPoolAddress(client.usdcTransfer, config.usdc.usdcContract);
        // const nativePoolAddress = await getPoolAddress(client.nativeUsdcTransfer, config.usdc.nativeUsdcContract);

        console.debug('Fetching USDC transaction history for', address, knownTxs);

        // EventFilters only allow to query with an AND condition between arguments (topics). So while
        // we could specify an array of parameters to match for each topic (which are OR'd), we cannot
        // OR two AND pairs. That requires two separate requests.
        const filterIncoming = client.usdc.filters.Transfer(null, address);
        const filterOutgoing = client.usdc.filters.Transfer(address);
        // const filterMetaTx = client.usdc.filters.MetaTransactionExecuted();

        const STEP_BLOCKS = config.usdc.rpcMaxBlockRange;

        const MAX_ALLOWANCE = client.ethers
            .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

        // The minimum allowance that should remain so we can be certain the max allowance was ever given.
        // If the current allowance is below this number, we ignore allowance counting for the history sync.
        const MIN_ALLOWANCE = client.ethers
            .BigNumber.from('0x1000000000000000000000000000000000000000000000000000000000000000');

        Promise.all([
            client.usdc.balanceOf(address) as Promise<BigNumber>,
            client.usdc.nonces(address).then((nonce: BigNumber) => nonce.toNumber()) as Promise<number>,
            client.usdc.allowance(address, config.usdc.transferContract)
                .then((allowance: BigNumber) => {
                    if (allowance.lt(MIN_ALLOWANCE)) return client.ethers.BigNumber.from(0);
                    return MAX_ALLOWANCE.sub(allowance);
                }) as Promise<BigNumber>,
            client.usdc.allowance(address, config.usdc.htlcContract)
                .then((allowance: BigNumber) => {
                    if (allowance.lt(MIN_ALLOWANCE)) return client.ethers.BigNumber.from(0);
                    return MAX_ALLOWANCE.sub(allowance);
                }) as Promise<BigNumber>,
        ]).then(async ([balance, usdcNonce, transferAllowanceUsed, htlcAllowanceUsed]) => {
            let blockHeight = await getPolygonBlockNumber();

            // To filter known txs
            const knownHashes = knownTxs.map(
                (tx) => tx.transactionHash,
            );

            const htlcEventsByTransactionHash = new Map<string, Promise<HtlcEvent | undefined>>();

            /* eslint-disable max-len */
            while (blockHeight > earliestHeightToCheck && (
                balance.gt(0)
                || usdcNonce > 0
                || transferAllowanceUsed.gt(0)
                || htlcAllowanceUsed.gt(0)
            )) {
                const startHeight = Math.max(blockHeight - STEP_BLOCKS, earliestHeightToCheck);
                const endHeight = blockHeight;
                blockHeight = startHeight;

                console.debug('USDC Sync start', {
                    balance: balance.toNumber() / 1e6,
                    usdcNonce,
                    transferAllowance: transferAllowanceUsed.toNumber() / 1e6,
                    htlcAllowance: transferAllowanceUsed.toNumber() / 1e6,
                });

                console.debug(`Querying logs from ${startHeight} to ${endHeight} = ${endHeight - startHeight}`);

                let [logsIn, logsOut/* , metaTxs */] = await Promise.all([ // eslint-disable-line no-await-in-loop
                    client.usdc.queryFilter(filterIncoming, startHeight, endHeight),
                    client.usdc.queryFilter(filterOutgoing, startHeight, endHeight),
                ]);

                // Ignore address poisoning transactions
                logsIn = logsIn.filter((log) => !!log.args && !(log.args.value as BigNumber).isZero());
                logsOut = logsOut.filter((log) => !!log.args && !(log.args.value as BigNumber).isZero());

                console.debug(`Got ${logsIn.length} incoming logs, ${logsOut.length} outgoing logs` /* , and ${metaTxs.length} meta tx logs` */);

                // TODO: When switching to use max-approval, only reduce nonce once the allowances are 0
                const outgoingTxs = new Set(logsOut.map((ev) => ev.transactionHash));
                console.debug(`Found ${outgoingTxs.size} outoing txs`);
                usdcNonce -= outgoingTxs.size;

                const txsUsingHtlcAllowance = new Set(logsOut
                    .filter((ev) => ev.args?.to === config.usdc.htlcContract) // Only HTLC fundings are relevant
                    .map((ev) => ev.transactionHash));

                const allTransferLogs = logsIn.concat(logsOut);

                // eslint-disable-next-line no-loop-func
                const newLogs = allTransferLogs.filter((log) => {
                    if (!log.args) return false;

                    // TODO: When switching to use max-approval, remove usdcNonce <= 0 check, so allowances get reduced first
                    if (log.args.from === address && usdcNonce <= 0) {
                        balance = balance.add(log.args.value);

                        if (txsUsingHtlcAllowance.has(log.transactionHash)) {
                            htlcAllowanceUsed = htlcAllowanceUsed.sub(log.args.value);
                        } else {
                            transferAllowanceUsed = transferAllowanceUsed.sub(log.args.value);
                        }
                    }
                    if (log.args.to === address) {
                        balance = balance.sub(log.args.value);
                    }

                    if (knownHashes.includes(log.transactionHash)) return false;

                    // Transfers to the Uniswap pool are the fees paid to OpenGSN
                    if (
                        log.args.to === poolAddress
                        || (
                            // Before v3, transfers to the transferContract were the fees paid to OpenGSN
                            config.environment !== ENV_MAIN
                            && (
                                log.args.to === '0x443EAAd5EeAacCdC3887477c188CF2875B3dcf7c' // v2 USDC transfer contract
                                || log.args.to === '0x703EC732971cB23183582a6966bA70E164d89ab1' // v1 USDC transfer contract
                            )
                        )
                    ) {
                        // Find the main transfer log
                        const mainTransferLog = allTransferLogs.find((otherLog) =>
                            otherLog.transactionHash === log.transactionHash
                            && otherLog.logIndex !== log.logIndex);

                        if (mainTransferLog && mainTransferLog.args) {
                            // Write this log's `value` as the main transfer log's `fee`
                            mainTransferLog.args = addFeeToArgs(mainTransferLog.args, log.args.value);
                        }

                        // Then ignore this log
                        return false;
                    }

                    if (log.args.to === config.usdc.htlcContract) {
                        if (
                            // Before v3, transfers to the HTLC contract were the fees paid to OpenGSN
                            config.environment !== ENV_MAIN
                            && log.args.to === '0x573aA448cC6e28AF0EeC7E93037B5A592a83d936' // v1 USDC HTLC contract
                        ) {
                            // Determine if this transfer is the fee, by looking for another transfer in this
                            // transaction with a higher `logIndex`, which means that one is the main transfer and this
                            // one is the fee.
                            const mainTransferLog = allTransferLogs.find((otherLog) =>
                                otherLog.transactionHash === log.transactionHash
                                && otherLog.logIndex > log.logIndex);

                            if (mainTransferLog && mainTransferLog.args) {
                                // Write this log's `value` as the main transfer log's `fee`
                                mainTransferLog.args = addFeeToArgs(mainTransferLog.args, log.args.value);

                                // Then ignore this log
                                return false;
                            }
                        }

                        // Get Open event log
                        const htlcEventPromise = log.getTransactionReceipt().then(async (receipt) => {
                            const htlcContract = await getHtlcContract();

                            for (const innerLog of receipt.logs) {
                                if (innerLog.address === config.usdc.htlcContract) {
                                    try {
                                        const { args, name } = htlcContract.interface.parseLog(innerLog);
                                        if (name === 'Open') {
                                            return <HtlcEvent> {
                                                name,
                                                id: args.id,
                                                token: args.token,
                                                amount: args.amount.toNumber(),
                                                recipient: args.recipient,
                                                hash: args.hash,
                                                timeout: args.timeout.toNumber(),
                                            };
                                        }
                                    } catch (error) { /* ignore */ }
                                }
                            }
                            return undefined;
                        });

                        htlcEventsByTransactionHash.set(log.transactionHash, htlcEventPromise);
                    }

                    if (log.args.from === config.usdc.htlcContract) {
                        // Get Redeem or Refund event log
                        const htlcEventPromise = log.getTransactionReceipt().then(async (receipt) => {
                            const htlcContract = await getHtlcContract();

                            for (const innerLog of receipt.logs) {
                                if (innerLog.address === config.usdc.htlcContract) {
                                    try {
                                        const { args, name } = htlcContract.interface.parseLog(innerLog);
                                        if (name === 'Redeem') {
                                            return <HtlcEvent> {
                                                name,
                                                id: args.id,
                                                secret: args.secret,
                                            };
                                        }
                                        if (name === 'Refund') {
                                            return <HtlcEvent> {
                                                name,
                                                id: args.id,
                                            };
                                        }
                                    } catch (error) { /* ignore */ }
                                }
                            }
                            return undefined;
                        });

                        htlcEventsByTransactionHash.set(log.transactionHash, htlcEventPromise);
                    }

                    return true;
                }) as TransferEvent[];

                const logsAndBlocks = newLogs.map((log) => ({
                    log,
                    block: log.getBlock(),
                    event: htlcEventsByTransactionHash.get(log.transactionHash),
                }));

                // TODO: Allow individual fetches to fail, but still add the other transactions?
                await Promise.all(logsAndBlocks.map( // eslint-disable-line no-await-in-loop
                    async ({ log, block, event }) => logAndBlockToPlain(
                        log,
                        await block,
                        await event,
                    ),
                )).then((transactions) => {
                    transactionsStore.addTransactions(transactions);
                });
            } // End while loop
            /* eslint-enable max-len */

            console.debug('USDC Sync end', {
                balance: balance.toNumber() / 1e6,
                usdcNonce,
                transferAllowance: transferAllowanceUsed.toNumber() / 1e6,
                htlcAllowance: transferAllowanceUsed.toNumber() / 1e6,
            });
        })
            .catch((error) => {
                console.error(error);
                fetchedAddresses.delete(address);
            })
            .then(() => network$.fetchingTxHistory--);
    });
}

function logAndBlockToPlain(log: TransferEvent | TransferLog, block?: Block, event?: HtlcEvent): Transaction {
    return {
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        sender: log.args.from,
        recipient: log.args.to,
        value: log.args.value.toNumber(), // With Javascript numbers we can safely represent up to 9,007,199,254 USDC
        fee: log.args.fee?.toNumber(),
        event,
        state: block ? TransactionState.MINED : TransactionState.PENDING,
        blockHeight: block?.number,
        timestamp: block?.timestamp,
    };
}

type ContractMethods =
    'transfer'
    | 'transferWithApproval'
    | 'transferWithPermit'
    | 'open'
    | 'openWithApproval'
    | 'redeemWithSecretInData'
    | 'refund';

export async function calculateFee(
    token: string, // Contract address
    method: ContractMethods,
    forceRelay?: RelayServerInfo,
    contract?: Contract,
) {
    const client = await getPolygonClient();
    const { config } = useConfig();
    if (!contract) {
        if (token === config.usdc.usdcContract) contract = client.usdcTransfer;
        else contract = client.nativeUsdcTransfer;
    }

    // The byte size of `data` of the wrapper relay transaction, plus 4 bytes for the `relayCall` method identifier
    const dataSize = {
        transfer: 1092,
        transferWithApproval: 1220,
        transferWithPermit: 1220,
        open: 1220,
        openWithApproval: 1348,
        redeemWithSecretInData: 1092,
        refund: 1092,
    }[method];

    if (!dataSize) throw new Error(`No dataSize set yet for ${method} method!`);

    // Update minGasPrice if relay was forcedRelay, as it is most likely outdated.
    // Also checks for `ready` status to avoid retrying with a non-ready relay
    let relay = await (forceRelay
        ? getRelayAddr(forceRelay.url).then((addr) => {
            if (!addr || !addr.ready) return undefined;
            return <RelayServerInfo> {
                ...forceRelay,
                minGasPrice: client.ethers.BigNumber.from(addr.minGasPrice),
            };
        })
        : Promise.resolve(undefined)
    );

    const [
        networkGasPrice,
        gasLimit,
        [acceptanceBudget],
        dataGasCost,
        usdcPrice,
    ] = await Promise.all([
        client.provider.getGasPrice(),
        contract.getRequiredRelayGas(contract.interface.getSighash(method)) as Promise<BigNumber>,
        relay
            ? Promise.resolve([client.ethers.BigNumber.from(0)])
            : contract.getGasAndDataLimits() as Promise<[BigNumber, BigNumber, BigNumber, BigNumber]>,
        relay
            ? Promise.resolve(client.ethers.BigNumber.from(0))
            : getRelayHub(client).calldataGasCost(dataSize) as Promise<BigNumber>,
        getUsdcPrice(token, client),
    ]);

    function calculateChainTokenFee(baseRelayFee: BigNumber, pctRelayFee: BigNumber, minGasPrice: BigNumber) {
        let gasPrice = networkGasPrice.gte(minGasPrice) ? networkGasPrice : minGasPrice;

        // For swap redeem txs, add 50% to cover network fee changes until the end of the swap.
        // Otherwise, in mainnet, add 10%; in testnet add 25% as it is more volatile.
        const gasPriceBufferPercentage = method === 'redeemWithSecretInData'
            ? 150
            : useConfig().config.environment === ENV_MAIN ? 110 : 125;
        gasPrice = gasPrice.mul(gasPriceBufferPercentage).div(100);

        // (gasPrice * gasLimit) * (1 + pctRelayFee) + baseRelayFee
        const chainTokenFee = gasPrice.mul(gasLimit).mul(pctRelayFee.add(100)).div(100).add(baseRelayFee);

        return { gasPrice, chainTokenFee };
    }

    if (!relay) {
        const requiredMaxAcceptanceBudget = acceptanceBudget.add(dataGasCost);
        relay = await getBestRelay(client, requiredMaxAcceptanceBudget, calculateChainTokenFee);
    }

    const { baseRelayFee, pctRelayFee, minGasPrice } = relay;

    const { gasPrice, chainTokenFee } = calculateChainTokenFee(baseRelayFee, pctRelayFee, minGasPrice);

    // main 10%, test 25% as it is more volatile
    const uniswapBufferPercentage = useConfig().config.environment === ENV_MAIN ? 110 : 125;
    const fee = chainTokenFee.div(usdcPrice).mul(uniswapBufferPercentage).div(100);

    return {
        chainTokenFee,
        fee,
        gasPrice,
        gasLimit,
        relay,
        usdcPrice,
    };
}

export async function createTransactionRequest(
    token: string,
    recipient: string,
    amount: number,
    forceRelay?: RelayServerInfo,
) {
    const addressInfo = useUsdcAddressStore().addressInfo.value;
    if (!addressInfo) throw new Error('No active USDC address');
    const fromAddress = addressInfo.address;

    const { config } = useConfig();

    const client = await getPolygonClient();

    const usdcContract = token === config.usdc.usdcContract ? client.usdc : client.nativeUsdc;
    const transferContract = token === config.usdc.usdcContract ? client.usdcTransfer : client.nativeUsdcTransfer;

    const [
        usdcNonce,
        // usdcAllowance,
        forwarderNonce,
    ] = await Promise.all([
        usdcContract.nonces(fromAddress) as Promise<BigNumber>,
        // usdcContract.allowance(fromAddress, config.usdc.transferContract) as Promise<BigNumber>,
        transferContract.getNonce(fromAddress) as Promise<BigNumber>,
    ]);

    const method: 'transfer' | 'transferWithApproval' | 'transferWithPermit' = token === config.usdc.usdcContract
        ? 'transferWithApproval'
        : 'transferWithPermit';
    // This sets the fee buffer to 10 USDC, which should be enough.
    // method = usdcAllowance.gte(amount + 10e6) ? 'transfer' : method;

    const { fee, gasPrice, gasLimit, relay } = await calculateFee(token, method, forceRelay);

    // Ensure we send only what's possible with the updated fee
    amount = Math.min(amount, (addressInfo.balance || 0) - fee.toNumber());

    // // To be safe, we still check that amount + fee fits into the current allowance
    // if (method === 'transfer' && usdcAllowance.lt(fee.add(amount))) {
    //     throw new Error('Unexpectedly high fee, not enough allowance on the USDC contract');
    // }

    const data = transferContract.interface.encodeFunctionData(method, [
        /* address token */ token,
        /* uint256 amount */ amount,
        /* address target */ recipient,
        /* uint256 fee */ fee,
        ...(method === 'transferWithPermit' || method === 'transferWithApproval' ? [
            // // Approve the maximum possible amount so afterwards we can use the `transfer` method for lower fees
            // /* uint256 value/approval */ client.ethers
            //     .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
            /* uint256 value/approval */ fee.add(amount),

            // Dummy values, replaced by real signature bytes in Keyguard
            /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
            /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
            /* uint8 sigV */ 0,
        ] : []),
    ]);

    const paymasterAddress = token === config.usdc.usdcContract
        ? config.usdc.transferContract
        : config.usdc.nativeTransferContract;

    const relayRequest: RelayRequest = {
        request: {
            from: fromAddress,
            to: paymasterAddress,
            data,
            value: '0',
            nonce: forwarderNonce.toString(),
            gas: gasLimit.toString(),
            validUntil: (await getPolygonBlockNumber() + 2 * 60 * POLYGON_BLOCKS_PER_MINUTE) // 2 hours
                .toString(10),
        },
        relayData: {
            gasPrice: gasPrice.toString(),
            pctRelayFee: relay.pctRelayFee.toString(),
            baseRelayFee: relay.baseRelayFee.toString(),
            relayWorker: relay.relayWorkerAddress,
            paymaster: paymasterAddress,
            paymasterData: '0x',
            clientId: Math.floor(Math.random() * 1e6).toString(10),
            forwarder: paymasterAddress,
        },
    };

    return {
        relayRequest,
        relay: {
            url: relay.url,
        },
        ...(method === 'transferWithApproval' ? {
            approval: {
                tokenNonce: usdcNonce.toNumber(),
            },
        } : null),
        ...(method === 'transferWithPermit' ? {
            permit: {
                tokenNonce: usdcNonce.toNumber(),
            },
        } : null),
    };
}

export async function sendTransaction(
    relayRequest: RelayRequest,
    signature: string,
    relayUrl: string,
    approvalData = '0x',
) {
    const { config } = useConfig();
    const client = await getPolygonClient();

    const [{ HttpClient, HttpWrapper }, relayNonce] = await Promise.all([
        import('@opengsn/common'),
        client.provider.getTransactionCount(relayRequest.relayData.relayWorker),
    ]);
    const httpClient = new HttpClient(new HttpWrapper(), console);

    const relayNonceMaxGap = config.environment === ENV_MAIN ? 3 : 5;

    const relayTx = await httpClient.relayTransaction(relayUrl, {
        relayRequest,
        metadata: {
            approvalData,
            relayHubAddress: config.usdc.relayHubContract,
            relayMaxNonce: relayNonce + relayNonceMaxGap,
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

    // If `approvalData` is present, this is a redeem transaction
    const isHtlcRedeemTx = approvalData.length > 2;
    const isHtlcRefundTx = relayRequest.request.data.startsWith(
        (await getHtlcContract()).interface.getSighash('refund'),
    );

    const isIncomingTx = isHtlcRedeemTx || isHtlcRefundTx;

    const tx = await receiptToTransaction(
        await txResponse.wait(1),
        // Do not filter by sender for incoming txs
        isIncomingTx ? undefined : relayRequest.request.from,
    );

    if (!isIncomingTx) {
        // Trigger manual balance update for outgoing transactions
        updateBalances([relayRequest.request.from]);
    }

    return tx;
}

export async function receiptToTransaction(
    receipt: TransactionReceipt,
    filterByFromAddress?: string,
    block?: providers.Block,
) {
    const { config } = useConfig();
    const client = await getPolygonClient();

    const [htlcContract, poolAddress] = await Promise.all([
        getHtlcContract(),
        getPoolAddress(client.usdcTransfer, config.usdc.usdcContract),
    ]);

    const logs = receipt.logs.map((log) => {
        if (log.address === config.usdc.usdcContract) {
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
        }

        if (log.address === config.usdc.htlcContract) {
            try {
                const { args, name } = htlcContract.interface.parseLog(log);
                return {
                    ...log,
                    args,
                    name,
                };
            } catch (error) {
                return null;
            }
        }

        return null;
    });

    let transferLog: TransferLog | undefined;
    let fee: BigNumber | undefined;
    let htlcEvent: HtlcEvent | undefined;

    logs.forEach((log) => {
        if (!log) return;

        if (log.name === 'Transfer') {
            if (filterByFromAddress && log.args.from !== filterByFromAddress) return;

            // Transfers to the Uniswap pool are the fees paid to OpenGSN
            if (
                log.args.to === poolAddress
                || (
                    // Before v3, transfers to the transferContract were the fees paid to OpenGSN
                    config.environment !== ENV_MAIN
                    && (
                        log.args.to === '0x443EAAd5EeAacCdC3887477c188CF2875B3dcf7c' // v2 USDC transfer contract
                        || log.args.to === '0x703EC732971cB23183582a6966bA70E164d89ab1' // v1 USDC transfer contract
                    )
                )
                || (
                    // Before v3, the first transfer to the HTLC contract was the fee paid to OpenGSN
                    config.environment !== ENV_MAIN
                    && (
                        log.args.to === '0x573aA448cC6e28AF0EeC7E93037B5A592a83d936' // v1 USDC HTLC contract
                        && !fee
                        // When Fastspot is funding the HTLC, there's only one Transfer event, which is the main
                        // `transferLog`, so don't handle any fee.
                        && logs.filter((l) => l?.name === 'Transfer').length > 1
                    )
                )
            ) {
                fee = log.args.value;
                return;
            }

            transferLog = log as TransferLog;
            return;
        }

        if (log.name === 'Open') {
            htlcEvent = {
                name: log.name,
                id: log.args.id,
                token: log.args.token,
                amount: log.args.amount.toNumber(),
                recipient: log.args.recipient,
                hash: log.args.hash,
                timeout: log.args.timeout.toNumber(),
            };
        }

        if (log.name === 'Redeem') {
            htlcEvent = {
                name: log.name,
                id: log.args.id,
                secret: log.args.secret,
            };
        }

        if (log.name === 'Refund') {
            htlcEvent = {
                name: log.name,
                id: log.args.id,
            };
        }
    });

    if (!transferLog) throw new Error('Could not find transfer log');

    if (fee) {
        transferLog.args = addFeeToArgs(transferLog.args, fee) as TransferResult;
    }

    return logAndBlockToPlain(
        transferLog,
        block || await client.provider.getBlock(transferLog.blockHash),
        htlcEvent,
    );
}

export async function getPolygonBlockNumber() {
    const client = await getPolygonClient();
    const blockNumber = await client.provider.getBlockNumber();
    useUsdcNetworkStore().state.outdatedHeight = blockNumber;
    return blockNumber;
}

let htlcContract: Contract | undefined;
export async function getHtlcContract() {
    if (htlcContract) return htlcContract;

    const { ethers, provider } = await getPolygonClient();
    const { config } = useConfig();
    htlcContract = new ethers.Contract(
        config.usdc.htlcContract,
        USDC_HTLC_CONTRACT_ABI,
        provider,
    );

    return htlcContract;
}

function addFeeToArgs(readonlyArgs: Result, fee: BigNumber): Result {
    // Clone args as writeable
    type Writeable<T> = { -readonly [P in keyof T]: T[P] };
    const args = [...readonlyArgs] as Writeable<Result>;
    [args.from, args.to, args.value] = args;

    // Add the fee
    args.push(fee);
    args.fee = args[3]; // eslint-disable-line prefer-destructuring

    return Object.freeze(args);
}

// @ts-expect-error debugging
window.gimmePolygonClient = async () => getPolygonClient();

interface TransferResult extends ReadonlyArray<any> {
    0: string;
    1: string;
    2: BigNumber;
    3?: BigNumber;
    from: string;
    to: string;
    value: BigNumber;
    fee?: BigNumber;
}

interface TransferLog extends Log {
    args: TransferResult;
    name: string;
}

interface TransferEvent extends Event {
    args: TransferResult;
}

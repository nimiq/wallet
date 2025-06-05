<template>
    <transition :name="swapIsComplete ? 'slide' : 'minimize'">
        <button
            v-if="activeSwap && $route.name !== 'swap' && $route.name !== 'buy-crypto' && $route.name !== 'sell-crypto'"
            class="reset swap-notification flex-row" :class="{
                'complete': swapIsComplete,
                'expired': swapIsExpired,
                'errored': (swapIsErrored && !swapIsExpired) || oasisPayoutFailed,
            }"
            @click="openSwap"
        >
            <div class="icon">
                <StopwatchIcon v-if="swapIsExpired" />
                <AlertTriangleIcon v-else-if="swapIsErrored || oasisLimitExceeded || oasisPayoutFailed"/>
                <CheckmarkIcon v-else-if="swapIsComplete"/>
                <LoadingSpinner v-else/>
            </div>
            <div class="content flex-column">
                <div v-if="swapIsExpired" class="status">
                    {{ $t('Swap has expired') }}
                </div>
                <div v-else-if="swapIsErrored || oasisLimitExceeded || oasisPayoutFailed" class="status">
                    {{ $t('There\'s a problem') }}
                </div>
                <div v-else-if="swapIsComplete" class="status">
                    {{ $t('Swap successful!') }}
                </div>
                <div v-else class="status">
                    {{ $t('Performing swap {progress}/5', { progress: (activeSwap ? activeSwap.state : 0) + 1 }) }}
                </div>

                <span
                    v-if="swapIsExpired || swapIsErrored || oasisLimitExceeded || oasisPayoutFailed"
                    class="closing-notice"
                >
                    {{ $t('Click for more information') }}
                </span>
                <span v-else-if="swapIsComplete" class="closing-notice">
                    {{ $t('It\'s safe to close your wallet now') }}
                </span>
                <span v-else class="closing-notice nq-orange">
                    {{ $t('Don\'t close your wallet!') }}
                </span>
            </div>
            <MaximizeIcon v-if="!swapIsComplete"/>
        </button>
    </transition>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { LoadingSpinner, CheckmarkIcon, AlertTriangleIcon, StopwatchIcon } from '@nimiq/vue-components';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { Contract, getSwap, Swap } from '@nimiq/fastspot-api';
import {
    ClearingInfo,
    ClearingStatus,
    DeniedReason,
    getHtlc,
    Htlc as OasisHtlc,
    HtlcStatus,
    settleHtlc,
    SettlementInfo,
    SettlementStatus,
} from '@nimiq/oasis-api';
import { SwapHandler, Swap as GenericSwap, SwapAsset, Client, Transaction } from '@nimiq/libswap';
import type { ForwardRequest } from '@opengsn/common/dist/EIP712/ForwardRequest';
import { Event as PolygonEvent, EventType as PolygonEventType } from '@nimiq/libswap/dist/libswap.js';
import { useRouter, RouteName } from '@/router';
import { useI18n } from '@/lib/useI18n';
import MaximizeIcon from '../icons/MaximizeIcon.vue';
import { useSwapsStore, SwapState, ActiveSwap, SwapEurData, SwapErrorAction } from '../../stores/Swaps';
import { useNetworkStore } from '../../stores/Network';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useBankStore } from '../../stores/Bank';
import { useConfig } from '../../composables/useConfig';
import { getElectrumClient, subscribeToAddresses } from '../../electrum';
import { getNetworkClient } from '../../network';
import { getServerTime } from '../../lib/Time';
import { usePolygonNetworkStore } from '../../stores/PolygonNetwork';
import {
    getUsdcHtlcContract,
    getUsdtBridgedHtlcContract,
    getPolygonBlockNumber,
    getPolygonClient,
    receiptToTransaction,
    sendTransaction as sendPolygonTransaction,
} from '../../ethers';
import { useUsdcTransactionsStore, Transaction as UsdcTransaction } from '../../stores/UsdcTransactions';
import { useUsdtTransactionsStore, Transaction as UsdtTransaction } from '../../stores/UsdtTransactions';
import { POLYGON_BLOCKS_PER_MINUTE } from '../../lib/usdc/OpenGSN';
import { reportToSentry } from '../../lib/Sentry';

enum SwapError {
    EXPIRED = 'EXPIRED',
    DELETED = 'DELETED',
}

export default defineComponent({
    setup() {
        const {
            activeSwap,
            setActiveSwap,
            addFundingData,
            addSettlementData,
            setPromoBoxVisible,
            state: swap$,
        } = useSwapsStore();
        const { bank, bankAccount } = useBankStore();
        const { config } = useConfig();

        const swapIsComplete = computed(() => !!activeSwap.value && activeSwap.value.state === SwapState.COMPLETE);
        const swapIsExpired = computed(() => !!activeSwap.value && activeSwap.value.state === SwapState.EXPIRED);
        const swapIsErrored = computed(() => !!activeSwap.value && activeSwap.value.error);

        const router = useRouter();
        const { $t } = useI18n();

        function onUnload(event: BeforeUnloadEvent) {
            // Firefox respects the event cancellation to prompt the user
            event.preventDefault();
            // Chrome requires returnValue to be set
            event.returnValue = '';
        }

        onMounted(() => {
            if (activeSwap.value) processSwap();
        });

        let swapHandler: SwapHandler<SwapAsset, SwapAsset> | undefined;
        let expiryCheckInterval = -1;

        function cleanUp() {
            window.removeEventListener('beforeunload', onUnload);
            window.clearInterval(expiryCheckInterval);
        }

        async function isExpired() {
            const timestamp = await getServerTime(true);
            const swap = activeSwap.value!;

            /**
             * Timestamps in seconds
             */
            const remainingTimes: number[] = [];

            // When we haven't funded our HTLC yet, we need to abort when the quote expires.
            if (swap.state <= SwapState.AWAIT_INCOMING) {
                if (swap.expires <= timestamp) return true;
                remainingTimes.push(swap.expires - timestamp);
            }

            // Otherwise, the swap expires when the first HTLC expires
            for (const contract of Object.values(swap.contracts)) {
                let timeout: number;
                switch (contract!.asset) {
                    case SwapAsset.NIM: {
                        const { timeoutTime } = (contract as Contract<SwapAsset.NIM>).htlc;
                        timeout = Math.floor(timeoutTime / 1e3);
                        break;
                    }
                    case SwapAsset.BTC:
                    case SwapAsset.USDC_MATIC:
                    case SwapAsset.USDT_MATIC:
                    case SwapAsset.EUR: {
                        ({ timeout } = contract as Contract<
                            SwapAsset.BTC | SwapAsset.USDC_MATIC | SwapAsset.USDT_MATIC | SwapAsset.EUR
                        >);
                        break;
                    }
                    default: throw new Error('Invalid swap asset');
                }

                if (timeout <= timestamp) return true;
                remainingTimes.push(timeout - timestamp);
            }

            // eslint-disable-next-line no-console
            console.debug('Swap expires in', Math.min(...remainingTimes), 'seconds');

            return false;
        }

        async function checkExpired() {
            if (!activeSwap.value) {
                if (swapHandler) swapHandler.stop(new Error(SwapError.DELETED));
                cleanUp();
                return true;
            }

            if (await isExpired()) {
                if (swapHandler) swapHandler.stop(new Error(SwapError.EXPIRED));
                cleanUp();
                updateSwap({
                    state: SwapState.EXPIRED,
                });
                return true;
            }
            return false;
        }

        watch(activeSwap, (newSwap, oldSwap) => {
            if (!newSwap) {
                if (swapHandler) swapHandler.stop(new Error(SwapError.DELETED));
                cleanUp();
                return;
            }

            if (newSwap && !oldSwap) {
                // A new swap started, start processing it
                processSwap();
            }
        }, { lazy: true });

        function updateSwap(update: Partial<ActiveSwap>) {
            setActiveSwap({
                ...activeSwap.value!,
                ...update,
            });
        }

        const currentError = ref<string>(null);

        const processingError = computed(() => {
            if (currentError.value) return currentError.value;

            const consensusErrorMsg = (chain: 'Nimiq' | 'Bitcoin' | 'Polygon') => `
                ${$t('No connection to {chain} network.', { chain })}
                ${$t('If this error persists, check your internet connection or '
                    + 'reload the page to reconnect.')}
            `;

            if (activeSwap.value) {
                const swap = activeSwap.value;

                if ([SwapState.AWAIT_INCOMING, SwapState.SETTLE_INCOMING].includes(swap.state)) {
                    if (swap.to.asset === SwapAsset.NIM && useNetworkStore().state.consensus !== 'established') {
                        return consensusErrorMsg('Nimiq');
                    }
                    if (swap.to.asset === SwapAsset.BTC && useBtcNetworkStore().state.consensus !== 'established') {
                        return consensusErrorMsg('Bitcoin');
                    }
                    if (
                        (swap.to.asset === SwapAsset.USDC_MATIC || swap.to.asset === SwapAsset.USDT_MATIC)
                        && usePolygonNetworkStore().state.consensus !== 'established'
                    ) {
                        return consensusErrorMsg('Polygon');
                    }
                }

                if ([SwapState.CREATE_OUTGOING, SwapState.AWAIT_SECRET].includes(swap.state)) {
                    if (swap.from.asset === SwapAsset.NIM && useNetworkStore().state.consensus !== 'established') {
                        return consensusErrorMsg('Nimiq');
                    }
                    if (swap.from.asset === SwapAsset.BTC && useBtcNetworkStore().state.consensus !== 'established') {
                        return consensusErrorMsg('Bitcoin');
                    }
                    if (
                        (swap.from.asset === SwapAsset.USDC_MATIC || swap.from.asset === SwapAsset.USDT_MATIC)
                        && usePolygonNetworkStore().state.consensus !== 'established'
                    ) {
                        return consensusErrorMsg('Polygon');
                    }
                }
            }

            return undefined;
        });

        watch(processingError, (error: string | undefined) => {
            if (!activeSwap.value) return;
            updateSwap({ error });
        });

        async function getClient(asset: SwapAsset, swap: ActiveSwap): Promise<Client<SwapAsset>> {
            switch (asset) {
                case SwapAsset.NIM: return getNetworkClient() as Promise<Client<SwapAsset.NIM>>;
                case SwapAsset.BTC: return getElectrumClient();
                case SwapAsset.USDC_MATIC:
                case SwapAsset.USDT_MATIC: {
                    const { timeout } = swap.contracts[asset]!;
                    const secondsUntilTimeout = timeout - Math.floor(Date.now() / 1e3);
                    const blocksUntilTimeout = Math.ceil((secondsUntilTimeout / 60) * POLYGON_BLOCKS_PER_MINUTE);

                    const currentHeight = await getPolygonBlockNumber();
                    const blockHeightAtTimeout = currentHeight + blocksUntilTimeout;
                    const blocksOfValidity = 3 /* hours */ * 60 * POLYGON_BLOCKS_PER_MINUTE;
                    const blockHeightAtStart = blockHeightAtTimeout - blocksOfValidity;

                    return {
                        htlcContract: asset === SwapAsset.USDC_MATIC
                            ? await getUsdcHtlcContract()
                            : await getUsdtBridgedHtlcContract(),
                        currentBlock: () => getPolygonBlockNumber(),
                        startBlock: blockHeightAtStart,
                        endBlock: blockHeightAtTimeout > currentHeight ? undefined : blockHeightAtTimeout,
                    };
                }
                case SwapAsset.EUR: return { getHtlc, settleHtlc };
                default: throw new Error(`Unsupported asset: ${asset}`);
            }
        }

        const oasisLimitExceeded = ref(false);
        const oasisPayoutFailed = ref(false);

        // The listener should run in the background, even if the transaction-sending itself fails and
        // `processSwap` thus throws. To keep the same listener across retries, it is scoped outside the
        // `processSwap` function.
        let polygonListener: Promise<PolygonEvent<PolygonEventType>> | undefined;
        let isPolygonListenerResolved = false;

        async function processSwap() {
            if (!activeSwap.value || !activeSwap.value.id || !activeSwap.value.from) {
                // This is a ghost swap that could happen in versions 2.11.0-2.11.5 when an onUpdate handler
                // updated the activeSwap object after the swap was deleted, thereby recreating the object
                // with only e.g. the `fundingTx` property
                setActiveSwap(null);
                return;
            }

            console.info('Processing swap'); // eslint-disable-line no-console

            const swapsNim = [activeSwap.value!.from.asset, activeSwap.value!.to.asset].includes(SwapAsset.NIM);
            const swapsBtc = [activeSwap.value!.from.asset, activeSwap.value!.to.asset].includes(SwapAsset.BTC);
            const swapsUsdc = [activeSwap.value!.from.asset, activeSwap.value!.to.asset].includes(SwapAsset.USDC_MATIC);
            const swapsUsdt = [activeSwap.value!.from.asset, activeSwap.value!.to.asset].includes(SwapAsset.USDT_MATIC);
            // const swapsEur = [activeSwap.value!.from.asset, activeSwap.value!.to.asset].includes(SwapAsset.EUR);

            // Await Nimiq and Bitcoin consensus
            if (swapsNim && useNetworkStore().state.consensus !== 'established') {
                const nimiqClient = await getNetworkClient();
                await nimiqClient.waitForConsensusEstablished();
            }
            if (swapsBtc && useBtcNetworkStore().state.consensus !== 'established') {
                const electrum = await getElectrumClient();
                await electrum.waitForConsensusEstablished();
            }
            if ((swapsUsdc || swapsUsdt) && usePolygonNetworkStore().state.consensus !== 'established') {
                await getPolygonClient();
            }

            swapHandler = new SwapHandler(
                activeSwap.value as unknown as GenericSwap<SwapAsset, SwapAsset>,
                await getClient(activeSwap.value!.from.asset as SwapAsset, activeSwap.value),
                await getClient(activeSwap.value!.to.asset as SwapAsset, activeSwap.value),
            );

            window.addEventListener('beforeunload', onUnload);

            // Set up expiry watchers
            // // Check expiry when quote expires
            // const timeout1 = window.setTimeout(
            //     checkExpired,
            //     (activeSwap.value!.expires * 1000) - await Time.now() + 1000,
            // );
            if (!await checkExpired()) {
                expiryCheckInterval = window.setInterval(checkExpired, 60 * 1000); // Every minute
            }

            switch (activeSwap.value!.state) {
                case SwapState.EXPIRED: {
                    // Expired swaps are handled by special UI and user action in SwapAnimation
                    break;
                }
                // Handle regular swap process
                // Note that each step falls through to the next when finished.
                /* eslint-disable no-fallthrough */
                case SwapState.SIGN_SWAP: {
                    let unsubscribe: () => void;
                    await new Promise((resolve, reject) => {
                        unsubscribe = useSwapsStore().subscribe((mutation, state) => {
                            if (!state.activeSwap) {
                                reject(new Error('Swap deleted'));
                                return;
                            }

                            if (state.activeSwap.state === SwapState.AWAIT_INCOMING) resolve(true);
                        });
                    }).finally(() => unsubscribe());
                    // The swap may have updated
                    swapHandler.setSwap(activeSwap.value as unknown as GenericSwap<SwapAsset, SwapAsset>);
                }
                case SwapState.AWAIT_INCOMING: {
                    if (await checkExpired()) break;

                    const remoteFundingTx = await swapHandler.awaitIncoming(async (tx) => {
                        if ('getBlock' in tx) {
                            // Unreachable, as Erc20AssetHandler does not fire onUpdate
                        } else {
                            updateSwap({
                                remoteFundingTx: tx,
                            });
                        }
                    });

                    if ('getBlock' in remoteFundingTx) {
                        const receipt = await remoteFundingTx.getTransactionReceipt();
                        const tokenAddress = activeSwap.value!.to.asset === SwapAsset.USDC_MATIC
                            ? config.polygon.usdc.tokenContract
                            : config.polygon.usdt_bridged.tokenContract;
                        const polygonTx = await receiptToTransaction(tokenAddress, receipt);
                        updateSwap({
                            state: SwapState.CREATE_OUTGOING,
                            stateEnteredAt: Date.now(),
                            remoteFundingTx: polygonTx,
                        });
                    } else {
                        updateSwap({
                            state: SwapState.CREATE_OUTGOING,
                            stateEnteredAt: Date.now(),
                            remoteFundingTx,
                        });
                    }
                }
                case SwapState.CREATE_OUTGOING: {
                    if (await checkExpired()) break;

                    if (activeSwap.value!.from.asset === SwapAsset.EUR) {
                        // Clear stateEnteredAt timestamp as it will be set when the user clicks "I Paid"
                        updateSwap({
                            stateEnteredAt: undefined,
                        });

                        // Open Swap modal to show payment instructions to user if not already open
                        if (router.currentRoute.name !== 'buy-crypto') router.push('buy-crypto');

                        // Wait for OASIS HTLC to be funded out-of-band
                        const fundingTx = await swapHandler.awaitOutgoing((htlc) => {
                            updateSwap({
                                fundingTx: htlc as Transaction<SwapAsset.EUR>,
                            });

                            if ((htlc as OasisHtlc).status === HtlcStatus.EXPIRED) {
                                checkExpired();
                                return;
                            }

                            if ((htlc as OasisHtlc<HtlcStatus.PENDING>).clearing.status === ClearingStatus.PARTIAL) {
                                // TODO: Handle partial funding
                            }

                            if ((htlc as OasisHtlc<HtlcStatus.PENDING>).clearing.status === ClearingStatus.DENIED) {
                                const clearingInfo = (htlc as OasisHtlc<HtlcStatus.PENDING>)
                                    .clearing as ClearingInfo<ClearingStatus.DENIED>;
                                oasisLimitExceeded.value = clearingInfo.detail.reason === DeniedReason.LIMIT_EXCEEDED;
                            } else {
                                oasisLimitExceeded.value = false;
                            }
                        }) as Transaction<SwapAsset.EUR>;

                        oasisLimitExceeded.value = false;

                        // As EUR payments are not otherwise detected by the Wallet, we use this
                        // place to persist the relevant information in our store.
                        addFundingData(fundingTx.hash.value, {
                            asset: SwapAsset.EUR,
                            bankLabel: bank.value!.name,
                            // bankLogo?: string,
                            amount: fundingTx.amount + fundingTx.fee,
                            htlc: {
                                id: fundingTx.id,
                                timeoutTimestamp: fundingTx.expires,
                            },
                        });

                        updateSwap({
                            state: SwapState.AWAIT_SECRET,
                            stateEnteredAt: Date.now(),
                            fundingTx,
                        });
                    } else if (activeSwap.value!.from.asset === SwapAsset.USDC_MATIC) {
                        try {
                            // Start background listener
                            polygonListener = polygonListener || swapHandler.awaitOutgoing((/* event */) => {
                                // const openEvent = event as PolygonEvent<PolygonEventType.OPEN>;
                                // ...
                            }).then((tx) => {
                                isPolygonListenerResolved = true;
                                currentError.value = null;
                                return tx as PolygonEvent<PolygonEventType.OPEN>;
                            });

                            const { request, signature, relayUrl } = JSON.parse(activeSwap.value.fundingSerializedTx!);
                            const { relayData, ...relayRequest } = request;

                            let fundingTx: UsdcTransaction;
                            try {
                                fundingTx = await sendPolygonTransaction(
                                    config.polygon.usdc.tokenContract,
                                    { request: relayRequest as ForwardRequest, relayData },
                                    signature,
                                    relayUrl,
                                );
                                currentError.value = null;
                            } catch (error) {
                                if (isPolygonListenerResolved) {
                                    const event = await polygonListener;
                                    fundingTx = await receiptToTransaction(
                                        config.polygon.usdc.tokenContract,
                                        await event.getTransactionReceipt(),
                                    );
                                } else {
                                    throw error;
                                }
                            }

                            // This is an outgoing transfer, so it won't be detected automatically.
                            // We need to add it to the store ourselves.
                            useUsdcTransactionsStore().addTransactions([fundingTx]);

                            await polygonListener;

                            updateSwap({
                                state: SwapState.AWAIT_SECRET,
                                stateEnteredAt: Date.now(),
                                fundingTx,
                            });
                        } catch (error: any) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }
                    } else if (activeSwap.value!.from.asset === SwapAsset.USDT_MATIC) {
                        try {
                            // Start background listener
                            polygonListener = polygonListener || swapHandler.awaitOutgoing((/* event */) => {
                                // const openEvent = event as PolygonEvent<PolygonEventType.OPEN>;
                                // ...
                            }).then((tx) => {
                                isPolygonListenerResolved = true;
                                currentError.value = null;
                                return tx as PolygonEvent<PolygonEventType.OPEN>;
                            });

                            const { request, signature, relayUrl } = JSON.parse(activeSwap.value.fundingSerializedTx!);
                            const { relayData, ...relayRequest } = request;

                            let fundingTx: UsdtTransaction;
                            try {
                                fundingTx = await sendPolygonTransaction(
                                    config.polygon.usdt_bridged.tokenContract,
                                    { request: relayRequest as ForwardRequest, relayData },
                                    signature,
                                    relayUrl,
                                );
                                currentError.value = null;
                            } catch (error) {
                                if (isPolygonListenerResolved) {
                                    const event = await polygonListener;
                                    fundingTx = await receiptToTransaction(
                                        config.polygon.usdt_bridged.tokenContract,
                                        await event.getTransactionReceipt(),
                                    );
                                } else {
                                    throw error;
                                }
                            }

                            // This is an outgoing transfer, so it won't be detected automatically.
                            // We need to add it to the store ourselves.
                            useUsdtTransactionsStore().addTransactions([fundingTx]);

                            await polygonListener;

                            updateSwap({
                                state: SwapState.AWAIT_SECRET,
                                stateEnteredAt: Date.now(),
                                fundingTx,
                            });
                        } catch (error: any) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }
                    } else {
                        // Send HTLC funding transaction
                        try {
                            const fundingTx = await swapHandler.createOutgoing(
                                activeSwap.value!.fundingSerializedTx!,
                                (tx) => {
                                    updateSwap({
                                        fundingTx: tx as Transaction<SwapAsset.NIM | SwapAsset.BTC>,
                                    });
                                    currentError.value = null;
                                },
                                activeSwap.value!.from.asset === SwapAsset.NIM
                                    ? activeSwap.value!.nimiqProxySerializedTx
                                    : undefined,
                            );

                            if (activeSwap.value!.from.asset === SwapAsset.BTC) {
                                subscribeToAddresses([(fundingTx as BtcTransactionDetails).inputs[0].address!]);

                                // Fastspot now requires 1 confirmation for BTC transactions
                                await swapHandler.awaitOutgoing(() => {
                                    currentError.value = null;
                                }, 1);
                            }

                            updateSwap({
                                state: SwapState.AWAIT_SECRET,
                                stateEnteredAt: Date.now(),
                                fundingTx: fundingTx as Transaction<SwapAsset.NIM | SwapAsset.BTC>,
                            });
                        } catch (error: any) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }
                    }
                    currentError.value = null;
                }
                case SwapState.AWAIT_SECRET: {
                    let interval: number;
                    const secret = await Promise.race<string>([
                        swapHandler.awaitSecret(),
                        new Promise<string>((resolve, reject) => {
                            interval = window.setInterval(async () => {
                                if (!activeSwap.value || activeSwap.value.state === SwapState.EXPIRED) {
                                    window.clearInterval(interval);
                                    reject(new Error(SwapError.EXPIRED));
                                    return;
                                }

                                try {
                                    const swap = await getSwap(activeSwap.value.id) as Swap;
                                    if (swap.secret) {
                                        // TODO: Validate that this secret corresponds to the swap hash
                                        resolve(swap.secret);
                                    }
                                } catch (error) {
                                    reportToSentry(error);
                                }
                            }, 5 * 1000); // Every 5 seconds
                        }),
                    ]);
                    window.clearInterval(interval!);
                    updateSwap({
                        state: SwapState.SETTLE_INCOMING,
                        stateEnteredAt: Date.now(),
                        secret,
                    });
                }
                case SwapState.SETTLE_INCOMING: {
                    if (activeSwap.value.to.asset === SwapAsset.USDC_MATIC) {
                        try {
                            // Start background listener
                            polygonListener = polygonListener || swapHandler.awaitIncomingConfirmation().then((tx) => {
                                isPolygonListenerResolved = true;
                                currentError.value = null;
                                return tx as PolygonEvent<PolygonEventType.REDEEM>;
                            });

                            const {
                                request,
                                signature,
                                relayUrl,
                            } = JSON.parse(activeSwap.value.settlementSerializedTx!);
                            const { relayData, ...relayRequest } = request;

                            let settlementTx: UsdcTransaction;
                            try {
                                settlementTx = await sendPolygonTransaction(
                                    config.polygon.usdc.tokenContract,
                                    { request: relayRequest as ForwardRequest, relayData },
                                    signature,
                                    relayUrl,
                                    `0x${activeSwap.value.secret}`, // <- Pass the secret as approvalData
                                );
                                currentError.value = null;
                            } catch (error) {
                                if (isPolygonListenerResolved) {
                                    const event = await polygonListener;
                                    settlementTx = await receiptToTransaction(
                                        config.polygon.usdc.tokenContract,
                                        await event.getTransactionReceipt(),
                                    );
                                } else {
                                    throw error;
                                }
                            }

                            await polygonListener;

                            // This is an incoming transfer, so it should be detected automatically.
                            // But in my testing this did not work reliably, so we add it to the store ourselves.
                            useUsdcTransactionsStore().addTransactions([settlementTx]);

                            updateSwap({
                                state: SwapState.COMPLETE,
                                stateEnteredAt: Date.now(),
                                settlementTx,
                                errorAction: undefined,
                            });
                        } catch (error: any) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            updateSwap({
                                errorAction: SwapErrorAction.USDC_RESIGN_REDEEM,
                            });
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }
                    } else if (activeSwap.value.to.asset === SwapAsset.USDT_MATIC) {
                        try {
                            // Start background listener
                            polygonListener = polygonListener || swapHandler.awaitIncomingConfirmation().then((tx) => {
                                isPolygonListenerResolved = true;
                                currentError.value = null;
                                return tx as PolygonEvent<PolygonEventType.REDEEM>;
                            });

                            const {
                                request,
                                signature,
                                relayUrl,
                            } = JSON.parse(activeSwap.value.settlementSerializedTx!);
                            const { relayData, ...relayRequest } = request;

                            let settlementTx: UsdtTransaction;
                            try {
                                settlementTx = await sendPolygonTransaction(
                                    config.polygon.usdt_bridged.tokenContract,
                                    { request: relayRequest as ForwardRequest, relayData },
                                    signature,
                                    relayUrl,
                                    `0x${activeSwap.value.secret}`, // <- Pass the secret as approvalData
                                );
                                currentError.value = null;
                            } catch (error) {
                                if (isPolygonListenerResolved) {
                                    const event = await polygonListener;
                                    settlementTx = await receiptToTransaction(
                                        config.polygon.usdt_bridged.tokenContract,
                                        await event.getTransactionReceipt(),
                                    );
                                } else {
                                    throw error;
                                }
                            }

                            await polygonListener;

                            // This is an incoming transfer, so it should be detected automatically.
                            // But in my testing this did not work reliably, so we add it to the store ourselves.
                            useUsdtTransactionsStore().addTransactions([settlementTx]);

                            updateSwap({
                                state: SwapState.COMPLETE,
                                stateEnteredAt: Date.now(),
                                settlementTx,
                                errorAction: undefined,
                            });
                        } catch (error: any) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            updateSwap({
                                errorAction: SwapErrorAction.USDT_RESIGN_REDEEM,
                            });
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }
                    } else {
                        try {
                            const settlementTx = await swapHandler.settleIncoming(
                                activeSwap.value!.settlementSerializedTx!,
                                activeSwap.value!.secret!,
                                activeSwap.value!.settlementAuthorizationToken,
                            );

                            if (activeSwap.value!.to.asset === SwapAsset.BTC) {
                                subscribeToAddresses([(settlementTx as BtcTransactionDetails).outputs[0].address!]);
                            }

                            if (activeSwap.value!.to.asset === SwapAsset.EUR) {
                                let htlc = settlementTx as OasisHtlc<HtlcStatus.SETTLED>;

                                // As EUR payments are not otherwise detected by the Wallet, we use this
                                // place to persist the relevant information in our store.
                                const swapData: SwapEurData = {
                                    asset: SwapAsset.EUR,
                                    bankLabel: bank.value!.name,
                                    // bankLogo?: string,
                                    iban: bankAccount.value!.iban,
                                    amount: htlc.amount,
                                    htlc: {
                                        id: htlc.id,
                                        timeoutTimestamp: htlc.expires,
                                        settlement: {
                                            status: htlc.settlement.status,
                                        },
                                    },
                                };

                                if (htlc.settlement.status === SettlementStatus.PENDING) {
                                    // Add swap data to store so the tx history already shows the tx as a swap
                                    // while we wait for payout acceptance.
                                    addSettlementData(htlc.hash.value, swapData);

                                    htlc = await swapHandler.awaitIncomingConfirmation((tx) => {
                                        // eslint-disable-next-line @typescript-eslint/no-shadow
                                        const htlc = tx as OasisHtlc<HtlcStatus.SETTLED>;

                                        updateSwap({
                                            settlementTx: htlc,
                                        });

                                        if (htlc.settlement.status === SettlementStatus.DENIED) {
                                            const settlement = htlc.settlement as SettlementInfo<
                                                SettlementStatus.DENIED
                                            >;
                                            const { reason } = settlement.detail;
                                            oasisLimitExceeded.value = reason === DeniedReason.LIMIT_EXCEEDED;

                                            swapData.htlc!.settlement = {
                                                status: settlement.status,
                                                reason: settlement.detail.reason,
                                                lastUpdated: Date.now(),
                                            };
                                            addSettlementData(htlc.hash.value, swapData);
                                        } else {
                                            oasisLimitExceeded.value = false;
                                        }

                                        if (htlc.settlement.status === SettlementStatus.FAILED) {
                                            const settlement = htlc.settlement as SettlementInfo<
                                                SettlementStatus.FAILED
                                            >;
                                            oasisPayoutFailed.value = true;

                                            swapData.htlc!.settlement = {
                                                status: settlement.status,
                                                reason: settlement.detail.reason,
                                                lastUpdated: Date.now(),
                                            };
                                            addSettlementData(htlc.hash.value, swapData);
                                        } else {
                                            oasisPayoutFailed.value = false;
                                        }

                                        currentError.value = null;
                                    }) as OasisHtlc<HtlcStatus.SETTLED>;

                                    oasisLimitExceeded.value = false;
                                    oasisPayoutFailed.value = false;
                                }

                                // As EUR payments are not otherwise detected by the Wallet, we use this
                                // place to persist the relevant information in our store.
                                swapData.htlc!.settlement = {
                                    status: htlc.settlement.status,
                                    ...(htlc.settlement.status === SettlementStatus.ACCEPTED
                                        ? {
                                            ...((htlc.settlement as SettlementInfo<
                                                SettlementStatus.ACCEPTED
                                            >).detail?.eta
                                                ? { eta: new Date(
                                                    (htlc.settlement as SettlementInfo<SettlementStatus.ACCEPTED>)
                                                        .detail!.eta!).getTime() }
                                                : {}
                                            ),
                                            lastUpdated: Date.now(),
                                        }
                                        : {}
                                    ),
                                    ...(htlc.settlement.status === SettlementStatus.DENIED
                                        || htlc.settlement.status === SettlementStatus.FAILED
                                        ? {
                                            reason: (htlc.settlement as SettlementInfo<
                                                SettlementStatus.DENIED | SettlementStatus.FAILED
                                            >).detail.reason,
                                            lastUpdated: Date.now(),
                                        }
                                        : {}
                                    ),
                                };
                                addSettlementData(htlc.hash.value, swapData);
                            }

                            updateSwap({
                                state: SwapState.COMPLETE,
                                stateEnteredAt: Date.now(),
                                settlementTx:
                                    settlementTx as Transaction<SwapAsset.NIM | SwapAsset.BTC | SwapAsset.EUR>,
                            });
                        } catch (error: any) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }
                    }
                    currentError.value = null;
                }
                case SwapState.COMPLETE: {
                    if (Object.keys(swap$.swaps).length === 1) {
                        setPromoBoxVisible(true);
                    }
                    setTimeout(() => {
                        // Hide notification after a timeout, if not in a swap modal
                        if (['swap', 'buy-crypto', 'sell-crypto'].includes(router.currentRoute.name!)) return;
                        setActiveSwap(null);
                    }, 4 * 1000); // 4 seconds
                }
                /* eslint-enable no-fallthrough */
                default:
                    break;
            }

            cleanUp();
        }

        function openSwap() {
            if (!activeSwap.value) return;

            const cryptoCurrencies = [
                SwapAsset.NIM,
                SwapAsset.BTC,
                SwapAsset.USDC_MATIC,
                SwapAsset.USDT_MATIC,
            ];

            const fiatCurrencies = [
                SwapAsset.EUR,
            ];

            // Convert from Fastspot SwapAsset to LibSwap SwapAsset
            const fromAsset = activeSwap.value.from.asset as SwapAsset;
            const toAsset = activeSwap.value.to.asset as SwapAsset;

            if (cryptoCurrencies.includes(fromAsset) && cryptoCurrencies.includes(toAsset)) {
                router.push({ name: RouteName.Swap });
            } else if (fiatCurrencies.includes(fromAsset)) {
                router.push({ name: RouteName.BuyCrypto });
            } else if (fiatCurrencies.includes(toAsset)) {
                router.push({ name: RouteName.SellCrypto });
            } else {
                throw new Error('Unhandled swap type, cannot open correct swap modal');
            }
        }

        return {
            activeSwap,
            swapIsComplete,
            swapIsExpired,
            swapIsErrored,
            oasisLimitExceeded,
            oasisPayoutFailed,
            openSwap,
        };
    },
    components: {
        LoadingSpinner,
        CheckmarkIcon,
        AlertTriangleIcon,
        MaximizeIcon,
        StopwatchIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

.swap-notification {
    width: 34rem;
    height: 8rem;
    border-radius: 0.75rem;
    align-items: center;
    color: white;
    background-color: var(--nimiq-blue);
    background-image: var(--nimiq-blue-bg);

    position: fixed;
    right: 3rem;
    bottom: 3rem;

    &.complete {
        background-color: var(--nimiq-green);
        background-image: var(--nimiq-green-bg);
    }

    &.errored {
        background-color: var(--nimiq-orange);
        background-image: var(--nimiq-orange-bg);
    }

    &.expired {
        background-color: var(--nimiq-gold);
        background-image: var(--nimiq-gold-bg);
    }
}

.icon {
    width: 8rem;
    flex-shrink: 0;

    svg {
        display: block;
        margin: auto;

        &.nq-icon {
            width: 4rem;
            height: 4rem;
        }
    }

    .complete & .nq-icon {
        padding: 0.5rem;
    }
}

.loading-spinner {
    width: 4.5rem;
}

.status {
    font-size: var(--body-size);
    font-weight: 600;
    margin-bottom: 0.125rem;
}

.closing-notice {
    font-size: var(--small-label-size);
    font-weight: bold;
    opacity: 0.7;

    &.nq-orange {
        opacity: 1;
    }
}

.swap-notification > svg {
    color: white;
    position: absolute;
    right: 1.25rem;
    top: 1.25rem;
}

.minimize-enter-active, .minimize-leave-active,
.slide-enter-active, .slide-leave-active {
    transition:
        transform 0.4s cubic-bezier(0.5, 0, 0.15, 1),
        opacity 0.3s cubic-bezier(0.5, 0, 0.15, 1);
}

.minimize-enter,
.minimize-leave-to {
    transform: translate(-10rem, -15rem) scale(1.2);
    opacity: 0;
}

.slide-enter,
.slide-leave-to {
    transform: translateX(45rem);
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .swap-notification {
        right: 1.5rem;
        bottom: 10.5rem;
    }
}
</style>

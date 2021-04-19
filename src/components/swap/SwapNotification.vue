<template>
    <transition :name="swapIsComplete ? 'slide' : 'minimize'">
        <button
            v-if="activeSwap && $route.name !== 'swap' && $route.name !== 'buy-crypto' && $route.name !== 'sell-crypto'"
            class="reset swap-notification flex-row" :class="{
                'complete': swapIsComplete,
                'expired': swapIsExpired,
                'errored': swapIsErrored && !swapIsExpired,
            }"
            @click="openSwap"
        >
            <div class="icon">
                <StopwatchIcon v-if="swapIsExpired" />
                <AlertTriangleIcon v-else-if="swapIsErrored"/>
                <CheckmarkIcon v-else-if="swapIsComplete"/>
                <LoadingSpinner v-else/>
            </div>
            <div class="content flex-column">
                <div v-if="swapIsExpired" class="status">
                    {{ $t('Swap has expired') }}
                </div>
                <div v-else-if="swapIsErrored" class="status">
                    {{ $t('There\'s a problem') }}
                </div>
                <div v-else-if="swapIsComplete" class="status">
                    {{ $t('Swap successful!') }}
                </div>
                <div v-else class="status">
                    {{ $t('Performing swap {progress}/5', { progress: (activeSwap ? activeSwap.state : 0) + 1 }) }}
                </div>

                <span v-if="swapIsExpired || swapIsErrored" class="closing-notice">
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
import { computed, defineComponent, onMounted, ref, watch } from '@vue/composition-api';
import { LoadingSpinner, CheckmarkIcon, AlertTriangleIcon, StopwatchIcon } from '@nimiq/vue-components';
import { NetworkClient } from '@nimiq/network-client';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { Contract, getSwap, Swap } from '@nimiq/fastspot-api';
import { captureException } from '@sentry/vue';
import Config from 'config';
import MaximizeIcon from '../icons/MaximizeIcon.vue';
import { useSwapsStore, SwapState, ActiveSwap, SwapEurData } from '../../stores/Swaps';
import { useNetworkStore } from '../../stores/Network';
import { getElectrumClient, subscribeToAddresses } from '../../electrum';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { getNetworkClient } from '../../network';
import { SwapHandler, Swap as GenericSwap, SwapAsset, Client, Transaction } from '../../lib/swap/SwapHandler';
import {
    ClearingStatus,
    getHtlc,
    Htlc,
    HtlcStatus,
    settleHtlc,
    SettlementInfo,
    SettlementStatus,
} from '../../lib/OasisApi';
import Time from '../../lib/Time';
import { useBankStore } from '../../stores/Bank';

enum SwapError {
    EXPIRED = 'EXPIRED',
    DELETED = 'DELETED',
}

export default defineComponent({
    setup(props, context) {
        const {
            activeSwap,
            setActiveSwap,
            addFundingData,
            addSettlementData,
            // setPromoBoxVisible,
        } = useSwapsStore();

        const { banks, bankAccounts } = useBankStore();

        const swapIsComplete = computed(() => !!activeSwap.value && activeSwap.value.state === SwapState.COMPLETE);
        const swapIsExpired = computed(() => !!activeSwap.value && activeSwap.value.state === SwapState.EXPIRED);
        const swapIsErrored = computed(() => !!activeSwap.value && activeSwap.value.error);

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
            const timestamp = await Time.now(true);
            const swap = activeSwap.value!;

            const remainingTimes: number[] = [];

            // When we haven't funded our HTLC yet, we need to abort when the quote expires.
            if (swap.state <= SwapState.AWAIT_INCOMING) {
                if (swap.expires <= timestamp) return true;
                remainingTimes.push(swap.expires - timestamp);
            }

            // Otherwise, the swap expires when the first HTLC expires
            for (const contract of Object.values(swap.contracts)) {
                switch (contract!.asset) {
                    case SwapAsset.NIM: {
                        const height = useNetworkStore().height.value;
                        const { timeoutBlock } = (contract as Contract<SwapAsset.NIM>).htlc;
                        if (timeoutBlock <= height) return true;
                        remainingTimes.push((timeoutBlock - height) * 60);
                        break;
                    }
                    case SwapAsset.BTC:
                    case SwapAsset.EUR: {
                        const { timeout } = (contract as Contract<SwapAsset.BTC | SwapAsset.EUR>);
                        if (timeout <= timestamp) return true;
                        remainingTimes.push(timeout - timestamp);
                        break;
                    }
                    default: throw new Error('Invalid swap asset');
                }
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

            const consensusErrorMsg = (chain: 'Nimiq' | 'Bitcoin') => `
                ${context.root.$t('No connection to {chain} network.', { chain })}
                ${context.root.$t('If this error persists, check your internet connection or '
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
                }

                if ([SwapState.CREATE_OUTGOING, SwapState.AWAIT_SECRET].includes(swap.state)) {
                    if (swap.from.asset === SwapAsset.NIM && useNetworkStore().state.consensus !== 'established') {
                        return consensusErrorMsg('Nimiq');
                    }
                    if (swap.from.asset === SwapAsset.BTC && useBtcNetworkStore().state.consensus !== 'established') {
                        return consensusErrorMsg('Bitcoin');
                    }
                }
            }

            return undefined;
        });

        watch(processingError, (error: string | undefined) => {
            if (!activeSwap.value) return;
            updateSwap({ error });
        });

        async function getClient(asset: SwapAsset): Promise<Client<SwapAsset>> {
            switch (asset) {
                case SwapAsset.NIM: return getNetworkClient();
                case SwapAsset.BTC: return getElectrumClient();
                case SwapAsset.EUR: return { getHtlc, settleHtlc };
                default: throw new Error(`Unsupported asset: ${asset}`);
            }
        }

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
            // const swapsEur = [activeSwap.value!.from.asset, activeSwap.value!.to.asset].includes(SwapAsset.EUR);

            // Await Nimiq and Bitcoin consensus
            if (swapsNim && useNetworkStore().state.consensus !== 'established') {
                const nimiqClient = await getNetworkClient();
                await new Promise<void>((resolve) => nimiqClient.on(NetworkClient.Events.CONSENSUS, (state) => {
                    if (state === 'established') resolve();
                }));
            }
            if (swapsBtc && useBtcNetworkStore().state.consensus !== 'established') {
                const electrum = await getElectrumClient();
                await electrum.waitForConsensusEstablished();
            }

            swapHandler = new SwapHandler(
                activeSwap.value as unknown as GenericSwap<SwapAsset, SwapAsset>,
                await getClient(activeSwap.value!.from.asset as SwapAsset),
                await getClient(activeSwap.value!.to.asset as SwapAsset),
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
                }
                case SwapState.AWAIT_INCOMING: {
                    if (await checkExpired()) break;

                    const remoteFundingTx = await swapHandler.awaitIncoming((tx) => {
                        updateSwap({
                            remoteFundingTx: tx,
                        });
                    });
                    updateSwap({
                        state: SwapState.CREATE_OUTGOING,
                        stateEnteredAt: Date.now(),
                        remoteFundingTx,
                    });
                }
                case SwapState.CREATE_OUTGOING: {
                    if (await checkExpired()) break;

                    if (activeSwap.value!.from.asset === SwapAsset.EUR) {
                        // Clear stateEnteredAt timestamp as it will be set when the user clicks "I Paid"
                        updateSwap({
                            stateEnteredAt: undefined,
                        });

                        // Open Swap modal to show payment instructions to user if not already open
                        if (context.root.$route.name !== 'buy-crypto') context.root.$router.push('buy-crypto');

                        // Wait for OASIS HTLC to be funded out-of-band
                        const fundingTx = await swapHandler.awaitOutgoing((htlc) => {
                            updateSwap({
                                fundingTx: htlc,
                            });

                            if ((htlc as Htlc<HtlcStatus>).status === HtlcStatus.EXPIRED) {
                                checkExpired();
                                return;
                            }

                            if ((htlc as Htlc<HtlcStatus.PENDING>).clearing.status === ClearingStatus.PARTIAL) {
                                // TODO: Handle partial funding
                            }

                            // Limit excess is detected in BuyCryptoModal (`oasisLimitExceeded`)
                            // if ((htlc as Htlc<HtlcStatus.PENDING>).clearing.status === ClearingStatus.DENIED)
                        }) as Transaction<SwapAsset.EUR>;

                        // As EUR payments are not otherwise detected by the Wallet, we use this
                        // place to persist the relevant information in our store.
                        addFundingData(fundingTx.hash.value, {
                            asset: SwapAsset.EUR,
                            bankLabel: banks.value.sepa?.name,
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
                    } else {
                        // Send HTLC funding transaction
                        try {
                            const fundingTx = await swapHandler.createOutgoing(
                                activeSwap.value!.fundingSerializedTx!,
                                (tx) => {
                                    updateSwap({
                                        fundingTx: tx,
                                    });
                                    currentError.value = null;
                                },
                                activeSwap.value!.from.asset === SwapAsset.NIM
                                    ? activeSwap.value!.nimiqProxySerializedTx
                                    : undefined,
                            );

                            if (activeSwap.value!.from.asset === SwapAsset.BTC) {
                                subscribeToAddresses([(fundingTx as BtcTransactionDetails).inputs[0].address!]);
                            }

                            updateSwap({
                                state: SwapState.AWAIT_SECRET,
                                stateEnteredAt: Date.now(),
                                fundingTx,
                            });
                        } catch (error) {
                            if (error.message === SwapError.EXPIRED) return;
                            if (error.message === SwapError.DELETED) return;

                            currentError.value = error.message;
                            setTimeout(processSwap, 2000); // 2 seconds
                            cleanUp();
                            return;
                        }

                        currentError.value = null;
                    }
                }
                case SwapState.AWAIT_SECRET: {
                    let interval: number;
                    const secret = await Promise.race<Promise<string>>([
                        swapHandler.awaitSecret(),
                        new Promise((resolve, reject) => {
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
                                    if (Config.reportToSentry) captureException(error);
                                    else console.error(error); // eslint-disable-line no-console
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
                    try {
                        // TODO: Catch double settlement (e.g. after page-reload)
                        const settlementTx = await swapHandler.settleIncoming(
                            activeSwap.value!.settlementSerializedTx!,
                            activeSwap.value!.secret!,
                        );

                        if (activeSwap.value!.to.asset === SwapAsset.BTC) {
                            subscribeToAddresses([(settlementTx as BtcTransactionDetails).outputs[0].address!]);
                        }

                        if (activeSwap.value!.to.asset === SwapAsset.EUR) {
                            let htlc = settlementTx as Htlc<HtlcStatus.SETTLED>;

                            // As EUR payments are not otherwise detected by the Wallet, we use this
                            // place to persist the relevant information in our store.
                            const swapData: SwapEurData = {
                                asset: SwapAsset.EUR,
                                bankLabel: banks.value.sepa?.name,
                                // bankLogo?: string,
                                iban: bankAccounts.value.sepa?.iban,
                                amount: htlc.amount,
                                htlc: {
                                    id: htlc.id,
                                    timeoutTimestamp: htlc.expires,
                                    settlement: {
                                        status: htlc.settlement.status,
                                    },
                                },
                            };
                            addSettlementData(htlc.hash.value, swapData);

                            // eslint-disable-next-line @typescript-eslint/no-shadow
                            htlc = await swapHandler.awaitIncomingConfirmation((htlc) => {
                                updateSwap({
                                    settlementTx: htlc,
                                });

                                if ((htlc as Htlc<HtlcStatus>).status === HtlcStatus.EXPIRED) {
                                    checkExpired();
                                    return;
                                }

                                // Limit excess is detected in SellCryptoModal (`oasisLimitExceeded`)
                                // if ((htlc as Htlc<HtlcStatus.SETTLED>).settlement.status === SettlementStatus.DENIED)

                                if ((htlc as Htlc<HtlcStatus.SETTLED>).settlement.status === SettlementStatus.FAILED) {
                                    // TODO: Handle failed payout
                                }
                            }) as Htlc<HtlcStatus.SETTLED>;

                            // As EUR payments are not otherwise detected by the Wallet, we use this
                            // place to persist the relevant information in our store.
                            swapData.htlc!.settlement = {
                                status: htlc.settlement.status,
                                ...(htlc.settlement.status === SettlementStatus.ACCEPTED ? {
                                    eta: (htlc.settlement as SettlementInfo<SettlementStatus.ACCEPTED>)
                                        .detail.eta.seconds * 1e3,
                                    lastUpdated: Date.now(),
                                } : {}),
                                // TODO: Also check when SettlementStatus is FAILED with reason "limit-exceeded"
                                // to catch when EUR is automatically paid out when limit is available again.
                            };
                            addSettlementData(htlc.hash.value, swapData);
                        }

                        updateSwap({
                            state: SwapState.COMPLETE,
                            stateEnteredAt: Date.now(),
                            settlementTx,
                        });
                    } catch (error) {
                        if (error.message === SwapError.EXPIRED) return;
                        if (error.message === SwapError.DELETED) return;

                        currentError.value = error.message;
                        setTimeout(processSwap, 2000); // 2 seconds
                        cleanUp();
                        return;
                    }

                    currentError.value = null;
                }
                case SwapState.COMPLETE: {
                    // if (activeSwap.value!.from.asset === SwapAsset.EUR) {
                    //     setPromoBoxVisible(true);
                    // }
                    setTimeout(() => {
                        // Hide notification after a timeout, if not in a swap modal
                        if (['swap', 'buy-crypto', 'sell-crypto'].includes(context.root.$route.name!)) return;
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
            const swapPair = [activeSwap.value.from.asset, activeSwap.value.to.asset].sort();

            if (swapPair[0] === SwapAsset.BTC && swapPair[1] === SwapAsset.NIM) {
                context.root.$router.push('/swap');
            } else if (activeSwap.value.from.asset === SwapAsset.EUR) {
                context.root.$router.push('/buy-crypto');
            } else if (activeSwap.value.to.asset === SwapAsset.EUR) {
                context.root.$router.push('/sell-crypto');
            } else {
                throw new Error('Unhandled swap type, cannot open correct swap modal');
            }
        }

        return {
            activeSwap,
            swapIsComplete,
            swapIsExpired,
            swapIsErrored,
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

@media (max-width: 700px) { // Full mobile breakpoint
    .swap-notification {
        right: 1.5rem;
        bottom: 10.5rem;
    }
}
</style>

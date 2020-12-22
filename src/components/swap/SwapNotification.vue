<template>
    <transition :name="swapIsOngoing ? 'minimize' : 'slide'">
        <button v-if="activeSwap && $route.name !== 'swap' && $route.name !== 'buy-crypto'"
            class="reset swap-notification flex-row" :class="{'complete': !swapIsOngoing, 'errored': swapIsErrored}"
            @click="openSwap"
        >
            <div class="icon">
                <AlertTriangleIcon v-if="swapIsErrored"/>
                <LoadingSpinner v-else-if="swapIsOngoing"/>
                <CheckmarkIcon v-else/>
            </div>
            <div class="content flex-column">
                <div v-if="swapIsErrored" class="status">
                    {{ $t('There\'s a problem') }}
                </div>
                <div v-else-if="swapIsOngoing" class="status">
                    {{ $t('Performing swap {progress}/5', { progress: activeSwap.state + 1 }) }}
                </div>
                <div v-else class="status">
                    {{ $t('Swap successful!') }}
                </div>

                <span v-if="swapIsErrored" class="closing-notice">
                    {{ $t('Click for more information') }}
                </span>
                <span v-else-if="swapIsOngoing" class="closing-notice nq-orange">
                    {{ $t('Don\'t close your wallet!') }}
                </span>
                <span v-else class="closing-notice">
                    {{ $t('It\'s safe to close your wallet now') }}
                </span>
            </div>
            <MaximizeIcon v-if="swapIsOngoing"/>
        </button>
    </transition>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, watch } from '@vue/composition-api';
import { LoadingSpinner, CheckmarkIcon, AlertTriangleIcon } from '@nimiq/vue-components';
import { NetworkClient } from '@nimiq/network-client';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { Contract, init as initFastspotApi, getSwap, Swap } from '@nimiq/fastspot-api';
import Config from 'config';
import MaximizeIcon from '../icons/MaximizeIcon.vue';
import { useSwapsStore, SwapState, ActiveSwap } from '../../stores/Swaps';
import { useNetworkStore } from '../../stores/Network';
import { getElectrumClient, subscribeToAddresses } from '../../electrum';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { getNetworkClient } from '../../network';
import { SwapHandler, Swap as GenericSwap, SwapAsset, Client, Transaction } from '../../lib/swap/SwapHandler';
import { getHtlc, settleHtlc } from '../../lib/OasisApi';

export default defineComponent({
    setup(props, context) {
        const { activeSwap, setActiveSwap, addFundingData, userBank } = useSwapsStore();

        const swapIsOngoing = computed(() => !!activeSwap.value && activeSwap.value.state < SwapState.COMPLETE);
        const swapIsErrored = computed(() => !!activeSwap.value
            && (activeSwap.value.fundingError || activeSwap.value.settlementError),
        );

        function onUnload(event: BeforeUnloadEvent) {
            // Firefox respects the event cancellation to prompt the user
            event.preventDefault();
            // Chrome requires returnValue to be set
            event.returnValue = '';
        }

        onMounted(() => {
            if (activeSwap.value) processSwap();
        });

        watch(activeSwap, (newSwap, oldSwap) => {
            if (!newSwap) return; // Do nothing when swap is deleted

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

        async function getClient(asset: SwapAsset): Promise<Client<SwapAsset>> {
            switch (asset) {
                case SwapAsset.NIM: return getNetworkClient();
                case SwapAsset.BTC: return getElectrumClient();
                case SwapAsset.EUR: return { getHtlc, settleHtlc };
                default: throw new Error(`Unsupported asset: ${asset}`);
            }
        }

        async function processSwap() {
            console.info('Processing swap'); // eslint-disable-line no-console

            // Await Nimiq and Bitcoin consensus
            if (useNetworkStore().state.consensus !== 'established') {
                const nimiqClient = await getNetworkClient();
                await new Promise<void>((resolve) => nimiqClient.on(NetworkClient.Events.CONSENSUS, (state) => {
                    if (state === 'established') resolve();
                }));
            }
            if (useBtcNetworkStore().state.consensus !== 'established') {
                const electrum = await getElectrumClient();
                await electrum.waitForConsensusEstablished();

                // If consensus was only just established, we need to wait for the first block event
                await new Promise<void>((resolve) => {
                    const unsubscribe = useBtcNetworkStore().subscribe((mutation) => {
                        if (!mutation.payload.timestamp) return;
                        unsubscribe();
                        resolve();
                    });
                });
            }

            // Get current timestamp from a trusted source, not the user's device
            const { timestamp } = useBtcNetworkStore().state;

            // Check for swap expiry
            let isExpired = false;
            for (const contract of Object.values(activeSwap.value!.contracts)) {
                switch (contract!.asset) {
                    case SwapAsset.NIM: {
                        const height = useNetworkStore().height.value;
                        isExpired = (contract as Contract<SwapAsset.NIM>).htlc.timeoutBlock <= height;
                        break;
                    }
                    case SwapAsset.BTC:
                    case SwapAsset.EUR: {
                        isExpired = (contract as Contract<SwapAsset.BTC | SwapAsset.EUR>).timeout <= timestamp;
                        break;
                    }
                    default: throw new Error('Invalid swap asset');
                }
            }

            if (isExpired) {
                setActiveSwap(null);
                return;
            }

            const swapHandler = new SwapHandler(
                activeSwap.value! as GenericSwap<SwapAsset, SwapAsset>,
                await getClient(activeSwap.value!.from.asset as SwapAsset),
                await getClient(activeSwap.value!.to.asset as SwapAsset),
            );

            window.addEventListener('beforeunload', onUnload);

            switch (activeSwap.value!.state) {
                case SwapState.EXPIRED: {
                    // Handle expired swap
                    setActiveSwap(null);
                    break;
                }
                // Handle regular swap process
                // Note that each step falls through to the next when finished.
                /* eslint-disable no-fallthrough */
                case SwapState.SIGN_SWAP: {
                    let unsubscribe: Function;
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
                    if (activeSwap.value!.from.asset === SwapAsset.EUR) {
                        // Clear stateEnteredAt timestamp as it will be set when the user clicks "I Paid"
                        updateSwap({
                            stateEnteredAt: undefined,
                        });

                        // Wait for OASIS HTLC to be funded out-of-band
                        const fundingTx = await swapHandler.awaitOutgoing((htlc) => {
                            updateSwap({
                                fundingTx: htlc,
                            });
                        }) as Transaction<SwapAsset.EUR>;

                        // As EUR payments are not otherwise detected by the Wallet, we use this
                        // place to persist the relevant information in our store.
                        addFundingData(fundingTx.hash.value, {
                            asset: SwapAsset.EUR,
                            bankLabel: userBank.value?.name,
                            // bankLogo?: string,
                            amount: fundingTx.amount,
                            htlc: {
                                id: fundingTx.id,
                                timeoutTimestamp: fundingTx.expires,
                            },
                        });

                        updateSwap({
                            state: SwapState.AWAIT_SECRET,
                            stateEnteredAt: Date.now(),
                            fundingTx,
                            fundingError: undefined,
                        });
                    } else {
                        // Send HTLC funding transaction
                        try {
                            const fundingTx = await swapHandler.createOutgoing(
                                activeSwap.value!.fundingSerializedTx!,
                                (tx) => {
                                    updateSwap({
                                        fundingTx: tx,
                                        fundingError: undefined,
                                    });
                                },
                            );

                            if (activeSwap.value!.from.asset === SwapAsset.BTC) {
                                subscribeToAddresses([(fundingTx as BtcTransactionDetails).inputs[0].address!]);
                            }

                            updateSwap({
                                state: SwapState.AWAIT_SECRET,
                                stateEnteredAt: Date.now(),
                                fundingTx,
                                fundingError: undefined,
                            });
                        } catch (error) {
                            updateSwap({
                                fundingError: error.message as string,
                            });
                            setTimeout(processSwap, 2000); // 2 seconds
                            return;
                        }
                    }
                }
                case SwapState.AWAIT_SECRET: {
                    let interval: number;
                    const secret = await Promise.race<Promise<string>>([
                        swapHandler.awaitSecret(),
                        new Promise((resolve) => {
                            initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);
                            interval = window.setInterval(async () => {
                                try {
                                    const swap = await getSwap(activeSwap.value!.id) as Swap;
                                    if (swap.secret) {
                                        // TODO: Validate that this secret corresponds to the swap hash
                                        resolve(swap.secret);
                                    }
                                } catch (error) {
                                    // Ignore
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
                        const settlementTx = await swapHandler.settleIncoming(
                            activeSwap.value!.settlementSerializedTx!,
                            activeSwap.value!.secret!,
                        );

                        if (activeSwap.value!.to.asset === SwapAsset.BTC) {
                            subscribeToAddresses([(settlementTx as BtcTransactionDetails).outputs[0].address!]);
                        }
                        updateSwap({
                            state: SwapState.COMPLETE,
                            stateEnteredAt: Date.now(),
                            settlementTx,
                            settlementError: undefined,
                        });
                    } catch (error) {
                        updateSwap({
                            settlementError: error.message as string,
                        });
                        setTimeout(processSwap, 2000); // 2 seconds
                        return;
                    }
                }
                case SwapState.COMPLETE: {
                    setTimeout(() => {
                        // Hide notification after a timeout, if not in the SwapModal.
                        if (context.root.$route.name === 'swap') return;
                        setActiveSwap(null);
                    }, 4 * 1000); // 4 seconds
                }
                /* eslint-enable no-fallthrough */
                default:
                    break;
            }
            window.removeEventListener('beforeunload', onUnload);
        }

        function openSwap() {
            if (!activeSwap.value) return;
            const swapPair = [activeSwap.value.from.asset, activeSwap.value.to.asset].sort();

            if (swapPair[0] === SwapAsset.BTC && swapPair[1] === SwapAsset.NIM) {
                context.root.$router.push('/swap');
            } else if (activeSwap.value.from.asset === SwapAsset.EUR) {
                context.root.$router.push('/buy-crypto');
            } else {
                throw new Error('Unhandled swap type, cannot open correct swap modal');
            }
        }

        return {
            activeSwap,
            swapIsOngoing,
            swapIsErrored,
            openSwap,
        };
    },
    components: {
        LoadingSpinner,
        CheckmarkIcon,
        AlertTriangleIcon,
        MaximizeIcon,
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
}

.icon {
    width: 8rem;
    flex-shrink: 0;

    svg {
        display: block;
        margin: auto;

        &.nq-icon {
            width: 3rem;
            height: 3rem;
        }
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

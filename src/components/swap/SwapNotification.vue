<template>
    <transition :name="swapIsOngoing ? 'minimize' : 'slide'">
        <button v-if="activeSwap && $route.name !== 'swap'"
            class="reset swap-notification flex-row" :class="{'complete': !swapIsOngoing, 'errored': swapIsErrored}"
            @click="$router.push('/swap')"
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
import { SwapAsset, Contract } from '@nimiq/fastspot-api';
import MaximizeIcon from '../icons/MaximizeIcon.vue';
import { useSwapsStore, SwapState, ActiveSwap } from '../../stores/Swaps';
import { useNetworkStore } from '../../stores/Network';
import { getElectrumClient, subscribeToAddresses } from '../../electrum';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { getNetworkClient } from '../../network';
import { SwapHandler } from '../../lib/swap/SwapHandler';

export default defineComponent({
    setup(props, context) {
        const { activeSwap, setActiveSwap } = useSwapsStore();

        const swapIsOngoing = computed(() => !!activeSwap.value && activeSwap.value.state < SwapState.COMPLETE);
        const swapIsErrored = computed(() => !!activeSwap.value
            && (
                (activeSwap.value as ActiveSwap<SwapState.CREATE_OUTGOING>).fundingError
                || (activeSwap.value as ActiveSwap<SwapState.SETTLE_INCOMING>).settlementError
            ),
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

        function updateSwap(update: Partial<ActiveSwap<SwapState>>) {
            setActiveSwap({
                ...activeSwap.value!,
                ...update,
            });
        }

        async function getClient(asset: SwapAsset) {
            switch (asset) {
                case SwapAsset.NIM: return getNetworkClient();
                case SwapAsset.BTC: return getElectrumClient();
                default: throw new Error(`Unsupported asset: ${asset}`);
            }
        }

        async function processSwap() {
            console.info('Processing swap'); // eslint-disable-line no-console

            // Await Nimiq and Bitcoin consensus
            if (useNetworkStore().state.consensus !== 'established') {
                const nimiqClient = await getNetworkClient();
                await new Promise((resolve) => nimiqClient.on(NetworkClient.Events.CONSENSUS, (state) => {
                    if (state === 'established') resolve();
                }));
            }
            if (useBtcNetworkStore().state.consensus !== 'established') {
                const electrum = await getElectrumClient();
                await electrum.waitForConsensusEstablished();

                // If consensus was only just established, we need to wait for the first block event
                await new Promise((resolve) => {
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
                    case SwapAsset.BTC: {
                        isExpired = (contract as Contract<SwapAsset.BTC>).timeout <= timestamp;
                        break;
                    }
                    // case SwapAsset.EUR: {
                    //     isExpired = (contract as Contract<SwapAsset.EUR>).timeout <= timestamp;
                    //     break;
                    // }
                    default: throw new Error('Invalid swap asset');
                }
            }

            if (isExpired) {
                setActiveSwap(null);
                return;
            }

            const swapHandler = new SwapHandler(
                activeSwap.value!,
                await getClient(activeSwap.value!.from.asset),
                await getClient(activeSwap.value!.to.asset),
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
                case SwapState.AWAIT_INCOMING: {
                    const remoteFundingTx = await swapHandler.awaitIncoming(
                        (tx) => {
                            updateSwap({
                                remoteFundingTx: tx,
                            });
                        },
                    );
                    updateSwap({
                        state: SwapState.CREATE_OUTGOING,
                        remoteFundingTx,
                    });
                }
                case SwapState.CREATE_OUTGOING: {
                    try {
                        const fundingTx = await swapHandler.createOutgoing(
                            (activeSwap.value as ActiveSwap<SwapState.CREATE_OUTGOING>).fundingSerializedTx,
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
                case SwapState.AWAIT_SECRET: {
                    const secret = await swapHandler.awaitSecret();
                    updateSwap({
                        state: SwapState.SETTLE_INCOMING,
                        secret,
                    });
                }
                case SwapState.SETTLE_INCOMING: {
                    try {
                        const settlementTx = await swapHandler.settleIncoming(
                            (activeSwap.value as ActiveSwap<SwapState.SETTLE_INCOMING>).settlementSerializedTx,
                            (activeSwap.value as ActiveSwap<SwapState.SETTLE_INCOMING>).secret,
                        );

                        if (activeSwap.value!.to.asset === SwapAsset.BTC) {
                            subscribeToAddresses([(settlementTx as BtcTransactionDetails).outputs[0].address!]);
                        }
                        updateSwap({
                            state: SwapState.COMPLETE,
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

        return {
            activeSwap,
            swapIsOngoing,
            swapIsErrored,
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

<template>
    <transition :name="swapIsOngoing ? 'minimize' : 'slide'">
        <button v-if="activeSwap && $route.name !== 'swap'"
            class="reset swap-notification flex-row" :class="{'complete': !swapIsOngoing}"
            @click="$router.push('/swap')"
        >
            <div class="icon">
                <LoadingSpinner v-if="swapIsOngoing"/>
                <CheckmarkIcon v-else/>
            </div>
            <div class="content flex-column">
                <div v-if="swapIsOngoing" class="status">
                    {{ $t('Performing swap {progress}/5', { progress: activeSwap.state + 1 }) }}
                </div>
                <div v-else class="status">
                    {{ $t('Swap successful!') }}
                </div>

                <span v-if="swapIsOngoing" class="closing-notice">
                    {{ $t('Don\'t close your Wallet') }}
                </span>
                <span v-else class="closing-notice">
                    {{ $t('It\'s safe to close your Wallet now') }}
                </span>
            </div>
            <MaximizeIcon v-if="swapIsOngoing"/>
        </button>
    </transition>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, Ref, watch } from '@vue/composition-api';
import { LoadingSpinner, CheckmarkIcon } from '@nimiq/vue-components';
import MaximizeIcon from '../icons/MaximizeIcon.vue';
import { useSwapsStore, SwapState, ActiveSwap } from '../../stores/Swaps';
import { awaitIncoming, awaitSecret, createOutgoing, settleIncoming } from '../../lib/SwapProcess';
import { SwapAsset, Contract } from '../../lib/FastspotApi';
import { useNetworkStore } from '../../stores/Network';
import { getElectrumClient } from '../../electrum';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';

export default defineComponent({
    setup(props, context) {
        const { activeSwap, setActiveSwap } = useSwapsStore();

        const swapIsOngoing = computed(() => !!activeSwap.value && activeSwap.value.state < SwapState.COMPLETE);

        onMounted(() => {
            if (swapIsOngoing.value) processSwap();
        });

        watch(activeSwap, (newSwap, oldSwap) => {
            if (newSwap && !oldSwap) {
                // A new swap started, start processing it
                processSwap();
            }
        }, { lazy: true });

        async function processSwap() {
            console.info('Processing swap'); // eslint-disable-line no-console

            const electrum = await getElectrumClient();
            await electrum.waitForConsensusEstablished();

            // Get current timestamp from a trusted source, not the user's device
            const timestamp = useBtcNetworkStore().timestamp.value;

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
                setActiveSwap({
                    ...activeSwap.value!,
                    state: SwapState.EXPIRED,
                });
            }

            switch (activeSwap.value!.state) {
                case SwapState.EXPIRED:
                    // Handle expired swap
                    setActiveSwap(null);
                    break;

                // Handle regular swap process
                // Note that each step falls through to the next when finished.
                /* eslint-disable no-fallthrough */
                case SwapState.AWAIT_INCOMING:
                    await awaitIncoming(activeSwap as Ref<ActiveSwap<SwapState.AWAIT_INCOMING>>);
                case SwapState.CREATE_OUTGOING:
                    await createOutgoing(activeSwap as Ref<ActiveSwap<SwapState.CREATE_OUTGOING>>);
                case SwapState.AWAIT_SECRET:
                    await awaitSecret(activeSwap as Ref<ActiveSwap<SwapState.AWAIT_SECRET>>);
                case SwapState.SETTLE_INCOMING:
                    await settleIncoming(activeSwap as Ref<ActiveSwap<SwapState.SETTLE_INCOMING>>);
                case SwapState.COMPLETE:
                    setTimeout(() => {
                        // Hide notification after a timeout, if not in the SwapModal.
                        if (context.root.$route.name === 'swap') return;
                        setActiveSwap(null);
                    }, 5 * 1000); // 5 seconds
                /* eslint-enable no-fallthrough */
                default:
                    break;
            }
        }

        return {
            activeSwap,
            swapIsOngoing,
        };
    },
    components: {
        LoadingSpinner,
        CheckmarkIcon,
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
}

.icon {
    width: 8rem;
    flex-shrink: 0;

    svg {
        display: block;
        margin: auto;
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

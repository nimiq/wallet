<template>
    <PageFooter class="send-modal-footer">
        <button
            class="nq-button" :class="buttonColor"
            :disabled="disabled || !networkState.isReady || error
                || ($config.disableNetworkInteraction && assets.includes(CryptoCurrency.NIM))"
            @click="$emit('click')"
            @mousedown.prevent
        ><slot name="cta">{{ $t('Confirm') }}</slot></button>

        <MessageTransition>
            <div v-if="networkState.message" class="footer-notice nq-light-blue flex-row">
                <CircleSpinner/>
                {{ networkState.message }}
            </div>
            <div v-else-if="error" class="footer-notice nq-orange flex-row">
                <AlertTriangleIcon/>
                {{ error }}
            </div>
            <div v-else class="footer-notice nq-gray flex-row"><slot></slot></div>
        </MessageTransition>
    </PageFooter>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { AlertTriangleIcon, CircleSpinner, PageFooter } from '@nimiq/vue-components';
import { useI18n } from '@/lib/useI18n';
import { useBtcNetworkStore } from '../stores/BtcNetwork';
import { useNetworkStore } from '../stores/Network';
import { usePolygonNetworkStore } from '../stores/PolygonNetwork';
import { CryptoCurrency } from '../lib/Constants';
import MessageTransition from './MessageTransition.vue';

export default defineComponent({
    props: {
        assets: {
            type: Array as () => Array<CryptoCurrency>,
            required: true,
        },
        buttonColor: {
            type: String,
            default: 'light-blue',
        },
        error: String,
        disabled: Boolean,
        requireCompleteBtcHistory: {
            type: Boolean,
            default: true,
        },
    },
    setup(props) {
        const { $t } = useI18n();

        const networkState = computed(() => {
            let message: string | null = null;

            if (props.assets.includes(CryptoCurrency.BTC)) {
                const {
                    consensus: btcConsensus,
                    height: btcHeight,
                    isFetchingTxHistory: isFetchingBtcHistory,
                } = useBtcNetworkStore();

                if (btcConsensus.value !== 'established' || !btcHeight.value) {
                    message = $t('Connecting to Bitcoin network') as string;
                } else if (props.requireCompleteBtcHistory && isFetchingBtcHistory.value) {
                    // Current Bitcoin UTXOs and balance are unknown without complete history.
                    message = $t('Syncing with Bitcoin network') as string;
                }
            }

            if (props.assets.includes(CryptoCurrency.NIM)) {
                const { consensus: nimiqConsensus, height: nimiqHeight } = useNetworkStore();

                if (nimiqConsensus.value !== 'established') {
                    message = $t('Connecting to Nimiq network') as string;
                } else if (!nimiqHeight.value) {
                    message = $t('Waiting for Nimiq network information') as string;
                }
            }

            if (props.assets.includes(CryptoCurrency.USDC)) {
                const { consensus: polygonConsensus } = usePolygonNetworkStore();

                if (polygonConsensus.value !== 'established') {
                    message = $t('Connecting to USDC on Polygon') as string;
                }
            }

            return {
                message,
                isReady: !message,
            };
        });

        return {
            CryptoCurrency,
            networkState,
        };
    },
    components: {
        PageFooter,
        AlertTriangleIcon,
        CircleSpinner,
        MessageTransition,
    },
});
</script>

<style lang="scss" scoped>
.send-modal-footer {
    .nq-button {
        margin: 0 4rem 3rem;
    }

    .message-transition {
        margin: -1.75rem 0 0.75rem;
    }

    .footer-notice {
        font-weight: 600;
        font-size: var(--small-size);
        justify-content: center;
        text-align: center;

        ::v-deep .nq-link {
            color: inherit;
            text-decoration: underline;
        }

        ::v-deep .circle-spinner {
            margin-right: 1rem;
        }
    }

    .nq-orange {
        text-align: left;
        align-items: center;
    }

    .nq-gray {
        opacity: 0.5;
    }

    svg {
        margin-right: 1rem;
        flex-shrink: 0;
    }
}
</style>

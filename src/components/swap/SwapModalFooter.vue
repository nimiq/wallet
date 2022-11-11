<template>
    <PageFooter class="swap-modal-footer">
        <button
            class="nq-button" :class="isKycConnected ? 'purple' : 'light-blue'"
            :disabled="disabled || !networkState.isReady"
            @click="emitClick"
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
import { useBtcNetworkStore } from '@/stores/BtcNetwork';
import { useNetworkStore } from '@/stores/Network';
import { AlertTriangleIcon, CircleSpinner, PageFooter } from '@nimiq/vue-components';
import { computed, defineComponent } from '@vue/composition-api';
import { CryptoCurrency } from '../../lib/Constants';
import { useAccountStore } from '../../stores/Account';
import MessageTransition from '../MessageTransition.vue';

export default defineComponent({
    props: {
        error: String,
        disabled: Boolean,
        requireBothNetworks: Boolean,
        isKycConnected: Boolean,
    },
    setup(props, context) {
        const { activeCurrency } = useAccountStore();

        const networkState = computed(() => {
            let message: string | null = null;

            if (activeCurrency.value === CryptoCurrency.BTC || props.requireBothNetworks) {
                const { consensus: btcConsensus } = useBtcNetworkStore();

                if (btcConsensus.value !== 'established') {
                    message = context.root.$i18n.t('Connecting to Bitcoin network') as string;
                }
            }

            if (activeCurrency.value === CryptoCurrency.NIM || props.requireBothNetworks) {
                const { consensus: nimiqConsensus, height: nimiqHeight } = useNetworkStore();

                if (nimiqConsensus.value !== 'established') {
                    message = context.root.$i18n.t('Connecting to Nimiq network') as string;
                } else if (!nimiqHeight.value) {
                    message = context.root.$i18n.t('Waiting for Nimiq network informations') as string;
                }
            }

            return {
                message,
                isReady: !message,
            };
        });

        function emitClick() {
            context.emit('click');
        }

        return {
            networkState,
            emitClick,
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
.swap-modal-footer {
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

<template>
    <PageFooter class="swap-modal-footer">
        <button
            class="nq-button light-blue"
            :disabled="disabled || !networkState.isReady"
            @click="emitClick"
            @mousedown.prevent
        ><slot name="cta">{{ $t('Confirm') }}</slot></button>

        <div class="footer-notice-wrapper" :style="footerHeight && { '--footer-height': `${footerHeight}px` }">
            <transition name="fadeY"
                @enter="(el) => footerHeight = el.offsetHeight"
                @after-enter="() => footerHeight = undefined"
            >
                <div v-if="networkState.message" class="footer-notice nq-light-blue flex-row"
                    :key="networkState.message">
                    <CircleSpinner/>
                    {{ networkState.message }}
                </div>
                <div v-else-if="error" class="footer-notice nq-orange flex-row" :key="error">
                    <AlertTriangleIcon/>
                    {{ error }}
                </div>
                <div v-else class="footer-notice nq-gray flex-row" key="content"><slot></slot></div>
            </transition>
        </div>
    </PageFooter>
</template>

<script lang="ts">
import { useBtcNetworkStore } from '@/stores/BtcNetwork';
import { useNetworkStore } from '@/stores/Network';
import { AlertTriangleIcon, CircleSpinner, PageFooter } from '@nimiq/vue-components';
import { computed, defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
    props: {
        error: String,
        disabled: Boolean,
    },
    setup(props, context) {
        const footerHeight = ref<number | null>(null);

        const networkState = computed(() => {
            const { consensus: nimiqConsensus, height: nimiqHeight } = useNetworkStore();
            const { consensus: btcConsensus } = useBtcNetworkStore();
            let message: string | null = null;

            if (nimiqConsensus.value !== 'established' && btcConsensus.value !== 'established') {
                message = context.root.$i18n.t('Connecting to Nimiq & Bitcoin networks') as string;
            } else if (nimiqConsensus.value !== 'established') {
                message = context.root.$i18n.t('Connecting to Nimiq network') as string;
            } else if (btcConsensus.value !== 'established') {
                message = context.root.$i18n.t('Connecting to Bitcoin network') as string;
            } else if (!nimiqHeight.value) {
                message = context.root.$i18n.t('Waiting for Nimiq network informations') as string;
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
            footerHeight,
            networkState,
            emitClick,
        };
    },
    components: {
        PageFooter,
        AlertTriangleIcon,
        CircleSpinner,
    },
});
</script>

<style lang="scss" scoped>
.swap-modal-footer {
    .nq-button {
        margin: 0 4rem 3rem;
    }

    .footer-notice-wrapper {
        --footer-height: auto;

        position: relative;
        margin: -1.75rem 0 0.75rem;
        height: var(--footer-height);
        transition: {
            property: height;
            duration: 500ms;
            timing-function: cubic-bezier(0.5, 0, 0.15, 1);
        }
    }

    .footer-notice {
        justify-content: center;
        align-items: center;
        font-weight: 600;
        font-size: var(--small-size);
        text-align: center;

        /deep/ .nq-link {
            color: inherit;
            text-decoration: underline;
        }

        /deep/ .circle-spinner {
            margin-right: 1rem;
        }
    }

    .nq-orange {
        text-align: left;
    }

    .nq-gray {
        opacity: 0.5;
    }

    svg {
        margin-right: 1rem;
        flex-shrink: 0;
    }

    .fadeY-enter-active, .fadeY-leave-active {
        will-change: opacity, transform;
        transition: {
            property: opacity, transform;
            duration: 500ms;
            timing-function: cubic-bezier(0.5, 0, 0.15, 1);
        }
    }

    .fadeY-leave-active {
        position: absolute;
        width: 100%;
    }

    .fadeY-enter-active {
        transition-delay: 50ms;
    }

    .fadeY-leave,
    .fadeY-enter-to {
        transform: translateY(0);
    }

    .fadeY-enter {
        opacity: 0;
        transform: translateY(.5rem);
    }

    .fadeY-leave-to {
        opacity: 0;
        transform: translateY(-.5rem);
    }
}
</style>

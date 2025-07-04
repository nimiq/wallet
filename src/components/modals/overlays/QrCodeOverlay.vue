<template>
    <div class="qr-code-overlay">
        <PageHeader>{{ $t('{currency} Address', { currency: currency.toUpperCase() }) }}</PageHeader>
        <PageBody class="flex-column">
            <div class="flex-column">
                <QrCode
                    :data="`${qrPrefix}${address}`"
                    :size="qrCodeCanvasSize"
                    :fill="'#1F2348' /* nimiq-blue */"
                    class="qr-code"
                    :style="{'--qr-code-canvas-size': `${qrCodeCanvasSize}px`}"
                />
                <InteractiveShortAddress
                    :address="address"
                    :displayedCharacters="displayedAddressCharacters"
                    copyable
                    tooltipPosition="top right"
                    :offsetTooltipPosition="false"
                />
            </div>
            <p class="qr-info-text nq-light-blue">{{ $t('Scan the code to send\n{currency} to this address', {
                currency: currency.toUpperCase(),
            }) }}</p>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { PageBody, PageHeader, QrCode } from '@nimiq/vue-components';
import { useWindowSize } from '../../../composables/useWindowSize';
import InteractiveShortAddress from '../../InteractiveShortAddress.vue';

export default defineComponent({
    props: {
        qrPrefix: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const { height: windowHeight, isMobile } = useWindowSize();
        const qrCodeCanvasSize = computed(() => Math.min(520, Math.floor(windowHeight.value * .95)));
        const displayedAddressCharacters = computed(() => {
            if (/nim/i.test(props.currency)) {
                // Display an even number of 4 char blocks, plus spaces between.
                const blockCount = Math.round(qrCodeCanvasSize.value / 170) * 2; // *2 because first factor gives pairs
                return Math.max(8, blockCount * 4 + (/* spaces, but none for innermost blocks */ blockCount - 2));
            }
            // BTC
            const maxChars = isMobile.value ? 26 : 24;
            return Math.max(8, Math.min(maxChars, Math.round(qrCodeCanvasSize.value / 20)));
        });
        return {
            qrCodeCanvasSize,
            displayedAddressCharacters,
        };
    },
    components: {
        PageBody,
        PageHeader,
        QrCode,
        InteractiveShortAddress,
    },
});
</script>

<style lang="scss" scoped>
.qr-code-overlay {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.page-body {
    min-height: 56rem;
    justify-content: space-evenly;
    align-items: center;

    .qr-code {
        // The QrCode is rendered at 2x size and then scaled to half its size, to be sharp on retina displays. But now
        // we need to make it behave as half its size as well, that's why we use negative margins on all sides.
        height: var(--qr-code-canvas-size); // Must set fixed height for iOS 16 to display correctly
        margin: calc(var(--qr-code-canvas-size) / -4);
        transform: scale(0.5);
        align-self: center;
    }

    .qr-info-text {
        font-size: var(--h2-size);
        font-weight: 600;
        white-space: pre;
        text-align: center;
    }

    @media (max-height: 520px) { // small mobile
        min-height: unset;
        justify-content: space-between;
    }
}

.interactive-short-address {
    align-self: center;
    margin-top: 2rem;

    ::v-deep .tooltip-box {
        left: 50% !important;
        transform: translate(-50%, -2rem);
    }
}
</style>

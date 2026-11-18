<template>
    <Modal class="receive-modal">
        <transition name="fade">
            <PolygonWarningPage v-if="page === Pages.WARNING"
                type="receiving"
                :canGoBack="!!$route.params.canUserGoBack"
                @back="back"
                @continue="page = Pages.RECEIVE"
            />
        </transition>

        <PageHeader :backArrow="!!$route.params.canUserGoBack || page !== initialPage" @back="back">
            {{ $t('Receive {ticker}', { ticker: stablecoin.toUpperCase() }) }}
            <template #more>{{
                /* Split into multiple strings to share translation of the first sentence with ReceiveModal. */
                $t('Share your address with the sender.') + ' '
                    + $t('Make sure they are sending Polygon {ticker}.', { ticker: stablecoin.toUpperCase() })
            }}</template>
        </PageHeader>
        <PageBody class="flex-column">
            <QrCode
                :data="address"
                :size="qrCodeCanvasSize"
                :fill="'#1F2348' /* nimiq-blue */"
                :style="{'--qr-code-canvas-size': `${qrCodeCanvasSize}px`}"
            />
            <InteractiveShortAddress
                :address="address"
                :displayedCharacters="displayedAddressCharacters"
                copyable
                tooltip-position="top right"
                :offsetTooltipPosition="false"
                @show="hasSeenAddress = true"
                @copy="hasSeenAddress = true"
            />
        </PageBody>
        <transition name="fade">
            <PolygonWarningFooter v-if="!hasSeenAddress" type="receiving" level="info" key="info"/>
            <PolygonWarningFooter v-else type="receiving" level="warning" key="warning"/>
        </transition>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { PageHeader, PageBody, QrCode } from '@nimiq/vue-components';
import { CryptoCurrency } from '@nimiq/utils';
import { useRouter } from '@/router';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import { useUsdtTransactionsStore } from '../../stores/UsdtTransactions';
import { useWindowSize } from '../../composables/useWindowSize';
import Modal, { disableNextModalTransition } from './Modal.vue';
import PolygonWarningPage from '../PolygonWarningPage.vue';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import PolygonWarningFooter from '../PolygonWarningFooter.vue';
import { useAccountSettingsStore } from '../../stores/AccountSettings';

export default defineComponent({
    name: 'stablecoin-receive-modal',
    setup() {
        enum Pages {
            WARNING,
            RECEIVE,
        }

        const router = useRouter();

        const { state: addresses$, addressInfo } = usePolygonAddressStore();
        const { stablecoin } = useAccountSettingsStore();
        const { state: transactions$ } = stablecoin.value === CryptoCurrency.USDC
            ? useUsdcTransactionsStore()
            : useUsdtTransactionsStore();
        // These are non-reactive because we're only interested in whether the user had ever received USDC/T when the
        // modal was initially opened.
        const normalizedUserAddresses = Object.values(addresses$.addressInfos)
            .map(({ address }) => address.toLowerCase());
        const hasEverReceived = Object.values(transactions$.transactions)
            .some(({ recipient }) => normalizedUserAddresses.includes(recipient.toLowerCase()));

        const page = ref(hasEverReceived ? Pages.RECEIVE : Pages.WARNING);
        const initialPage = page.value;
        const address = computed(() => addressInfo.value?.address);
        const hasSeenAddress = ref(false);

        const { height: windowHeight, isMobile } = useWindowSize();
        const qrCodeCanvasSize = computed(() => windowHeight.value <= 520 ? Math.floor(windowHeight.value * .85) : 448);
        const displayedAddressCharacters = computed(() => {
            const maxChars = isMobile.value ? 22 : 20;
            return Math.max(8, Math.min(maxChars, Math.round(qrCodeCanvasSize.value / 20)));
        });

        function back() {
            if (page.value === initialPage) {
                disableNextModalTransition();
                router.back();
            } else if (page.value === Pages.RECEIVE) {
                page.value = Pages.WARNING;
                hasSeenAddress.value = false;
            }
        }

        return {
            Pages,
            page,
            initialPage,
            address,
            hasSeenAddress,
            qrCodeCanvasSize,
            displayedAddressCharacters,
            back,
            stablecoin,
        };
    },
    components: {
        Modal,
        PolygonWarningPage,
        PageHeader,
        PageBody,
        QrCode,
        InteractiveShortAddress,
        PolygonWarningFooter,
    },
});
</script>

<style lang="scss" scoped>
.receive-modal,
.receive-modal ::v-deep .small-page {
    contain: size layout paint style; // also clips PolygonWarningPage overflowing small-page's round corners
}

.polygon-warning-page {
    position: absolute;
    width: 100%;
    z-index: 1;
    background: white;
}

.page-header {
    contain: layout paint style;
    padding-left: 4.5rem;
    padding-right: 4.5rem;
    font-size: var(--body-size);
    line-height: 1.4;
    font-weight: 600;
    color: var(--text-60);

    ::v-deep h1 {
        margin-bottom: 1rem;
        color: var(--nimiq-blue);
    }
}

.page-body {
    contain: size layout paint style;
    padding-top: 2rem;
    align-items: center;

    @media (max-height: 520px) { // small mobile
        padding-top: 1rem;
    }
    @media (max-height: 480px) {
        contain: layout paint style; // make page scrollable
    }

    .qr-code {
        // The QrCode is rendered at 2x size and then scaled to half its size, to be sharp on retina displays. But now
        // we need to make it behave as half its size as well, that's why we use negative margins on all sides.
        height: var(--qr-code-canvas-size); // Must set fixed height for iOS 16 to display correctly.
        margin: calc(var(--qr-code-canvas-size) / -4);
        transform: scale(.5);
    }

    .interactive-short-address {
        margin-top: 1.25rem;

        ::v-deep {
            .copyable {
                padding: .25rem .5rem .5rem;

                .tooltip {
                    top: -4.625rem;

                    &::after {
                        transform: scale(-.8) translateY(-.625rem);
                    }
                }
            }

            .trigger::after {
                transform: scale(-.8) translateY(-.625rem);
            }

            .tooltip-box {
                left: 50% !important;
                padding: .625rem 1rem .5rem;
                transform: translate(-50%, -1.25rem);
            }
        }
    }
}

.polygon-warning-footer.fade-leave-active {
    position: absolute;
    bottom: 0;
    width: 100%;
}
</style>

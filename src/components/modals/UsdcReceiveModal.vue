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
            {{ $t('Receive USDC') }}
            <template #more>{{
                /* Split into multiple strings to share translation of the first sentence with ReceiveModal. */
                $t('Share your address with the sender.') + ' ' + $t('Make sure they are sending Polygon USDC.')
            }}</template>
        </PageHeader>
        <PageBody class="flex-column">
            <QrCode
                :data="address"
                :size="448"
                :fill="'#1F2348' /* nimiq-blue */"
            />
            <!-- Block mouse events registered by Tooltip and replace them with our custom handlers. Additionally, make
            the Tooltip non-focusable via noFocus to avoid the Tooltip and Copyable both being focus targets during
            keyboard navigation. Instead, we handle focus events on Copyable. -->
            <!-- eslint-disable-next-line vuejs-accessibility/mouse-events-have-key-events -->
            <Tooltip
                ref="addressTooltip$"
                noFocus
                class="copyable-short-address"
                @mouseenter.native.capture.stop="scheduleShowAddressTooltip"
                @mouseleave.native.capture.stop="hideAddressTooltip"
                @click.native.capture.stop="$refs.copyable$.copy(); /* block tooltip click handler and copy manually */"
            >
                <template #trigger>
                    <Copyable
                        ref="copyable$"
                        :text="address"
                        @focus.native="scheduleShowAddressTooltip"
                        @blur.native="hideAddressTooltip"
                        @copy="onCopy">
                        <ShortAddress :address="address"/>
                    </Copyable>
                </template>
                {{ address }}
            </Tooltip>
        </PageBody>
        <PolygonWarningFooter type="receiving"/>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody, QrCode, Tooltip, Copyable } from '@nimiq/vue-components';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import Modal, { disableNextModalTransition } from './Modal.vue';
import PolygonWarningPage from '../PolygonWarningPage.vue';
import ShortAddress from '../ShortAddress.vue';
import PolygonWarningFooter from '../PolygonWarningFooter.vue';

export default defineComponent({
    name: 'usdc-receive-modal',
    setup(props, context) {
        enum Pages {
            WARNING,
            RECEIVE,
        }

        const { state: addresses$, addressInfo } = useUsdcAddressStore();
        const { state: transactions$ } = useUsdcTransactionsStore();
        // These are non-reactive because we're only interested in whether the user had ever received USDC when the
        // modal was initially opened.
        const normalizedUserAddresses = Object.values(addresses$.addressInfos)
            .map(({ address }) => address.toLowerCase());
        const hasEverReceivedUsdc = Object.values(transactions$.transactions)
            .some(({ recipient }) => normalizedUserAddresses.includes(recipient.toLowerCase()));

        const page = ref(hasEverReceivedUsdc ? Pages.RECEIVE : Pages.WARNING);
        const initialPage = page.value;
        const address = computed(() => addressInfo.value?.address);
        const addressTooltip$ = ref<Tooltip>(null);

        function back() {
            if (page.value === initialPage) {
                disableNextModalTransition();
                context.root.$router.back();
            } else if (page.value === Pages.RECEIVE) {
                page.value = Pages.WARNING;
            }
        }

        let showAddressTooltipTimeout = -1;
        function showAddressTooltip(delay = 0) {
            if (showAddressTooltipTimeout !== -1) {
                // Showing tooltip is already scheduled. Keep the original delay.
                return;
            }
            showAddressTooltipTimeout = window.setTimeout(() => {
                showAddressTooltipTimeout = -1;
                if (!addressTooltip$.value) return;
                addressTooltip$.value.show();
            }, delay);
        }
        function hideAddressTooltip() {
            window.clearTimeout(showAddressTooltipTimeout);
            showAddressTooltipTimeout = -1;
            if (!addressTooltip$.value) return;
            addressTooltip$.value.hide(/* force */ true);
        }

        function scheduleShowAddressTooltip() {
            // Show the tooltip only after a delay, to check whether a copy is triggered immediately which cancels the
            // tooltip via hideAddressTooltip. Notably, if the copy was triggered by a tap via touchscreen, we want to
            // display the copy tooltip immediately and skip the address tooltip which would open very shortly by the
            // mouseenter and focus happening at the same time as the copy.
            showAddressTooltip(150);
        }

        function onCopy() {
            // Hide / cancel address tooltip and re-show it after the copy tooltip disappeared.
            hideAddressTooltip();
            showAddressTooltip(1200);
        }

        return {
            Pages,
            page,
            initialPage,
            address,
            addressTooltip$,
            scheduleShowAddressTooltip,
            hideAddressTooltip,
            onCopy,
            back,
        };
    },
    components: {
        Modal,
        PolygonWarningPage,
        PageHeader,
        PageBody,
        QrCode,
        Tooltip,
        Copyable,
        ShortAddress,
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
    // style containment set in component itself
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

    .qr-code {
        // The QrCode is rendered at 2x size and then scaled to half its size,
        // to be sharp on retina displays:
        // 2 x 224px = 448px
        // But now we need to make it behave as half its size as well, that's
        // why we use negative margins on all sides.
        --qr-canvas-size: 448px;
        height: var(--qr-canvas-size); // Must set fixed height for iOS 16 to display correctly
        margin: calc(var(--qr-canvas-size) / -4);
        transform: scale(.5);
    }

    .copyable-short-address {
        margin-top: 1.25rem;

        .copyable {
            padding: .25rem .5rem .5rem;

            ::v-deep .tooltip {
                top: -4.625rem;

                &::after {
                    transform: scale(-.8) translateY(-.625rem);
                }
            }
        }

        ::v-deep {
            .trigger::after {
                transform: scale(-.8) translateY(-.625rem);
            }

            .tooltip-box {
                left: 50% !important;
                padding: .625rem 1rem .5rem;
                font-size: 1.75rem;
                transform: translate(-50%, -1.25rem);
            }
        }
    }
}
</style>

<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="closeOverlay"
    >
        <PageHeader :backArrow="!!$route.params.canUserGoBack" @back="back">
            {{ $t('Receive BTC') }}
            <div slot="more" class="subheader">
                {{ $t('Share a single-use address with the sender.') }}
                <Tooltip class="info-tooltip" preferredPosition="bottom left">
                    <InfoCircleSmallIcon slot="trigger"/>
                    <div class="flex-column">
                        <p>{{
                            $t('With Bitcoin, a new address can be used for every transaction to improve privacy.')
                        }}</p>
                        <div class="flex-column">
                            <div class="flex-row">
                                <RefreshIcon />
                                <p>{{ $t('Create a new address for every transaction.') }}</p>
                            </div>
                            <div class="flex-row">
                                <BracketsIcon />
                                <p>
                                    {{ $t('Use labels to easily identify transactions.') }}
                                </p>
                            </div>
                        </div>
                    </div>
                </Tooltip>
            </div>
        </PageHeader>
        <PageBody class="flex-column">
            <Copyable class="address"
                :style="{ fontSize: `calc(var(--body-size) * ${addressFontSizeScaleFactor})` }"
                :text="currentlyShownAddress"
                @click.native="copyActiveAddressCallback"
                ref="availableAddressCopyable$"
                :class="{ 'already-copied': !!recentlyCopiedAddresses[currentlyShownAddress] }"
            >
                <transition-group name="translateY">
                    <div v-for="address in [currentlyShownAddress]" :key="address">{{ address }}</div>
                </transition-group>
                <div class="width-finder" ref="addressWidthFinder$">{{ currentlyShownAddress }}</div>
            </Copyable>

            <div class="address-sub-label">
                <transition name="fade">
                    <div v-if="!recentlyCopiedAddresses[currentlyShownAddress]" class="flex-row blue">
                        <span>{{ $t('This is a single-use address') }}</span>
                        <Tooltip preferredPosition="bottom left" :autoWidth="true"
                            :styles="{width: '205px', padding: '1.25rem 1.5rem'}"
                        >
                            <template slot="trigger"><InfoCircleSmallIcon /></template>
                            <span class="header">
                                {{ $t('Improve your privacy by creating a new address for every transaction. '
                                    + 'Old addresses still work.') }}
                            </span>
                        </Tooltip>
                    </div>

                    <a v-else-if="recentlyCopiedAddressesListSorted.length < BTC_MAX_COPYABLE_ADDRESSES"
                        class="flex-row create-new" @click="showNextExternalAddress"
                    >
                        <RefreshIcon /><span>{{ $t('Create a new single-use address.') }}</span>
                    </a>

                    <span v-else class="flex-row">{{ $t('Limit of copied addresses reached.') }}</span>
                </transition>
            </div>

            <div class="recently-copied-addresses flex-column">
                <transition name="fade">
                    <p class="no-recently-copied-address"
                        v-if="recentlyCopiedAddressesListSorted.length === 0">
                        {{ $t('Recent addresses will be listed here, until they receive a transaction.') }}
                    </p>
                    <div v-else class="address-list flex-column">
                        <h2 class="nq-label">{{ $t('Recently copied') }}</h2>
                        <div class="list flex-column" ref="addressList$"
                            :class="{ scroll: recentlyCopiedAddressesListSorted.length > 1 }">
                            <div class="scroll-mask top"></div>

                            <transition-group name="translateY-fade-list" tag="div">
                                <BtcCopiedAddress
                                    v-for="addressInfo in recentlyCopiedAddressesListSorted"
                                    ref="copiedAddresses$"
                                    :key="addressInfo.address"
                                    :addressInfo="addressInfo"
                                    :container="addressList$ ? { $el: addressList$ } : null"
                                    :showTooltip="recentlyCopiedAddressesListSorted.length === 1"
                                />
                            </transition-group>

                            <div class="scroll-mask bottom"></div>
                        </div>
                    </div>
                </transition>
            </div>

            <footer class="flex-row">
                <button class="nq-button-s" @click="receiveLinkOverlayOpened = true">
                    {{ $t('Create request link') }}
                </button>
                <button class="reset qr-button" @click="addressQrCodeOverlayOpened = true;">
                    <QrCodeIcon/>
                </button>
            </footer>
        </PageBody>

        <QrCodeOverlay v-if="addressQrCodeOverlayOpened"
            slot="overlay"
            :address="currentlyShownAddress" currency="btc"
        />

        <PaymentLinkOverlay slot="overlay"
            v-if="receiveLinkOverlayOpened"
            :address="currentlyShownAddress"
            currency="btc"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref, onUnmounted, onMounted, nextTick } from 'vue';
import {
    PageBody,
    PageHeader,
    Copyable,
    Tooltip,
    InfoCircleSmallIcon,
    QrCodeIcon,
} from '@nimiq/vue-components';
import { useRouter } from '@/router';
import { useI18n } from '@/lib/useI18n';
import Modal, { disableNextModalTransition } from './Modal.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import RefreshIcon from '../icons/RefreshIcon.vue';
import BracketsIcon from '../icons/BracketsIcon.vue';
import BtcCopiedAddress, { BtcCopiedAddressInfo } from '../BtcCopiedAddress.vue';
import { BTC_MAX_COPYABLE_ADDRESSES, BTC_UNCOPYABLE_ADDRESS_GAP } from '../../lib/Constants';
import PaymentLinkOverlay from './overlays/PaymentLinkOverlay.vue';
import QrCodeOverlay from './overlays/QrCodeOverlay.vue';

export default defineComponent({
    setup() {
        const { $t, $tc } = useI18n();
        const {
            availableExternalAddresses,
            copiedExternalAddresses,
            setCopiedAddress,
        } = useBtcAddressStore();

        const {
            senderLabels,
            setSenderLabel,
        } = useBtcLabelsStore();

        const second = 1000;
        const minute = 60 * second;
        const hour = 60 * minute;
        const day = 24 * hour;
        const now = ref(Date.now());

        const secondInterval = setInterval(() => {
            now.value = Date.now();
        }, 1 * second);

        onUnmounted(() => {
            clearInterval(secondInterval);
        });

        // return a string generated from a timestamp
        function getTimeLabel(timestamp: number): string {
            const difference = now.value - timestamp;

            if (difference < 1 * minute) {
                return $tc('Created just now');
            }
            if (difference < 1 * hour) {
                return $tc(
                    'Created {count} minute ago | Created {count} minutes ago',
                    Math.trunc(difference / minute),
                );
            }
            if (difference < 1 * day) {
                return $tc(
                    'Created {count} hour ago | Created {count} hours ago',
                    Math.trunc(difference / hour),
                );
            }
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (timestamp > yesterday.setHours(0, 0, 0, 0)) {
                return $t('Created yesterday') as string;
            }
            return $tc(
                'Created {count} day ago | Created {count} days ago',
                Math.trunc(difference / day),
            );
        }

        // Copied addresses
        const addressList$ = ref<HTMLDivElement | null>(null);
        const copiedAddresses$ = ref<BtcCopiedAddress[] | null>(null);
        const addressCopied = ref(false);
        const recentlyCopiedAddresses = computed(() =>
            Object.keys(copiedExternalAddresses.value)
                .map((address) => ({
                    get label() { return senderLabels.value[this.address] || ''; },
                    set label(value) { setSenderLabel(this.address, value); },
                    get timelabel() { return getTimeLabel(this.timestamp); },
                    timestamp: copiedExternalAddresses.value[address],
                    address,
                }))
                .reduce(
                    (acc, cur) => (acc[cur.address] = cur) && acc,
                    {} as {[address: string]: BtcCopiedAddressInfo},
                ),
        );
        const recentlyCopiedAddressesListSorted = computed(() =>
            Object.values(recentlyCopiedAddresses.value)
                .sort((addressA, addressB) => addressB.timestamp - addressA.timestamp),
        );

        // Currently displayed address
        const currentlyShownAddress = ref('');

        // Show the next external address in the .address copyable
        function showNextExternalAddress() {
            const numberOfCopiedAddresses = recentlyCopiedAddressesListSorted.value.length;

            let nextCopyableAddress: string | undefined;

            if (numberOfCopiedAddresses < BTC_MAX_COPYABLE_ADDRESSES) {
                nextCopyableAddress = availableExternalAddresses.value[BTC_UNCOPYABLE_ADDRESS_GAP];
            }

            currentlyShownAddress.value = nextCopyableAddress || recentlyCopiedAddressesListSorted.value[0].address;
        }
        showNextExternalAddress();

        // Copy the address in the .address copyable
        function copyActiveAddressCallback() {
            if (!addressCopied.value) {
                addressCopied.value = true;
            }

            if (!recentlyCopiedAddresses.value[currentlyShownAddress.value]) {
                setCopiedAddress(currentlyShownAddress.value);
                // Focus the label input of the newly copied address
                setTimeout(() => {
                    if (copiedAddresses$.value && copiedAddresses$.value.length > 0) {
                        copiedAddresses$.value[copiedAddresses$.value.length - 1].focus();
                    }
                }, 100);
            }
        }

        // Modals booleans & refs
        const addressQrCodeOverlayOpened = ref(false);
        const receiveLinkOverlayOpened = ref(false);

        // Close Overlay & reset the payment link value
        async function closeOverlay() {
            addressQrCodeOverlayOpened.value = false;
            receiveLinkOverlayOpened.value = false;
        }

        // Watching for sub-modals openings to set the actively shown address as copied
        watch([addressQrCodeOverlayOpened, receiveLinkOverlayOpened],
            (booleans, prevBooleans) => {
                if (booleans && prevBooleans) {
                    const [qrCodeOpened, receiveLinkOpened] = booleans;
                    const [prevQrCodeOpened, prevReceiveLinkOpened] = prevBooleans;

                    if ((qrCodeOpened === false && prevQrCodeOpened === true)
                        || (receiveLinkOpened === false && prevReceiveLinkOpened === true)) {
                        copyActiveAddressCallback();
                        showNextExternalAddress();
                    }
                }
            },
        );

        // Auto-adapt font-size for the address to always fit the grey box
        const availableAddressCopyable$ = ref<Copyable | null>(null);
        const addressWidthFinder$ = ref<HTMLDivElement | null>(null);
        const addressFontSizeScaleFactor = ref(1);
        let addressPadding: number | null = null;

        async function updateAddressFontSizeScaleFactor() {
            if (!availableAddressCopyable$.value || !addressWidthFinder$.value) {
                return null;
            }
            if (!addressPadding) {
                addressPadding = parseInt(
                    window.getComputedStyle(availableAddressCopyable$.value.$el.children[1])
                        .getPropertyValue('padding-left')
                        .replace('px', ''),
                    10,
                );
            }

            addressFontSizeScaleFactor.value = 1;
            await nextTick();

            const addressWidth = addressWidthFinder$.value.clientWidth;
            const maxWidth = availableAddressCopyable$.value.$el.clientWidth - (addressPadding * 2);

            addressFontSizeScaleFactor.value = Math.min(maxWidth / addressWidth, 1);

            return addressFontSizeScaleFactor.value;
        }

        watch(currentlyShownAddress, updateAddressFontSizeScaleFactor);
        onMounted(() => {
            updateAddressFontSizeScaleFactor();
            window.addEventListener('resize', updateAddressFontSizeScaleFactor);
        });
        onUnmounted(() => {
            window.removeEventListener('resize', updateAddressFontSizeScaleFactor);
        });

        const router = useRouter();
        function back() {
            disableNextModalTransition();
            router.back();
        }

        return {
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            closeOverlay,
            copyActiveAddressCallback,
            addressList$,
            copiedAddresses$,
            addressCopied,
            recentlyCopiedAddresses,
            recentlyCopiedAddressesListSorted,
            showNextExternalAddress,
            currentlyShownAddress,
            availableAddressCopyable$,
            addressWidthFinder$,
            addressFontSizeScaleFactor,
            BTC_MAX_COPYABLE_ADDRESSES,
            back,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Copyable,
        Tooltip,
        InfoCircleSmallIcon,
        QrCodeIcon,
        RefreshIcon,
        BracketsIcon,
        BtcCopiedAddress,
        PaymentLinkOverlay,
        QrCodeOverlay,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

@include scroll-mask(true, true, true);

.page-header {
    padding-bottom: 0;

    .subheader {
        margin-top: 1.5rem;
        font-size: var(--body-size);
        line-height: 1.4;
        font-weight: 600;
        color: var(--text-60);

        > .info-tooltip {
            margin-left: 0.25rem;
            z-index: 5;
            text-align: left;

            ::v-deep .trigger svg {
                height: 2rem;
                color: var(--text-60);
                transition: color var(--short-transition-duration) var(--nimiq-ease);
            }

            & ::v-deep .trigger:hover svg,
            & ::v-deep .trigger:focus svg,
            &.shown ::v-deep .trigger svg {
                color: var(--text-80);
            }

            ::v-deep .tooltip-box {
                width: 26.25rem;
                font-size: var(--small-size);
                font-weight: 600;
                transform: translate(1rem, 2rem);

                @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
                    transform: translate(0, 2rem);
                }

                p {
                    margin: 0;
                }

                p:first-child,
                .flex-row:first-child {
                    margin-bottom: 1rem;
                }

                .flex-row {
                    align-items: flex-start;

                    p {
                        flex-basis: 80%;
                        margin-left: 1.25rem;
                    }

                    svg {
                        opacity: 0.6;
                    }

                    &:first-child svg {
                        width: 2.75rem;
                        height: 2.75rem;
                        margin-top: 0.25rem;
                    }
                    &:last-child svg {
                        width: 2.25rem;
                        height: 2.25rem;
                        margin: 0.25rem 0.25rem 0;
                    }
                }
            }
        }
    }
}

.page-body {
    --short-transition-duration: 300ms;
    --long-transition-duration: 600ms;

    justify-content: flex-start;
    align-items: center;
    padding-top: 0;
    padding-bottom: 3rem;
    overflow: initial;
    position: relative;
}

.address {
    --padding: 1.5rem;

    width: 100%;
    margin-top: 5rem;
    border-radius: 5px;
    text-align: center;
    font-size: var(--body-size);
    font-family: 'Fira Mono', monospace;
    background-color: var(--nimiq-highlight-bg);
    font-weight: 500;
    color: var(--text-100);
    height: calc(var(--body-size) + 4px + (var(--padding) * 2));
    padding: 0;
    overflow: hidden;

    transition: {
        property: background-color, color, font-size;
        duration: var(--short-transition-duration);
        timing-function: var(--nimiq-ease);
    };

    &.already-copied {
        color: var(--text-35);
        pointer-events: none;
    }

    &:hover,
    &:focus {
        background-color: transparent;
    }

    &:hover ::v-deep .background {
        opacity: 0.1;
    }

    & ::v-deep > span {
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 100%;
        padding: var(--padding);

        div {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);

            &.translateY-enter-active,
            &.translateY-leave-active {
                transition: transform var(--long-transition-duration) var(--nimiq-ease);
            }

            &.translateY-enter-to,
            &.translateY-leave {
                transform: translateX(-50%);
            }

            &.translateY-enter {
                transform: translateX(-50%) translateY(calc((var(--body-size) + 4px + (var(--padding) * 2)) * -1));
            }

            &.translateY-leave-to {
                transform: translateX(-50%) translateY(calc(var(--body-size) + 4px + (var(--padding) * 2)));
            }
        }
    }

    .width-finder {
        position: absolute;
        color: transparent;
        pointer-events: none;
        user-select: none;
        font-size: var(--body-size);
        font-weight: 500;
    }
}

.address-sub-label {
    --margin-top: 1rem;

    align-items: center;
    margin-top: var(--margin-top);
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-50);
    position: relative;
    width: 100%;
    height: calc(1.25rem + var(--margin-top));

    & > * {
        justify-content: center;
        align-items: center;
    }

    .fade-enter-active {
        position: absolute;
        top: 0;
        width: 100%;
        z-index: 3;
    }

    .blue {
        color: var(--nimiq-light-blue);
    }

    .create-new {
        cursor: pointer;

        &:hover,
        &:focus {
            color: var(--nimiq-light-blue);
        }

        & > svg {
            margin-right: 0.75rem;
        }
    }

    .tooltip {
        z-index: 4;

        ::v-deep .trigger .nq-icon {
            margin-left: 0.75rem;
        }

        .header {
            font-size: var(--small-size);
        }
    }
}

.recently-copied-addresses {
    flex-grow: 1;
    align-self: stretch;
    position: relative;
    min-height: 24rem; /* Fits two copied addresses without scrolling */
}

.no-recently-copied-address {
    color: var(--text-40);
    font-size: var(--body-size);
    font-weight: 600;
    padding: 0 4.75rem;
    text-align: center;
    margin: auto 0;
}

.address-list {
    flex-grow: 1;
    align-items: center;
    min-height: 0;

    &.fade-enter-active,
    &.fade-leave-active {
        position: absolute;
        width: 100%;
    }

    .nq-label {
        text-align: center;
        margin: 4rem 0 0;
    }

    .list {
        @extend %custom-scrollbar;
        $paddingTop: 2.5rem;

        flex: 1 1 0;
        width: calc(100% + 8rem);
        padding: $paddingTop 4rem 0;
        margin-top: 0.5rem;

        &.scroll {
            overflow-y: auto;
        }

        .scroll-mask.top {
            transform: translateY(-#{$paddingTop});
        }

        .btc-copied-address ::v-deep .interactive-short-address {
            // When showing the Copyable tooltip (see below) or address tooltip avoid separate stacking contexts caused
            // by style containment for any parents of the Copyable or address tooltip-box to be able to elevate the
            // Copyable and tooltip-box without having to elevate any stacking context causing parents.
            &:has(.copyable.copied, .tooltip-box, :hover, :focus, :focus-within),
            &:has(.copyable.copied, .tooltip-box, :hover, :focus, :focus-within) :has(.copyable, .tooltip-box) {
                contain: none;
            }

            // Render the Copyable's tooltip, which is shown on copy, above the scroll mask. Instead of increasing just
            // the tooltip's z-index, we have to raise the Copyable itself because it causes a separate stacking context
            // due to its translateX transform.
            .copyable {
                &.copied {
                    z-index: 3;
                }
                &:not(.copied) {
                    z-index: 0;
                    transition: z-index 0s .3s, // Keep the Copyable elevated until the tooltip is faded out.
                        // Preserve original transitions.
                        transform var(--short-transition-duration) var(--nimiq-ease),
                        color .3s var(--nimiq-ease);
                }
            }
        }
    }
}

footer {
    width: 100%;
    justify-content: center;
    margin-top: 2rem;

    .qr-button {
        position: absolute;
        right: 3rem;
        bottom: 3rem;
        opacity: .4;
        transition: opacity 250ms var(--nimiq-ease);

        svg {
            width: 4rem;
            height: auto;
        }

        &:hover,
        &:focus {
            opacity: 0.8;
        }
    }
}

/* vue transition - translateY-fade-list */
.translateY-fade-list-enter-active,
.translateY-fade-list-leave-active,
.translateY-fade-list-leave-active ~ .btc-copied-address,
.translateY-fade-list-move {
    transition: {
        property: opacity, transform;
        duration: var(--long-transition-duration);
        timing-function: var(--nimiq-ease);
    };
}

.translateY-fade-list-enter-to,
.translateY-fade-list-leave {
    opacity: 1;
    transform: translateY(0);
}

.translateY-fade-list-enter {
    opacity: 0;
    transform: translateY(-4rem);
}

.translateY-fade-list-leave-active {
    opacity: 0;
    transform-origin: top;
    transform: scaleY(0);

    & ~ .btc-copied-address {
        transform: translateY(-7.25rem);
    }
}

@media (max-width: 450px) { // Breakpoint of .page-body padding
    .address-list .list {
        width: calc(100% + 6rem);
        padding: 0 3rem;

        .scroll-mask.top {
            transform: translateY(0);
        }
    }
}
</style>

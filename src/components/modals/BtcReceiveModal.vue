<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="closeOverlay"
    >
        <PageHeader>
            {{ $t('Receive BTC') }}
            <div slot="more">{{ $t('Share a single-use address with the sender.') }}</div>
        </PageHeader>
        <PageBody class="flex-column">
            <Copyable class="address"
                :style="{ fontSize: `calc(var(--body-size) * ${addressFontSizeScaleFactor})` }"
                :text="currentlyShownAddress"
                @click.native="copyActiveAddressCallback"
                ref="$availableAddressCopyable"
                :class="{ 'already-copied': !!recentlyCopiedAddresses[currentlyShownAddress] }"
            >
                <transition-group name="translateY">
                    <div v-for="address in [currentlyShownAddress]" :key="address">{{ address }}</div>
                </transition-group>
                <div class="width-finder" ref="$addressWidthFinder">{{ currentlyShownAddress }}</div>
            </Copyable>

            <div class="address-sub-label">
                <transition name="fade">
                    <div class="flex-row blue" v-if="!recentlyCopiedAddresses[currentlyShownAddress]">
                        <span>{{ $t('This is a single-use address') }}</span>
                        <Tooltip preferredPosition="bottom left" :autoWidth="true" :styles="{width: '205px'}">
                            <template slot="trigger"><InfoCircleSmallIcon /></template>
                            <span class="header">
                                {{ $t('Use a new Bitcoin address for every transaction to improve privacy.') }}
                            </span>
                            <p>{{ $t('Although reusing addresses won’t result in a loss of funds,'
                                    + ' it is highly recommended not to do so.') }}</p>
                        </Tooltip>
                    </div>

                    <a class="flex-row create-new" @click="showNextExternalAddress" v-else>
                        <RefreshIcon /><span>{{ $t('Create a new single-use address.') }}</span>
                    </a>
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
                        <div class="list flex-column" ref="addressList"
                            :class="{ scroll: recentlyCopiedAddressesListSorted.length > 1 }">
                            <div class="scroll-mask top"></div>

                            <transition-group name="translateY-fade-list" tag="div">
                                <BtcCopiedAddress
                                    v-for="addressInfo in recentlyCopiedAddressesListSorted"
                                    ref="$copiedAddresses"
                                    :key="addressInfo.address"
                                    :addressInfo="addressInfo"
                                    :container="$refs.addressList ? { $el: $refs.addressList } : null"
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
                    {{ $t('Create payment link') }}
                </button>
                <button class="reset qr-button" @click="addressQrCodeOverlayOpened = true;">
                    <QrCodeIcon/>
                </button>
            </footer>

            <Tooltip class="info-tooltip" preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <div class="flex-column">
                    <p>{{ $t('With Bitcoin, a new address is used for every transaction to improve privacy.'
                        + 'Reuse of addresses does not result in a loss of funds.') }}</p>
                    <div class="flex-column">
                        <div class="flex-row">
                            <RefreshIcon />
                            <p>{{ $t('Don’t reuse addresses and create a new one for every transaction.') }}</p>
                        </div>
                        <div class="flex-row">
                            <BracketsIcon />
                            <p>{{
                                $t('Use labels instead of contacts to easily identify transactions in your history.')
                            }}</p>
                        </div>
                    </div>
                </div>
            </Tooltip>
        </PageBody>

        <!-- copied from ReceiveModal.vue -->
        <PageBody v-if="addressQrCodeOverlayOpened" class="address-qr-overlay flex-column" slot="overlay">
            <QrCode
                :data="currentlyShownAddress"
                :size="520"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <p class="qr-info-text nq-light-blue">{{ $t('Scan the code to send\nmoney to this address') }}</p>
        </PageBody>

        <!-- copied from ReceiveModal.vue -->
        <template v-if="receiveLinkOverlayOpened" slot="overlay">
            <PageHeader class="link-overlay">
                {{ $t('Share your Payment Link') }}
                <div slot="more">
                    {{ $t('Share the link or QR code with the sender.\nOptionally include an amount. ') }}
                </div>
            </PageHeader>
            <PageBody class="flex-column link-overlay">
                <div class="inputs">
                    <div class="separator"></div>
                    <!-- TODO: add label to AmountInput -->
                    <AmountInput v-model="amount" :maxFontSize="5" :decimals="btcUnit.decimals">
                        <span slot="suffix" class="ticker">{{ btcUnit.ticker }}</span>
                    </AmountInput>
                    <div class="separator"></div>
                </div>
                <QrCode
                    :data="requestLink"
                    :size="400"
                    :fill="'#1F2348' /* nimiq-blue */"
                    class="qr-code"
                />
                <Copyable :text="`${origin}/${requestLink}`">
                    {{ origin.replace(/https?:\/\//, '') }}/{{ requestLink }}
                </Copyable>
            </PageBody>
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref, Ref, onUnmounted, onMounted } from '@vue/composition-api';
import {
    PageBody,
    PageHeader,
    PageFooter,
    Copyable,
    Tooltip,
    InfoCircleSmallIcon,
    QrCodeIcon,
    QrCode,
} from '@nimiq/vue-components';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { useSettingsStore } from '../../stores/Settings';
import RefreshIcon from '../icons/RefreshIcon.vue';
import BracketsIcon from '../icons/BracketsIcon.vue';
import AmountInput from '../AmountInput.vue';
import BtcCopiedAddress, { BtcCopiedAddressInfo } from '../BtcCopiedAddress.vue';

export default defineComponent({
    setup(props, context) {
        const {
            addressSet,
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

            if (difference < 1 * second) {
                return context.root.$tc('Created just now');
            }
            if (difference < 1 * minute) {
                return context.root.$tc(
                    'Created {count} second ago | Created {count} seconds ago',
                    Math.trunc(difference / second),
                );
            }
            if (difference < 1 * hour) {
                return context.root.$tc(
                    'Created {count} minute ago | Created {count} minutes ago',
                    Math.trunc(difference / minute),
                );
            }
            if (difference < 1 * day) {
                return context.root.$tc(
                    'Created {count} hour ago | Created {count} hours ago',
                    Math.trunc(difference / hour),
                );
            }
            if (difference >= 1 * day) {
                return context.root.$tc(
                    'Created {count} day ago | Created {count} days ago',
                    Math.trunc(difference / day),
                );
            }

            return context.root.$tc('Created some time ago');
        }

        // Copied addresses
        const $copiedAddresses = ref<{ focus(): void }[] | null>();
        const addressCopied = ref<boolean>(false);
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
        const currentlyShownAddress = ref(
            availableExternalAddresses.value[0]
            || addressSet.value.external[addressSet.value.external.length - 1].address,
        );

        // requestLink
        const amount = ref<number>(0);
        const message = ref<string>('');

        const requestLinkOptions: Readonly<Ref<GeneralRequestLinkOptions>> = computed(() => ({
            type: NimiqRequestLinkType.URI,
            amount: amount.value,
            currency: Currency.BTC,
            message: message.value,
        }));

        const requestLink = computed(
            () => createRequestLink(currentlyShownAddress.value, requestLinkOptions.value),
        );

        // Copy the address in the .address copyable
        function copyActiveAddressCallback() {
            if (!addressCopied.value) {
                addressCopied.value = true;
            }

            if (!recentlyCopiedAddresses.value[currentlyShownAddress.value]) {
                setCopiedAddress(currentlyShownAddress.value);
                // Focus the label input of the newly copied address
                setTimeout(() => {
                    if ($copiedAddresses.value && $copiedAddresses.value.length > 0) {
                        $copiedAddresses.value[$copiedAddresses.value.length - 1].focus();
                    }
                }, 100);
            }
        }

        // Show the next external address in the .address copyable
        function showNextExternalAddress() {
            const nextActiveExternalAddress = availableExternalAddresses.value
                .find((address: string) => !copiedExternalAddresses.value[address]);

            if (nextActiveExternalAddress) {
                currentlyShownAddress.value = nextActiveExternalAddress;
            }
        }

        // Modals booleans
        const addressQrCodeOverlayOpened = ref<boolean>(false);
        const receiveLinkOverlayOpened = ref<boolean>(false);

        // Close Overlay & reset the payment link value
        async function closeOverlay() {
            addressQrCodeOverlayOpened.value = false;
            receiveLinkOverlayOpened.value = false;
            amount.value = 0;
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
        const $availableAddressCopyable: Ref<Copyable | null> = ref(null);
        const $addressWidthFinder: Ref<HTMLDivElement | null> = ref(null);
        const addressFontSizeScaleFactor: Ref<number> = ref(1);
        let addressPadding: number | null = null;

        async function updateAddressFontSizeScaleFactor() {
            if (!$availableAddressCopyable.value || !$addressWidthFinder.value) {
                return null;
            }
            if (!addressPadding) {
                addressPadding = parseInt(
                    window.getComputedStyle($availableAddressCopyable.value.$el.children[1])
                        .getPropertyValue('padding-left')
                        .replace('px', ''),
                    10,
                );
            }

            addressFontSizeScaleFactor.value = 1;
            await context.root.$nextTick();

            const width = $addressWidthFinder.value.clientWidth;
            const maxWidth = $availableAddressCopyable.value.$el.clientWidth - (addressPadding * 2);

            addressFontSizeScaleFactor.value = Math.min(maxWidth / width, 1);

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

        const { btcUnit } = useSettingsStore();

        return {
            origin: window.location.origin,
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            closeOverlay,
            amount,
            btcUnit,
            message,
            requestLink,
            copyActiveAddressCallback,
            $copiedAddresses,
            addressCopied,
            recentlyCopiedAddresses,
            recentlyCopiedAddressesListSorted,
            showNextExternalAddress,
            currentlyShownAddress,
            $availableAddressCopyable,
            $addressWidthFinder,
            addressFontSizeScaleFactor,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Copyable,
        Tooltip,
        InfoCircleSmallIcon,
        QrCodeIcon,
        QrCode,
        AmountInput,
        RefreshIcon,
        BracketsIcon,
        BtcCopiedAddress,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

@include scroll-mask(true, true, true);

.page-header {
    padding-bottom: 0;

    div {
        font-size: var(--body-size);
        line-height: 1.4;
        font-weight: 600;
        opacity: 0.6;
        margin-top: 2rem;
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

    &:hover /deep/ .background {
        opacity: 0.1;
    }

    & /deep/ > span {
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
            fill: currentColor;
        }
    }

    .tooltip {
        z-index: 3;

        /deep/ .trigger .nq-icon {
            margin-left: 0.75rem;
        }

        .header {
            font-size: var(--small-size);
        }

        p {
            margin-top: 0.75rem;
            margin-bottom: 0;
            opacity: 0.6;
            font-size: 1.625rem;
        }
    }
}

.recently-copied-addresses {
    flex-grow: 1;
    align-self: stretch;
    min-height: 0;
    position: relative;
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
    }
}

footer {
    width: 100%;
    justify-content: center;
    margin-top: 2rem;

    .nq-button-s {
    }

    .qr-button {
        position: absolute;
        right: 3rem;
        bottom: 3rem;
        opacity: .4;

        svg {
            width: 4rem;
            height: auto;
        }
    }
}

.info-tooltip {
    position: absolute;
    top: 2rem;
    left: 2rem;

    /deep/ .trigger svg {
        opacity: .3;

        transition: color var(--short-transition-duration) var(--nimiq-ease);
    }

    & /deep/ .trigger:hover svg,
    & /deep/ .trigger:focus svg,
    &.shown /deep/ .trigger svg {
        opacity: .6;
    }

    /deep/ .tooltip-box {
        width: 26.25rem;
        font-size: var(--small-size);
        font-weight: 600;

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
                fill: currentColor;
                opacity: 0.6;
            }
        }

        .flex-row:first-child {
            svg {
                width: 2.75rem;
                height: 2.75rem;
                margin-top: 0.25rem;
            }
        }

        .flex-row:last-child {
            svg {
                width: 2.25rem;
                height: 2.25rem;
                margin: 0.25rem 0.25rem 0;
            }
        }
    }
}

/* copied from ReceiveModal.vue */
.address-qr-overlay {
    justify-content: space-evenly;
    align-items: center;

    .flex-spacer {
        height: 2rem;
    }

    .qr-code {
        // The QrCode is rendered at 2x size and then scaled to half its size,
        // to be sharp on retina displays:
        // 2 x 260px = 560px
        // But now we need to make it behave as half its size as well, that's
        // why we use negative margins on all sides (130px = 260px / 2).
        transform: scale(0.5);
        margin: -130px;
    }

    .qr-info-text {
        font-size: var(--h2-size);
        font-weight: 600;
        white-space: pre;
        text-align: center;
    }
}

/* copied from ReceiveModal.vue */
.page-body.link-overlay {
    justify-content: space-between;
    align-items: center;
    overflow: visible;

    .inputs {
        width: calc(100% + 4rem);
        margin: 0 -2rem 2rem;
        position: relative;

        .separator:first-child {
            height: 2px;
            margin-bottom: 1.5rem;
            box-shadow: inset 0 1.5px 0 var(--text-10);
        }

        .separator:last-child {
            height: 2px;
            margin-top: 1.5rem;
            box-shadow: inset 0 -1.5px 0 var(--text-10);
        }

        .amount-input {
            font-size: 5rem;

            /deep/ .nim {
                font-size: 0.5em;
                margin-left: 0.5rem;
                margin-right: calc(-1.9em - 0.5rem);
            }

            /deep/ .nq-input {
                padding: 0;
            }

            /deep/ .width-finder {
                padding: 0 1rem;
            }
        }
    }

    .qr-code {
        flex-shrink: 1;
        // min-height: 0;

        // The QrCode is rendered at 2x size and then scaled to half its size,
        // to be sharp on retina displays:
        // 2 x 200px = 400px
        // But now we need to make it behave as half its size as well, that's
        // why we use negative margins on all sides (100px = 200px / 2).
        transform: scale(0.5);
        margin: -100px;
    }

    .copyable {
        flex-shrink: 0;
        max-width: 100%;
        word-wrap: break-word;
        color: rgba(31, 35, 72, 0.5);
        text-align: center;
        font-size: var(--h2-size);
        margin-top: 2rem;
    }
}

/* vue transition - translateY-fade-list */
.translateY-fade-list-enter-active,
.translateY-fade-list-leave-active,
.translateY-fade-list-leave-active ~ .address-item,
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

    & ~ .address-item {
        transform: translateY(-7.25rem);
    }
}

@media (max-width: 450px) { // Breakpoint of .page-body padding
    .address-list .list {
        width: calc(100% + 6rem);
        padding: 0 3rem;
    }
}
</style>

<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="addressQrCodeOverlayOpened = false; receiveLinkOverlayOpened = false; amount = 0;"
    >
        <PageHeader>
            {{ $t('Receive BTC') }}
            <div slot="more">{{ $t('Share a single-use address with the sender.') }}</div>
        </PageHeader>
        <PageBody class="flex-column">
            <Copyable class="address"
                :class="{ 'already-copied': !!recentlyCopiedAddresses[activeExternalAddress] }"
                :text="activeExternalAddress"
                @click.native="copyAddress"
            >
                {{ activeExternalAddress }}
            </Copyable>

            <transition name="fade">
                <div class="address-sub-label flex-row blue" v-if="!addressCopied">
                    <span>{{ $t('This is a single-use address') }}</span>
                    <Tooltip preferredPosition="bottom left" :autoWidth="true">
                        <template slot="trigger"><InfoCircleSmallIcon /></template>
                        <p>Use a new Bitcoin address for every transaction to improve privacy.</p>
                        <p>Although reusing addresses won’t result in a loss of funds, it is highly recommended not to do so.</p>
                    </Tooltip>
                </div>

                <a class="address-sub-label flex-row nq-link" @click="showNextExternalAddress" v-else>
                    <RefreshIcon /><span>{{ $t('Create a new single-use address.') }}</span>
                </a>
            </transition>

            <div class="recently-copied-addresses flex-column">
                <transition name="fade">
                    <p class="no-recently-copied-address"
                        v-if="!recentlyCopiedAddressesList.length">
                        {{ $t('Recent addresses will be listed here, until they receive a transaction.') }}
                    </p>

                    <div class="address-list" v-else>
                        <div class="scroll-mask top"></div>
                        <h2 class="nq-h2">{{ $t('RECENTLY COPIED') }}</h2>

                        <transition-group name="tranlsateY-fade-list">
                            <div class="address-item flex-row"
                                :class="{ rename }"
                                v-for="{ address, label, rename } in recentlyCopiedAddressesListSorted"
                                :key="address"
                            >
                                <transition name="fade">
                                    <div class="flex-column" key="renaming" v-if="rename">
                                        <LabelInput :placeholder="$t('Label the sender')"
                                            v-model="recentlyCopiedAddresses[address].label"
                                            :ref="`address-label-${address}`"
                                            @blur.native.capture="recentlyCopiedAddresses[address].rename = false"
                                            @keyup.native.enter="recentlyCopiedAddresses[address].rename = false"
                                        />
                                    </div>
                                    <div class="flex-column" key="not-renaming" v-else>
                                        <div class="address-label"
                                            :class="{ 'unlabelled': !label }"
                                            @click="showRenameAddressLabelInput(address)"
                                        >
                                            {{ label || $t("Unlabelled") }}
                                        </div>
                                        <div class="address-created">created 1min ago</div><!-- TODO -->
                                    </div>
                                </transition>
                                <Copyable :text="address" class="address-short">
                                    <ShortAddress :address="address"/>
                                </Copyable>
                            </div>
                        </transition-group>

                        <div class="scroll-mask bottom"></div>
                    </div>
                </transition>
            </div>

            <footer class="flex-row">
                <button class="nq-button-s" @click="receiveLinkOverlayOpened = true">
                    {{ $t('Create payment link') }}
                </button>
                <button class="reset qr-button" @click="addressQrCodeOverlayOpened = true"><QrCodeIcon/></button>
            </footer>
        </PageBody>

        <!-- copied from ReceiveModal.vue -->
        <PageBody v-if="addressQrCodeOverlayOpened" class="address-qr-overlay flex-column" slot="overlay">
            <QrCode
                :data="activeExternalAddress"
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
                    <AmountInput v-model="amount" :maxFontSize="5" label="BTC"/>
                    <div class="separator"></div>
                </div>
                <!-- <AmountInput v-model="amoun§t" />
                <labelInput v-model="message" placeholder="add a message" /> -->
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
import { defineComponent, computed, ref, Ref } from '@vue/composition-api';
import {
    PageBody,
    PageHeader,
    PageFooter,
    Copyable,
    Tooltip,
    InfoCircleSmallIcon,
    QrCodeIcon,
    QrCode,
    LabelInput,
} from '@nimiq/vue-components';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import RefreshIcon from '../icons/RefreshIcon.vue';
import AmountInput from '../AmountInput.vue';
import ShortAddress from '../ShortAddress.vue';

interface BtcCopiedAddressInfo {
    address: string;
    copiedAt: number;
    label: string;
    rename: boolean;
}

export default defineComponent({
    setup(props, context) {
        const { activeExternalAddresses } = useBtcAddressStore();
        const activeExternalAddress = ref(activeExternalAddresses.value[0]);

        // Modals booleans
        const addressQrCodeOverlayOpened = ref<boolean>(false);
        const receiveLinkOverlayOpened = ref<boolean>(false);

        // requestLink
        const amount = ref<string>(0);
        const message = ref<string>('');

        const requestLinkOptions: Readonly<Ref<GeneralRequestLinkOptions>> = computed(() => ({
            type: NimiqRequestLinkType.URI,
            amount: Number.parseInt(amount.value, 10),
            currency: Currency.BTC,
            message: message.value,
        }));

        const requestLink = computed(
            () => createRequestLink(activeExternalAddress.value, requestLinkOptions.value),
        );

        // Copy address / address copied
        const addressCopied = ref<boolean>(false);
        const recentlyCopiedAddresses: Ref<Record<string, BtcCopiedAddressInfo>> = ref(new Set());
        const recentlyCopiedAddressesList: Ref<readonly BtcCopiedAddressInfo[]> = computed(() =>
            Object.values(recentlyCopiedAddresses.value),
        );
        const recentlyCopiedAddressesListSorted = computed(() =>
            (recentlyCopiedAddressesList.value as BtcCopiedAddressInfo[]).sort((addressInfo) => -addressInfo.copiedAt),
        );

        function copyAddress() {
            if (!addressCopied.value) {
                addressCopied.value = true;
            }

            if (!recentlyCopiedAddresses.value[activeExternalAddress.value]) {
                recentlyCopiedAddresses.value = {
                    ...recentlyCopiedAddresses.value,
                    [activeExternalAddress.value]: {
                        address: activeExternalAddress.value,
                        copiedAt: Date.now(),
                        label: '',
                        rename: true,
                    },
                };

                context.root.$nextTick(() => {
                    const refs = (context.refs[`address-label-${activeExternalAddress.value}`] as Vue[] | undefined);

                    if (refs && refs.length) {
                        const label = (refs[0] as LabelInput);

                        label.focus();
                    }
                });

            }
        }

        // Show Next External Address in the Copyable Box
        function showNextExternalAddress() {
            activeExternalAddress.value = activeExternalAddresses.value.find(
                (address: string) => !recentlyCopiedAddresses.value[address],
            ) || activeExternalAddresses.value[activeExternalAddresses.value.length - 1];
        }

        // Show the LabelInput for the given address
        function showRenameAddressLabelInput(address: string) {
            recentlyCopiedAddresses.value[address].rename = true;
            context.root.$nextTick(() => {
                const refs = (context.refs[`address-label-${address}`] as Vue[] | undefined);

                if (refs && refs.length) {
                    const label = (refs[0] as LabelInput);

                    label.focus();
                }
            });
        }

        return {
            origin: window.location.origin,
            activeExternalAddress,
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            amount,
            message,
            requestLink,
            copyAddress,
            addressCopied,
            recentlyCopiedAddresses,
            recentlyCopiedAddressesList,
            recentlyCopiedAddressesListSorted,
            showNextExternalAddress,
            showRenameAddressLabelInput,
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
        LabelInput,
        ShortAddress,
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
        margin-top: 1rem;
    }
}

.page-body {
    justify-content: flex-start;
    align-items: center;
    overflow: hidden;
}

.address {
    width: 100%;
    margin-top: 5rem;
    border-radius: 5px;
    text-align: center;
    font-size: var(--body-size);
    background-color: var(--nimiq-highlight-bg);
    font-weight: 500;
    color: var(--text-100);

    &.already-copied {
        color: var(--text-35);
    }

    transition: {
        property: background-color, color;
        duration: 300ms;
        timing-function: var(--nimiq-ease);
    };

    &:hover,
    &:focus {
        background-color: transparent;
    }
}

.address-sub-label {
    --margin-top: 1rem;

    align-items: center;
    margin-top: var(--margin-top);
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-50);

    &.fade-enter-active,
    &.fade-leave-active {
        transition-delay: 1s;
    }

    &.fade-enter-active {
        height: 0;
        margin-top: 0;
        transform: translateY(calc(-100% - var(--margin-top)));
    }

    &.blue {
        color: var(--nimiq-light-blue);
    }

    &.change-address:hover {
        text-decoration: none;
    }

    & > svg {
        margin-right: 0.75rem;
        fill: currentColor;
    }

    .tooltip /deep/ .trigger .nq-icon {
        margin-left: 0.75rem;
    }

    .tooltip /deep/ .tooltip-box {
        p {
            width: 22.5rem;
        }

        p:first-child {
            margin-top: 0;
        }

        p:last-child {
            font-weight: 500;
            margin-bottom: 0;
        }
    }
}

.recently-copied-addresses {
    flex-grow: 1;
    width: 100%;
    position: relative;
    overflow-y: auto;
}

.no-recently-copied-address {
    color: var(--text-40);
    font-size: var(--body-size);
    padding: 0 4.75rem;
    text-align: center;
    margin: auto 0;

    &.fade-enter-active,
    &.fade-leave-active {
        transition-delay: 1s;
    }
}

.address-list {
    &.fade-enter-active,
    &.fade-leave-active {
        position: absolute;
        width: 100%;
        transition-delay: 1s;
    }

    h2 {
        color: var(--text-40);
        font-size: var(--small-size);
        margin-top: 2.625rem;
        margin-bottom: 4rem;
        letter-spacing: 1px;
        text-align: center;
    }
}

.address-item {
    position: relative;
    justify-content: space-between;
    align-items: center;

    &:not(:last-child) {
        margin-bottom: 2rem;
    }

    &,
    .flex-column {
        height: 5rem;
    }

    .flex-column {
        background-color: white;
        justify-content: center;

        &.fade-enter-active {
            position: absolute;
        }
    }
}

.label-input /deep/ {
    .nq-input,
    .width-finder {
        padding: 0.25rem .5rem;
        font-size: var(--body-size);
        font-weight: 600;
    }

    .nq-input {
        border-radius: 0.375rem;

        &:hover,
        &:focus {
            --border-color: var(--light-blue-40);
        }
    }
}

.address-label {
    font-size: var(--body-size);
    line-height: calc(var(--body-size) + 1rem);
    cursor: pointer;

    &.unlabelled {
        font-style: italic;
    }
}

.address-created {
    color: var(--text-60);
    font-size: var(--small-size);
}

.address-short.copyable {
    padding: .5rem;

    .short-address {
        font-weight: normal;
        font-size: var(--body-size);
        color: var(--text-70);
    }

    &:hover .short-address,
    &:focus .short-address,
    &.copied .short-address {
        opacity: 1;
        font-weight: 500;
        // color: var(--text-70);
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
        margin: -1rem -2rem 2rem;
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

/* vue transition - tranlsateY-fade-list */
.tranlsateY-fade-list-enter-active,
.tranlsateY-fade-list-leave-active {
    transition: {
        property: opacity, transform;
        duration: 600ms;
        timing-function: var(--nimiq-ease);
    };
}

.tranlsateY-fade-list-enter-to,
.tranlsateY-fade-list-leave {
    opacity: 1;
    transform: translateY(0);
}

.tranlsateY-fade-list-enter,
.tranlsateY-fade-list-leave-to {
    opacity: 0;
    transform: translateY(-4rem);
}
</style>

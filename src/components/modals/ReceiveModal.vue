<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="addressQrCodeOverlayOpened = false; receiveLinkOverlayOpened = false; amount = 0;"
    >
        <PageHeader>
            {{ $t('Receive NIM') }}
            <div slot="more">{{ $t('Share your address with the sender.') }}</div>
        </PageHeader>
        <PageBody class="flex-column address-page">
            <button
                v-if="activeAddressInfo.type === AddressType.BASIC"
                @click="addressQrCodeOverlayOpened = true"
                class="reset qr-button"
            >
                <QrCodeIcon/>
            </button>
            <Identicon :address="activeAddressInfo.address"/>
            <Copyable :text="activeAddressInfo.address">
                <AddressDisplay :address="activeAddressInfo.address"/>
            </Copyable>
            <button
                v-if="activeAddressInfo.type === AddressType.BASIC"
                @click="receiveLinkOverlayOpened = true"
                @mousedown.prevent
                class="nq-button-s"
            >
                {{ $t('Create payment link') }}
            </button>
        </PageBody>

        <PageBody v-if="addressQrCodeOverlayOpened" class="address-qr-overlay flex-column" slot="overlay">
            <QrCode
                :data="activeAddressInfo.address"
                :size="520"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <p class="qr-info-text nq-light-blue">{{ $t('Scan the code to send\nmoney to this address') }}</p>
        </PageBody>

        <template v-if="receiveLinkOverlayOpened" slot="overlay">
            <PageHeader class="link-overlay">
                {{ $t('Share your Payment Link') }}
                <div slot="more">
                    {{ $t('Share the link or QR code with the sender.\nOptionally include an amount. ') }}
                </div>
            </PageHeader>
            <PageBody class="flex-column link-overlay">
                <div class="dynamic-spacer"></div>
                <div class="inputs">
                    <div class="separator"></div>
                    <AmountInput v-model="amount" :maxFontSize="5"/>
                    <div class="separator"></div>
                </div>
                <!-- <AmountInput v-model="amount" />
                <labelInput v-model="message" placeholder="add a message" /> -->
                <div class="dynamic-spacer"></div>
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
import { defineComponent, computed, Ref, ref } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    Identicon,
    AddressDisplay,
    AmountInput,
    LabelInput,
    QrCodeIcon,
    QrCode,
    Copyable,
} from '@nimiq/vue-components';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useAddressStore, AddressType } from '../../stores/Address';

export default defineComponent({
    name: 'receive-modal',
    setup() {
        const addressQrCodeOverlayOpened = ref(false);
        const receiveLinkOverlayOpened = ref(false);

        const amount: Ref<string> = ref(0);
        const message: Ref<string> = ref('');
        const { activeAddressInfo } = useAddressStore();

        const requestLinkOptions: Readonly<Ref<GeneralRequestLinkOptions>> = computed(() => ({
            type: NimiqRequestLinkType.URI,
            amount: Number.parseInt(amount.value, 10),
            currency: Currency.NIM,
            message: message.value,
        }));

        const requestLink = computed(
            () => createRequestLink(activeAddressInfo.value!.address, requestLinkOptions.value));

        return {
            activeAddressInfo,
            amount,
            message,
            requestLink,
            origin: window.location.origin,
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            AddressType,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Identicon,
        AddressDisplay,
        AmountInput,
        LabelInput,
        QrCodeIcon,
        QrCode,
        Copyable,
    } as any,
});
</script>

<style lang="scss" scoped>
.page-body.address-page {
    justify-content: space-between;
    align-items: center;
    padding-bottom: 3rem;

    .qr-button {
        position: absolute;
        right: 3rem;
        bottom: 3rem;
        font-size: 4rem;
        opacity: 0.4;
        transition: opacity 250ms var(--nimiq-ease);

        svg {
            display: block;
        }
    }

    .qr-button:hover,
    .qr-button:focus {
        opacity: 0.8;
    }

    .identicon {
        width: 18rem;
        margin-top: 3rem;
        margin-bottom: -5rem;
    }

    .copyable {
        padding: 0.5rem;
        background: var(--nimiq-highlight-bg);
        border-radius: 0.625rem;

        transition:
            color .3s var(--nimiq-ease),
            background 0.3s var(--nimiq-ease);

        /deep/ .background {
            display: none;
        }

        .address-display {
            transition: opacity 0.3s var(--nimiq-ease);
            font-weight: 500;
            opacity: 1;
        }

        &:hover,
        &:focus,
        &.copied {
            background: rgba(5, 130, 202, 0.07); // Based on Nimiq Light Blue
        }
    }
}

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

.page-header {
    padding-bottom: 2rem;

    div {
        font-size: var(--body-size);
        line-height: 1.4;
        font-weight: 600;
        opacity: 0.6;
        margin-top: 1rem;
    }
}

.link-overlay {
    &.page-header {
        padding: 4rem 3rem 2rem;
    }

    &.page-body {
        padding: 1rem 3rem 3rem;
        justify-content: space-between;
        align-items: center;
        overflow: visible;

        .dynamic-spacer {
            flex-grow: 1;
            max-height: 1rem;
        }

        .inputs {
            width: calc(100% + 4rem);
            margin: -1rem -2rem 4rem;
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
}
</style>

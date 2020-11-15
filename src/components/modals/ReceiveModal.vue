<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="closeOverlays"
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

        <PaymentLinkOverlay slot="overlay"
            ref="$paymentLinkOverlay"
            v-if="receiveLinkOverlayOpened"
            currency="nim"
            :address="activeAddressInfo.address"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, Ref } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    Identicon,
    AddressDisplay,
    QrCodeIcon,
    QrCode,
    Copyable,
} from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { useAddressStore, AddressType } from '../../stores/Address';
import PaymentLinkOverlay from './overlays/PaymentLinkOverlay.vue';

export default defineComponent({
    name: 'receive-modal',
    setup() {
        const addressQrCodeOverlayOpened = ref(false);
        const receiveLinkOverlayOpened = ref(false);
        const { activeAddressInfo } = useAddressStore();
        const $paymentLinkOverlay: Ref<{ clear(): void } | null> = ref(null);

        function closeOverlays() {
            addressQrCodeOverlayOpened.value = false;
            receiveLinkOverlayOpened.value = false;
            if ($paymentLinkOverlay.value) {
                $paymentLinkOverlay.value.clear();
            }
        }

        return {
            $paymentLinkOverlay,
            activeAddressInfo,
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            AddressType,
            closeOverlays,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Identicon,
        AddressDisplay,
        QrCodeIcon,
        QrCode,
        Copyable,
        PaymentLinkOverlay,
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
</style>

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
                {{ $t('Create request link') }}
            </button>
        </PageBody>

        <QrCodeOverlay slot="overlay" v-if="addressQrCodeOverlayOpened" :address="activeAddressInfo.address"/>

        <PaymentLinkOverlay slot="overlay"
            v-if="receiveLinkOverlayOpened"
            currency="nim"
            :address="activeAddressInfo.address"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
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
import QrCodeOverlay from './overlays/QrCodeOverlay.vue';

export default defineComponent({
    name: 'receive-modal',
    setup() {
        const addressQrCodeOverlayOpened = ref(false);
        const receiveLinkOverlayOpened = ref(false);
        const { activeAddressInfo } = useAddressStore();

        function closeOverlays() {
            addressQrCodeOverlayOpened.value = false;
            receiveLinkOverlayOpened.value = false;
        }

        return {
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
        QrCodeOverlay,
    } as any,
});
</script>

<style lang="scss" scoped>
.page-body.address-page {
    justify-content: space-between;
    align-items: center;
    padding-bottom: 3rem;
    position: relative;

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

        &:hover,
        &:focus {
            opacity: 0.8;
        }
    }

    .identicon {
        width: 18rem;
        margin-top: 3rem;
    }

    .copyable {
        padding: 0.5rem;
        background: var(--nimiq-highlight-bg);
        border-radius: 0.625rem;
        margin: 1rem 0 4rem;

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

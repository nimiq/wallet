<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="closeOverlays"
    >
        <PageHeader :backArrow="!!$route.params.canUserGoBack" @back="back">
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
            <AddressDisplay :address="activeAddressInfo.address" copyable/>
            <button
                v-if="activeAddressInfo.type === AddressType.BASIC"
                @click="receiveLinkOverlayOpened = true"
                @mousedown.prevent
                class="nq-button-s"
            >
                {{ $t('Create request link') }}
            </button>
        </PageBody>

        <QrCodeOverlay v-if="addressQrCodeOverlayOpened"
            slot="overlay"
            :address="activeAddressInfo.address" currency="nim"
        />

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
} from '@nimiq/vue-components';
import { useRouter } from '@/router';
import Modal, { disableNextModalTransition } from './Modal.vue';
import { useAddressStore, AddressType } from '../../stores/Address';
import PaymentLinkOverlay from './overlays/PaymentLinkOverlay.vue';
import QrCodeOverlay from './overlays/QrCodeOverlay.vue';

export default defineComponent({
    name: 'receive-modal',
    setup() {
        const router = useRouter();
        const addressQrCodeOverlayOpened = ref(false);
        const receiveLinkOverlayOpened = ref(false);

        const { activeAddressInfo } = useAddressStore();

        function closeOverlays() {
            addressQrCodeOverlayOpened.value = false;
            receiveLinkOverlayOpened.value = false;
        }

        function back() {
            disableNextModalTransition();
            router.back();
        }

        return {
            activeAddressInfo,
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            AddressType,
            closeOverlays,
            back,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Identicon,
        AddressDisplay,
        QrCodeIcon,
        PaymentLinkOverlay,
        QrCodeOverlay,
    },
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

    .address-display {
        padding: 0.5rem;
        background: var(--nimiq-highlight-bg);
        border-radius: 0.625rem;
        margin: 1rem 0 4rem;
        transition:
            color .3s var(--nimiq-ease),
            background 0.3s var(--nimiq-ease);

        ::v-deep .background {
            display: none;
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

<template>
    <Modal class="receive-modal"
        :showOverlay="addressQrCodeOverlayOpened || receiveLinkOverlayOpened"
        @close-overlay="closeOverlays"
    >
        <PageHeader :backArrow="!!$route.params.canUserGoBack" @back="back">
            {{ $t('Receive USDC') }}
            <div slot="more">{{ $t('Share your address with the sender.') }}</div>
        </PageHeader>
        <PageBody class="flex-column address-page">
            <button
                @click="addressQrCodeOverlayOpened = true"
                class="reset qr-button"
            >
                <QrCodeIcon/>
            </button>
            <UsdcIcon />
            <AddressDisplay :address="address" format="ethereum" :copyable="true"/>

            <div></div> <!-- spacer until another element comes at the bottom -->
            <!-- <button
                @click="receiveLinkOverlayOpened = true"
                @mousedown.prevent
                class="nq-button-s"
            >
                {{ $t('Create request link') }}
            </button> -->
        </PageBody>

        <QrCodeOverlay v-if="addressQrCodeOverlayOpened && address"
            slot="overlay"
            qrPrefix="polygon:" :address="address" currency="usdc"
        />

        <!-- <PaymentLinkOverlay slot="overlay"
            v-if="receiveLinkOverlayOpened && address"
            currency="usdc"
            :address="address"
        /> -->
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    AddressDisplay,
    QrCodeIcon,
} from '@nimiq/vue-components';
import Modal, { disableNextModalTransition } from './Modal.vue';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
// import PaymentLinkOverlay from './overlays/PaymentLinkOverlay.vue';
import QrCodeOverlay from './overlays/QrCodeOverlay.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';

export default defineComponent({
    name: 'usdc-receive-modal',
    setup(props, context) {
        const addressQrCodeOverlayOpened = ref(false);
        const receiveLinkOverlayOpened = ref(false);
        const { addressInfo } = useUsdcAddressStore();
        const address = computed(() => addressInfo.value?.address);
        function closeOverlays() {
            addressQrCodeOverlayOpened.value = false;
            receiveLinkOverlayOpened.value = false;
        }
        function back() {
            disableNextModalTransition();
            context.root.$router.back();
        }
        return {
            address,
            addressQrCodeOverlayOpened,
            receiveLinkOverlayOpened,
            closeOverlays,
            back,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        AddressDisplay,
        QrCodeIcon,
        // PaymentLinkOverlay,
        QrCodeOverlay,
        UsdcIcon,
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

    .usdc {
        width: 16rem;
        margin-top: 3rem;
        color: var(--usdc-blue);
    }

    .copyable {
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

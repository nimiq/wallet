<template>
    <Modal :showOverlay="qrCodeOverlayOpened" class="address-modal" @close-overlay="qrCodeOverlayOpened = false">
        <PageBody class="flex-column">
            <button
                v-if="addressInfo.type === AddressType.BASIC"
                @click="qrCodeOverlayOpened = true"
                class="reset qr-button"
            >
                <QrCodeIcon/>
            </button>
            <Identicon :address="addressInfo.address"/>
            <span class="label">{{ addressInfo.label }}</span>
            <Amount :amount="addressInfo.balance"/>
            <FiatConvertedAmount :amount="addressInfo.balance"/>
            <Copyable :text="address">
                <AddressDisplay :address="addressInfo.address"/>
            </Copyable>
        </PageBody>

        <PageBody class="overlay flex-column" slot="overlay">
            <div class="flex-spacer"></div>
            <QrCode
                :data="addressInfo.address"
                :size="520"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <p class="qr-info-text nq-light-blue">{{ $t('Scan the code to send\nmoney to this address') }}</p>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import {
    PageBody,
    Identicon,
    Copyable,
    AddressDisplay,
    QrCodeIcon,
    QrCode,
} from '@nimiq/vue-components';
import Modal from './Modal.vue';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';

import { useAddressStore, AddressType } from '../../stores/Address';

export default defineComponent({
    name: 'address-info-modal',
    props: {
        address: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const addressInfo = useAddressStore().state.addressInfos[props.address];

        const qrCodeOverlayOpened = ref(false);

        return {
            addressInfo,
            qrCodeOverlayOpened,
            AddressType,
        };
    },
    components: {
        Modal,
        PageBody,
        Identicon,
        Amount,
        FiatConvertedAmount,
        Copyable,
        AddressDisplay,
        QrCodeIcon,
        QrCode,
    } as any,
});
</script>

<style lang="scss" scoped>
.page-body {
    justify-content: center;
    align-items: center;

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
        margin-top: -1rem;
        margin-bottom: 3rem; // 4rem + -1rem
    }

    .label {
        font-size: var(--h1-size);
        font-weight: 600;
        margin-bottom: 3rem;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        text-align: center;
        mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
    }

    .amount {
        font-size: var(--h1-size);
        font-weight: bold;
        line-height: 1;
        color: var(--nimiq-light-blue);
        margin-bottom: 1rem;
    }

    .fiat-amount {
        font-size: var(--h2-size);
        font-weight: 600;
        line-height: 1;
        color: rgba(31, 35, 72, 0.5);
        margin-bottom: 3.5rem;
    }
}

.overlay {
    justify-content: space-evenly;

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
</style>

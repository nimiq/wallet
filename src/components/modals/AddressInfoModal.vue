<template>
    <Modal>
        <SmallPage class="address-info-modal">
            <PageBody class="flex-column">
                <Identicon :address="addressInfo.address"/>
                <span class="label">{{ addressInfo.label }}</span>
                <Amount :amount="addressInfo.balance"/>
                <FiatConvertedAmount :amount="addressInfo.balance"/>
                <Copyable :text="address">
                    <AddressDisplay :address="addressInfo.address"/>
                </Copyable>
            </PageBody>
            <CloseButton @click.prevent="$router.back()" class="top-right" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import {
    CloseButton,
    PageBody,
    SmallPage,
    Identicon,
    Copyable,
    AddressDisplay,
    QrCodeIcon,
    QrCode,
} from '@nimiq/vue-components';
import Modal from './Modal.vue';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';

import { useAddressStore } from '../../stores/Address';

export default createComponent({
    name: 'address-info-modal',
    props: {
        address: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        console.log(props.address);
        const addressInfo = useAddressStore().state.addressInfos[props.address];

        return {
            addressInfo,
        };
    },
    components: {
        Modal,
        SmallPage,
        PageBody,
        CloseButton,
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

<style lang="scss">
.address-info-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-body {
        justify-content: center;
        align-items: center;

        .identicon {
            width: 18rem;
            margin-top: -1rem;
            margin-bottom: 3rem; // 4rem + -1rem
        }

        .label {
            font-size: 3rem;
            font-weight: 600;
            margin-bottom: 3rem;
            white-space: nowrap;
            overflow: hidden;
            width: 100%;
            text-align: center;
            mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
        }

        .amount {
            font-size: 3rem;
            font-weight: bold;
            line-height: 1;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;
        }

        .fiat-amount {
            font-size: 2.5rem;
            font-weight: 600;
            line-height: 1;
            color: rgba(31, 35, 72, 0.5);
            margin-bottom: 3.5rem;
        }

        .copyable {
            margin-bottom: 0;
        }
    }
}
</style>

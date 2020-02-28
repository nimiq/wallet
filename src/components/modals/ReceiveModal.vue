<template>
    <Modal>
        <SmallPage class="receive-modal">
            <PageHeader>Create a request link</PageHeader>
            <template v-if="displayQrCode">
                <PageBody>
                    <QrCode :data="requestLink" />
                </PageBody>
                <PageFooter>
                    <button class="nq-button light-blue" @click="displayQrCode = false">
                        Back to the request Link
                    </button>
                </PageFooter>
            </template>
            <PageBody v-else>
                <Identicon :address="activeAddressInfo.address" />
                <p>{{activeAddressInfo.label}}</p>
                <hr />
                <AmountInput v-model="amount" />
                <labelInput v-model="message" placeholder="add a message" />
                <div class="flex-row">
                    <div class="link"><Copyable>{{origin}}/{{requestLink}}</Copyable></div>
                    <div @click="displayQrCode = true"><QrCode :data="requestLink"/></div>
                </div>
            </PageBody>
            <CloseButton @click.prevent="$router.back()" class="top-right" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed, Ref, ref } from '@vue/composition-api';
import {
    AmountInput,
    CloseButton,
    Copyable,
    Identicon,
    LabelInput,
    PageBody,
    PageFooter,
    PageHeader,
    QrCode,
    SmallPage,
} from '@nimiq/vue-components';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useAddressStore } from '../../stores/Address';

export default defineComponent({
    name: 'receive-modal',
    setup() {
        const amount: Ref<string> = ref(0);
        const message: Ref<string> = ref('');
        const displayQrCode: Ref<boolean> = ref(false);
        const { activeAddressInfo } = useAddressStore();

        const requestLinkOptions: Readonly<Ref<GeneralRequestLinkOptions>> = computed(() => ({
            type: NimiqRequestLinkType.URI,
            amount: Number.parseInt(amount.value, 10),
            currency: Currency.NIM,
            message: message.value,
        }));

        const requestLink = computed(
            () => createRequestLink(activeAddressInfo.value!.address, requestLinkOptions.value),
        );
        return {
            activeAddressInfo,
            amount,
            displayQrCode,
            message,
            requestLink,
            origin: window.location.origin,
        };
    },
    components: {
        AmountInput,
        CloseButton,
        Copyable,
        Identicon,
        LabelInput,
        PageBody,
        PageFooter,
        PageHeader,
        QrCode,
        SmallPage,
        Modal,
    } as any,
});
</script>

<style lang="scss" scoped>
.receive-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-body {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: center;

        .label-input {
            display: flex;
            flex-shrink: 0;
        }

        > .flex-row {
            flex-grow: 0;
            flex-shrink: 1;
            align-items: center;
            max-width: 100%;

            div {
                display: flex;
                flex-grow: 0;
                flex-shrink: 1;
                flex-wrap: wrap;
                overflow-wrap: break-word;
                word-break: break-all;
                margin-right: 1rem;
            }

            canvas {
                display: flex;
                width: 10rem;
                flex-shrink: 0;
                margin-left: 1rem;
            }
        }
    }
}
</style>

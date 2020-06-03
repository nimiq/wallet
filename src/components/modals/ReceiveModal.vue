<template>
    <Modal class="receive-modal">
        <PageHeader>
            {{ $t('Receive Money') }}
            <div slot="more">{{ $t('Share the link or the QR code with the sender.') }}</div>
        </PageHeader>
        <PageBody class="flex-column">
            <button v-if="!isInputsOpen" class="nq-button-s" @click="isInputsOpen = true">
                {{ $t('Set Amount') }}
            </button>
            <div v-else class="inputs">
                <AmountInput v-model="amount" :maxFontSize="5"/>
                <CloseButton class="close-button top-right" @click="isInputsOpen = false, amount = 0"/>
            </div>
            <!-- <AmountInput v-model="amount" />
            <labelInput v-model="message" placeholder="add a message" /> -->
            <QrCode
                :data="requestLink"
                :size="400"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <Copyable :class="{'big': !isInputsOpen}" :text="`${origin}/${requestLink}`">
                {{ origin.replace(/https?:\/\//, '') }}/{{ requestLink }}
            </Copyable>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed, Ref, ref } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    CloseButton,
    AmountInput,
    LabelInput,
    QrCode,
    Copyable,
} from '@nimiq/vue-components';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useAddressStore } from '../../stores/Address';

export default defineComponent({
    name: 'receive-modal',
    setup() {
        const isInputsOpen = ref(false);
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
            isInputsOpen,
            activeAddressInfo,
            amount,
            message,
            requestLink,
            origin: window.location.origin,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        CloseButton,
        AmountInput,
        LabelInput,
        QrCode,
        Copyable,
    } as any,
});
</script>

<style lang="scss" scoped>
.page-header {
    padding-bottom: 2rem;

    div {
        font-size: var(--body-size);
        font-weight: 600;
        opacity: 0.6;
        margin-top: 1em;
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    padding-top: 0;
    padding-bottom: 2rem;
    overflow: visible;

    .nq-button-s {
        flex-shrink: 0;
        margin-bottom: 2rem;
    }

    .inputs {
        width: calc(100% + 4rem);
        border-top: 1px solid rgba(31, 35, 72, 0.1);
        border-bottom: 1px solid rgba(31, 35, 72, 0.1);
        margin: 0 -2rem 2rem;
        padding: 1.25rem 0 1.25rem;
        position: relative;

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

        .close-button {
            right: 1rem;
            top: 1rem;
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
        margin-top: 2rem;
        max-width: 100%;
        word-wrap: break-word;
        color: rgba(31, 35, 72, 0.5);
        text-align: center;
        font-size: 2.25rem;

        @media (max-width: 700px) { // Full Mobile Breakpoint
            font-size: 2rem;
        }
    }

    .copyable.big {
        font-size: var(--h1-size);
    }
}
</style>

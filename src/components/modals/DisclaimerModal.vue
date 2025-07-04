<template>
    <Modal class="disclaimer-modal">
        <PageHeader>
            {{ $t('Disclaimer') }}
            <div slot="more" class="more nq-light-blue">
                {{ $t('Always backup your Recovery Words, Password and Login Files.') }}
            </div>
        </PageHeader>
        <PageBody>
            <p class="nq-text">
                <!-- eslint-disable-next-line max-len -->
                {{ $t('Please note that wallet.nimiq.com, hub.nimiq.com & keyguard.nimiq.com are not "hosted wallets". You do not create a hosted account or give Nimiq your funds to hold onto. You hold your keys that control the funds at your account addresses on your device. Nimiq only makes it easy for you, through a browser, to create, save, and access your information and interact with the blockchain.') }}
            </p>
            <p class="nq-text">
                <!-- eslint-disable-next-line max-len -->
                {{ $t('Nimiq is not responsible for any loss. Nimiq, wallet.nimiq.com, hub.nimiq.com & keyguard.nimiq.com, and some of the underlying libraries are under active development.') }}
            </p>
            <p class="nq-text">
                <!-- eslint-disable-next-line max-len -->
                {{ $t('All translations are for information purposes only. The English text is the controlling version.') }}
            </p>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    components: {
        Modal,
        PageHeader,
        PageBody,
    },
});
</script>

<style lang="scss" scoped>
    .modal ::v-deep .small-page {
        height: auto;
        overflow-y: auto;
    }

    .page-body {
        overflow: visible;
    }

    .more {
        font-size: var(--body-size);
        font-weight: 600;
        line-height: 1.4;
        margin-top: 1.5rem;
    }

    .nq-text {
        text-align: center;
        color: inherit;
        line-height: 1.4;
    }
</style>

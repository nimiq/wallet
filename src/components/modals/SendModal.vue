<template>
    <Modal>
        <SmallPage class="send-modal">
            <PageHeader>Send</PageHeader>
            <PageBody>
                <p>Nothing here yet</p>
            </PageBody>
            <CloseButton @click.prevent="$router.back()" class="close-button" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { CloseButton, PageBody, PageHeader, SmallPage } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default createComponent({
    name: 'send-modal',
    components: {
        CloseButton,
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
    },
});
</script>

<style lang="scss" scoped>
.send-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-body {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
    }

    .close-button {
        position: absolute;
        right: 2rem;
        top: 2rem;
    }
}
</style>

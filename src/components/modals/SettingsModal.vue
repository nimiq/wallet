<template>
    <Modal>
        <SmallPage class="settings-modal">
            <PageHeader>Settings</PageHeader>
            <PageBody>
                <button class="nq-button" @click="lsdmode">Funky Mode</button>
            </PageBody>
            <CloseButton @click.prevent="$router.back()" class="close-button" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import { CloseButton, PageBody, PageHeader, SmallPage } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default createComponent({
    name: 'settings-modal',
    setup() {
        const lsdmode = () => {
            document.body.classList.add('inverted');
        };
        return { lsdmode };
    },
    components: {
        CloseButton,
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
    },
});
</script>

<style lang="scss">
.settings-modal {
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

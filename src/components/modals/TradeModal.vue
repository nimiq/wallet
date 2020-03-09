<template>
    <Modal>
        <SmallPage class="trade-modal">
            <PageHeader>Trade</PageHeader>
            <PageBody>
                <p>A fast OASIS will suddenly appear here.</p>
            </PageBody>
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, PageHeader, SmallPage } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    name: 'trade-modal',
    components: {
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
    },
});
</script>

<style lang="scss">
.trade-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-body {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
    }
}
</style>

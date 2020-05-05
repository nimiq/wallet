<template>
    <Modal class="trade-modal">
        <PageHeader>Trade</PageHeader>
        <PageBody class="flex-column">
            <p>A fast OASIS will suddenly appear here.</p>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    name: 'trade-modal',
    components: {
        Modal,
        PageHeader,
        PageBody,
    },
});
</script>

<style lang="scss" scoped>
.page-body {
    justify-content: center;
    align-items: center;
}
</style>

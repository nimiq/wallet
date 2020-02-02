<template>
    <Modal>
        <div class="receive-tx">
            <!-- Put Receive here -->
            <h1>Das ist das Modal</h1>
            <button @click="$router.back()">{{ $t('close') }}</button>
        </div>
    </Modal>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import Modal from './Modal.vue';

export default createComponent({
    name: 'receive-modal',
    components: {
        Modal,
    },
});
</script>

<style lang="scss"></style>

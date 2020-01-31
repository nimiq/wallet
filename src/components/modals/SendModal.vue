<template>
    <Modal>
        <div class="send-tx">
            <!-- Put Send here -->
            <h1>Das ist das Modal</h1>
            <button @click="$router.back()">close</button>
        </div>
    </Modal>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import Modal from './Modal.vue';

export default createComponent({
    name: 'send-modal',
    components: {
        Modal,
    },
});
</script>

<style lang="scss"></style>

<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="stake-modal">
        <template v-if="page === 1">
            <StakeInfoPage @next="page += 1"/>
        </template>
        <template v-if="page === 2">
            <StakeValidatorPage @back="page -= 1" @next="page += 1"/>
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import Modal from '../modals/Modal.vue';
import StakeInfoPage from './StakeInfoPage.vue';
import StakeValidatorPage from './StakeValidatorPage.vue';

export default defineComponent({
    setup(props, context) {
        const page = ref(1);
        
        return {
            page,
        };
    },
    components: {
        Modal,
        StakeInfoPage,
        StakeValidatorPage,
    },
});
</script>

<style lang="scss" scoped>
    // .modal /deep/ .small-page {
    //     height: auto;
    //     overflow-y: auto;
    // }
    
    .modal /deep/ .page-header-back-button {
        margin-top: 3.25rem;
        margin-left: 1rem;
    }
</style>

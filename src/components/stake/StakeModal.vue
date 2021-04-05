<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="stake-modal">
        <template v-if="page === 1">
            <StakeInfoPage @next="page += 1"/>
        </template>
        <template v-if="page === 2">
            <!--
            <PageHeader :backArrow="page > 1" @back="page -= 1">
                {{ $t('Choose a Validator') }}
            </PageHeader>
            <PageBody>
                
            </PageBody>
            -->
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import Modal from '../modals/Modal.vue';
import StakeInfoPage from './StakeInfoPage.vue';

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
    },
});
</script>

<style lang="scss" scoped>
    // .modal /deep/ .small-page {
    //     height: auto;
    //     overflow-y: auto;
    // }
</style>

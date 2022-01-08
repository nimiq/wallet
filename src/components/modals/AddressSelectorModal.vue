<template>
    <Modal>
        <PageHeader>
            <template v-if="path === '/send'">
                {{ $t("Choose a Sender")}}
            </template>
            <template v-else-if="path === '/receive'">
                {{ $t("Choose a Receiver")}}
            </template>
            <template v-else>
                {{ $t("Choose an Address")}}
            </template>
        </PageHeader>
        <PageBody>
            <AddressList
                embedded
                showBitcoin
                @address-selected="addressSelected"
            />
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { PageBody, PageHeader } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import Modal, { disableNextModalTransition } from './Modal.vue';
import AddressList from '../AddressList.vue';
import { useAccountStore } from '../../stores/Account';

export default defineComponent({
    setup(props, context) {
        const { activeCurrency } = useAccountStore();

        const { path } = context.root.$router.currentRoute;

        function addressSelected() {
            disableNextModalTransition();

            context.root.$router.push(`${path}/${activeCurrency.value}`);
        }

        return {
            path,
            addressSelected,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        AddressList,
    },
});
</script>

<style lang="scss" scoped>
.page-header {
    padding-bottom: 1.5rem;
}

.page-body {
    padding: 0.375rem 2rem 1.5rem;
}
</style>

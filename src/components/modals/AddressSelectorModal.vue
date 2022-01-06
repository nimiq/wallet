<template>
    <Modal>
        <PageHeader class="header__address-list">
            <span v-if="path === '/send'">
                {{ $t("Choose a Sender")}}
            </span>
            <span v-else-if="path === '/receive'">
                {{ $t("Choose a Receiver")}}
            </span>
            <span v-else>
                {{ $t("Choose an Address")}}
            </span>
        </PageHeader>
        <PageBody class="page__address-list">
        <AddressList
            embedded
            @address-selected="addressSelected"
            :showBitcoin="true"
        />
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { useAccountStore } from '@/stores/Account';
import { PageBody, PageHeader } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import AddressList from '../AddressList.vue';
import Modal, { disableNextModalTransition } from './Modal.vue';

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
    padding-bottom: 2rem;

    div {
        font-size: var(--body-size);
        line-height: 1.4;
        font-weight: 600;
        opacity: 0.6;
        margin-top: 1rem;
    }
}
// Not sure if this goes here
.header__address-list {
  padding-bottom: 1.5rem;
}

// Not sure if this goes here
.page__address-list {
  --padding-sides: 2rem;
  padding: 0.375rem var(--padding-sides) 1.5rem;
}
</style>

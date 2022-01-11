<template>
    <Modal>
        <PageHeader>
            <template v-if="name === 'send'">
                {{ $t("Choose a Sender")}}
            </template>
            <template v-else-if="name === 'receive'">
                {{ $t("Choose a Recipient")}}
            </template>
            <template v-else>
                {{ $t("Choose an Address")}}
            </template>
        </PageHeader>
        <PageBody>
            <AddressList
                embedded
                :showBitcoin="hasBitcoinAddresses"
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
        const { activeCurrency, hasBitcoinAddresses } = useAccountStore();

        const { name } = context.root.$router.currentRoute;

        function addressSelected() {
            disableNextModalTransition();

            context.root.$router.push({
                name: `${name}-${activeCurrency.value}`,
                params: {
                    // It has to be a string since it is a value encapsulated in Location.params
                    // which is Dictionary<string>. Using a 'false' value will lead to the same
                    // behaviour
                    canUserGoBack: 'true',
                },
            });
        }

        return {
            name,
            addressSelected,
            hasBitcoinAddresses,
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
    display: flex;
    flex-direction: column;

    .address-list {
        flex-grow: 1;
    }
}
</style>

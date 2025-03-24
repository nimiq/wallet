<template>
    <Modal>
        <PageHeader>
            <template v-if="$route.name === 'send'">
                {{ $t("Choose a Sender")}}
            </template>
            <template v-else-if="$route.name === 'receive'">
                {{ $t("Choose a Recipient")}}
            </template>
            <template v-else>
                {{ $t("Choose an Address")}}
            </template>
        </PageHeader>
        <PageBody>
            <AddressList
                embedded
                :showBitcoin="hasBitcoinAddresses && $config.enableBitcoin"
                :showStablecoin="hasPolygonAddresses && $config.polygon.enabled && stablecoin"
                @address-selected="addressSelected"
            />
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { PageBody, PageHeader } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import { useRoute, useRouter } from '@/router';
import Modal, { disableNextModalTransition } from './Modal.vue';
import AddressList from '../AddressList.vue';
import { useAccountStore } from '../../stores/Account';
import { useAccountSettingsStore } from '../../stores/AccountSettings';

export default defineComponent({
    setup() {
        const { activeCurrency, hasBitcoinAddresses, hasPolygonAddresses } = useAccountStore();
        const { stablecoin } = useAccountSettingsStore();

        const router = useRouter();

        function addressSelected() {
            disableNextModalTransition();

            router.push({
                name: `${useRoute().name}-${activeCurrency.value}`,
                params: {
                    // It has to be a string since it is a value encapsulated in Location.params
                    // which is Dictionary<string>. Using a 'false' value will lead to the same
                    // behaviour
                    canUserGoBack: 'true',
                },
            });
        }

        return {
            addressSelected,
            hasBitcoinAddresses,
            hasPolygonAddresses,
            stablecoin,
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

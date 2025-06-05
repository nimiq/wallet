<template>
    <div class="select-account-overlay flex-column">
        <PageHeader>
            {{ $t("Choose an Address")}}
        </PageHeader>
        <PageBody class="flex-column">
            <AddressList embedded :requiredBalance="1" @address-selected="selectAddress" />
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { useAccountStore } from '../../stores/Account';
import { CryptoCurrency } from '../../lib/Constants';
import AddressList from '../AddressList.vue';

export default defineComponent({
    setup(props, context) {
        const { addressInfos, activeAddress, selectAddress } = useAddressStore();
        const { activeCurrency } = useAccountStore();

        const selectNIMAddress = (address: string) => {
            selectAddress(address);
            context.emit('selected');
        };

        const root = ref<HTMLElement>(null);
        const scrollbarVisible = ref(false);
        onMounted(() => {
            watch(addressInfos, () => {
                scrollbarVisible.value = !!root.value && root.value.offsetWidth > root.value.scrollWidth;
            });
        });

        return {
            CryptoCurrency,
            activeCurrency,
            addressInfos,
            activeAddress,
            selectAddress: selectNIMAddress,
            scrollbarVisible,
        };
    },
    props: {
    },
    components: {
        PageHeader,
        PageBody,
        AddressList,
    },
});
</script>

<style lang="scss" scoped>
    .select-account-overlay {
        max-height: 100%;
    }

    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        overflow-y: auto;
        padding: 1rem 0 2rem;

        .address-list {
            padding: 0 2rem;
        }
    }

    // @import '../../scss/mixins.scss';

    // .overlay,
    // .overlay .page-body {
    //     height: 100%;
    // }

    // .overlay .page-body {
    //     justify-content: space-evenly;
    //     align-items: center;
    //     min-height: 56rem;

    //     .flex-spacer {
    //         height: 2rem;
    //     }
    // }
</style>

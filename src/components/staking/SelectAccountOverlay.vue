<template>
    <div class="select-account-overlay flex-column">
        <PageHeader>
            {{ $t('Choose an Address') }}
        </PageHeader>
        <PageBody class="flex-column">
            <AddressList embedded :requiredBalance="1" @address-selected="selectAddress" />
        </PageBody>
    </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia';
import { defineComponent, ref, watch, onMounted } from 'vue';
import { CryptoCurrency } from '../../lib/Constants';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import AddressList from '../AddressList.vue';
import PageBody from '../PageBody.vue';
import PageHeader from '../PageHeader.vue';

export default defineComponent({
    setup(props, context) {
        const { accountAddressInfos: addressInfos, activeAddress } = storeToRefs(useAddressStore());
        const { selectAddress } = useAddressStore();
        const { activeCurrency } = storeToRefs(useAccountStore());

        const selectNIMAddress = (address: string) => {
            selectAddress(address);
            context.emit('selected');
        };

        const root = ref<HTMLElement | null>(null);
        const scrollbarVisible = ref(false);
        onMounted(() => {
            watch(
                addressInfos,
                () => {
                    scrollbarVisible.value = !!root.value && root.value.offsetWidth > root.value.scrollWidth;
                },
                { immediate: true, flush: 'post' },
            );
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
    props: {},
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

// @use '../../scss/mixins.scss' as *;

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

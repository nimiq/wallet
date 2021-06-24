<template>
    <div class="overlay">
        <PageBody class="flex-column">
            <div class="address-list" :class="{'has-scrollbar': scrollbarVisible}" ref="root">
                <div class="scroll-mask top"></div>
                <AddressListItem
                    v-for="addressInfo in addressInfos" :key="addressInfo.address"
                    :addressInfo="addressInfo"
                    :class="{
                        'active': activeAddress === addressInfo.address && activeCurrency === CryptoCurrency.NIM,
                    }"
                    @click="selectAddress(addressInfo.address);" />
                <div class="scroll-mask bottom"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { useAccountStore } from '../../stores/Account';
import { CryptoCurrency } from '../../lib/Constants';

import AddressListItem from '../AddressListItem.vue';

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
        PageBody,
        AddressListItem,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

    .overlay,
    .overlay .page-body {
        height: 100%;
    }

    .overlay .page-body {
        justify-content: space-evenly;
        align-items: center;
        min-height: 56rem;

        .flex-spacer {
            height: 2rem;
        }
    }

    .scroll-mask {
        position: sticky;
        height: 3rem;
        flex-shrink: 0;
        z-index: 2;
        pointer-events: none;
        width: calc(100% + 2 * var(--padding-sides));
        margin-left: calc(-1 * var(--padding-sides));

        &.top {
            top: 0;
            background: linear-gradient(var(--bg-base), rgba(244, 244, 244, 0));
            margin-bottom: -0.5rem;
        }

        &.bottom {
            bottom: 0;
            background: linear-gradient(0deg, var(--bg-base), rgba(244, 244, 244, 0));
            margin-top: -0.5rem;
        }
    }

    .address-list {
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-y: auto;
        padding-right: var(--padding-sides);
        margin: 0 calc(-1 * var(--padding-sides));
        color: var(--text-70);

        // To make space for the .active-box leftside box-shadow
        padding-left: var(--padding-sides);

        @extend %custom-scrollbar;
    }
</style>

<template>
    <div class="account-list">
        <button
            v-for="account in Object.values(addressInfos)" :key="account.address"
            class="group flex flex-row w-full text-left items-center p-4 my-1 rounded opacity-50 hover:opacity-100 hover:bg-gray-300"
            :class="activeAddress === account.address && 'opacity-100 bg-gray-300'"
            @click="selectAddress(account.address)"
        >
            <Identicon :address="account.address" class="w-12 h-12 flex-shrink-0"/>
            <span class="font-bold ml-4 flex-grow">{{ account.label }}</span>
            <div v-if="account.balance !== null" class="text-right flex-shrink-0">
                <Amount
                    class="block font-bold leading-tight group-hover:text-green-500"
                    :class="activeAddress === account.address && 'text-green-500'"
                    :amount="account.balance"/>
                <FiatAmount
                    v-if="activeAddress === account.address"
                    class="block text-sm font-semibold opacity-50 leading-tight"
                    :amount="account.balance"/>
            </div>
            <div v-else>???</div>
        </button>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAddressStore } from '../stores/Address'

import Identicon from '@/components/Identicon.vue'
import Amount from '@/components/Amount.vue'
import FiatAmount from '@/components/FiatAmount.vue'

export default createComponent({
    setup() {
        const { addressInfos, activeAddress, selectAddress } = useAddressStore()

        return {
            selectAddress,
            addressInfos,
            activeAddress,
        }
    },
    components: {
        Identicon,
        Amount,
        FiatAmount,
    },
})
</script>

<style lang="scss">
    .account-list {
        display: flex;
        flex-direction: column;
    }
</style>

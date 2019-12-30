<template>
    <div>
        <button
            v-for="account in Object.values(accounts$.accounts)" :key="account.address"
            class="group flex flex-row w-full text-left items-center p-4 my-1 rounded opacity-50 hover:opacity-100 hover:bg-gray-300"
            :class="activeAccount.address === account.address && 'opacity-100 bg-gray-300'"
            @click="selectAccount(account.address)"
        >
            <Identicon :address="account.address" class="w-12 h-12 flex-shrink-0"/>
            <span class="font-bold ml-4 flex-grow">{{ account.label }}</span>
            <div v-if="account.balance !== null" class="text-right flex-shrink-0">
                <Amount
                    class="block font-bold leading-tight group-hover:text-green-500"
                    :class="activeAccount.address === account.address && 'text-green-500'"
                    :amount="account.balance"/>
                <FiatAmount
                    v-if="activeAccount.address === account.address"
                    class="block text-sm font-semibold opacity-50 leading-tight"
                    :amount="account.balance"/>
            </div>
            <div v-else>???</div>
        </button>
        <button class="group flex flex-row w-full text-left items-center p-4 my-1 rounded opacity-50 hover:opacity-100 hover:bg-gray-300" @click="chooseAddress">
            <svg class="nq-icon inline text-5xl opacity-25"><use xlink:href="/img/nimiq-style.icons.svg#nq-hexagon"/></svg>
            <span class="font-bold ml-4 flex-grow">Add Account</span>
        </button>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAccountsStore } from '../stores/Accounts'
import { chooseAddress } from '../hub'

import Identicon from '@/components/Identicon.vue'
import Amount from '@/components/Amount.vue'
import FiatAmount from '@/components/FiatAmount.vue'

export default createComponent({
    setup() {
        const { state: accounts$, activeAccount } = useAccountsStore()

        function selectAccount(address: string) {
            accounts$.activeAccountId = address
        }

        return {
            accounts$,
            activeAccount,
            selectAccount,
            chooseAddress,
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

</style>

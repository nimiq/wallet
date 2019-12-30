<template>
    <div id="app" class="container mx-auto font-sans">
        <Header/>
        <div class="flex flex-row items-start">
            <div class="w-2/5 p-8">
                <!-- Left column -->
                <WalletBalance class="pl-4"/>
                <AccountList class="mt-12"/>
            </div>

            <div class="w-3/5 pr-4">
                <!-- Right column -->
                <div v-if="activeAccount" class="bg-white rounded-lg shadow-xl p-4">
                    <div class="flex flex-row items-center p-4">
                        <Identicon :address="activeAccount.address" class="w-24 h-24 flex-shrink-0"/>
                        <div class="flex-grow overflow-hidden whitespace-no-wrap ml-6">
                            <div class="text-2xl font-semibold">{{ activeAccount.label }}</div>
                            <div class="text-lg font-mono opacity-50">{{ activeAccount.address }}</div>
                        </div>
                        <button class="w-16 flex flex-col flex-shrink-0 items-center m-2 opacity-25 cursor-not-allowed" disabled>
                            <div class="w-1 h-8 bg-blue-600 rounded"></div>
                            <span class="font-bold opacity-75 mt-2">Send</span>
                        </button>
                        <button class="w-16 flex flex-col flex-shrink-0 items-center m-2 opacity-25 cursor-not-allowed" disabled>
                            <div class="w-1 h-8 bg-blue-600 rounded"></div>
                            <span class="font-bold opacity-75 mt-2">Receive</span>
                        </button>
                    </div>

                    <TransactionList/>
                </div>
                <div v-else class="bg-white rounded-lg shadow-xl py-24 text-center">
                    <img src="https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/To_the_stars_qhyy.svg" class="w-2/5 mx-auto mb-8">
                    <span class="opacity-75">Connect your first account:</span>
                    <button @click="chooseAddress" class="block mx-auto px-6 py-2 bg-green-500 text-white rounded-full mt-4 uppercase font-semibold text-lg tracking-wider hover:bg-green-600">Connect</button>
                </div>
            </div>
        </div>
        <Footer/>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAccountsStore } from './stores/Accounts'
import { chooseAddress } from './hub'

import Header from '@/components/Header.vue'
import WalletBalance from '@/components/WalletBalance.vue'
import AccountList from '@/components/AccountList.vue'
import Identicon from '@/components/Identicon.vue'
import TransactionList from '@/components/TransactionList.vue'
import Footer from '@/components/Footer.vue'

export default createComponent({
    name: 'app',
    setup() {
        const { activeAccount } = useAccountsStore()

        return {
            activeAccount,
            chooseAddress,
        }
    },
    components: {
        Header,
        WalletBalance,
        AccountList,
        Identicon,
        TransactionList,
        Footer,
    },
});
</script>

<style lang="scss">

</style>

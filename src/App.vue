<template>
    <div id="app" class="font-sans">
        <main class="flex flex-row justify-around items-start">
            <div class="left-background w-2/5">
                <div class="left-column ml-auto mr-6 w-1/2">
                    <header class="brand flex flex-row text-xl items-center pl-4 pt-6 pb-12">
                        <svg class="nq-icon text-2xl text-orange-400"><use xlink:href="/img/nimiq-style.icons.svg#nq-hexagon"/></svg>
                        <span class="nimiq ml-2 tracking-wider font-bold">NIMIQ</span>
                        <span class="safe ml-1">Safe</span>
                    </header>

                    <WalletBalance class="pl-4"/>
                    <AccountList class="mt-12"/>
                </div><!-- .left-column -->
            </div><!-- .left-background -->

            <div class="right-background bg-white w-3/5">
                <div class="right-column ml-6 mr-auto w-2/3">
                    <nav class="links flex flex-row justify-end items-center pt-6 pr-4 pb-12">
                        <a href="https://nimiq.com/exchanges" target="_blank" class="flex flex-row items-center font-bold opacity-75 mx-4 hover:text-blue-500 hover:opacity-100">
                            <svg class="nq-icon mr-2 text-xl"><use xlink:href="/img/nimiq-style.icons.svg#nq-transfer"/></svg> Get NIM
                        </a>
                        <a href="https://nimiq.com/apps" target="_blank" class="flex flex-row items-center font-bold opacity-75 mx-4 hover:text-blue-500 hover:opacity-100">
                            <svg class="nq-icon mr-2"><use xlink:href="/img/nimiq-style.icons.svg#nq-login"/></svg> Apps
                        </a>

                        <div class="wallet-menu ml-4 opacity-25 cursor-not-allowed">Wallet Menu</div>
                    </nav>

                    <div v-if="activeAccount" class="">
                        <div class="flex flex-row items-center p-4">
                            <Identicon :address="activeAccount.address" class="w-24 h-24 flex-shrink-0"/>
                            <div class="flex-grow overflow-hidden whitespace-no-wrap ml-6">
                                <div class="text-2xl font-semibold">{{ activeAccount.label }}</div>
                                <div class="text-lg font-mono opacity-50">{{ activeAccount.address }}</div>
                            </div>
                            <button class="w-16 flex flex-col flex-shrink-0 items-center m-2" @click="$router.push('/send').catch(error => {})">
                                <div class="w-1 h-8 bg-blue-600 rounded"></div>
                                <span class="font-bold opacity-75 mt-2">Send</span>
                            </button>
                            <button class="w-16 flex flex-col flex-shrink-0 items-center m-2" @click="$router.push('/receive').catch(error => {})">
                                <div class="w-1 h-8 bg-blue-600 rounded"></div>
                                <span class="font-bold opacity-75 mt-2">Receive</span>
                            </button>
                        </div>

                        <TransactionList/>
                    </div>
                    <div v-else class="py-24 text-center">
                        <img src="https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/To_the_stars_qhyy.svg" class="w-2/5 mx-auto mb-8">
                        <span class="opacity-75">Connect your first account:</span>
                        <button @click="chooseAddress" class="block mx-auto px-6 py-2 bg-green-500 text-white rounded-full mt-4 uppercase font-semibold text-lg tracking-wider hover:bg-green-600">Connect</button>
                    </div>

                    <Footer/>
                </div><!-- .right-column -->
            </div><!-- .right-background -->
        </main>
        <router-view/>
    </div><!-- #app -->
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAccountsStore } from './stores/Accounts'
import { chooseAddress } from './hub'

import WalletBalance from '@/components/WalletBalance.vue'
import AccountList from '@/components/AccountList.vue'
import Identicon from '@/components/Identicon.vue'
import TransactionList from '@/components/TransactionList.vue'
import Footer from '@/components/Footer.vue'

export default createComponent({
    name: 'app',
    setup() {
        const { activeAccount } = useAccountsStore();

        return {
            activeAccount,
            chooseAddress,
        };
    },
    components: {
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

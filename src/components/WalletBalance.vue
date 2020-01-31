<template>
    <div>
        <span class="block opacity-50 text-xl">Total Balance</span>
        <Amount class="block font-bold leading-tight text-3xl" :amount="walletBalance" :maxDecimals="2"/>
        <FiatAmount class="block opacity-50" :amount="walletBalance"/>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAccountsStore } from '../stores/Accounts'
import { Amount } from '@nimiq/vue-components'
import FiatAmount from './FiatAmount.vue';

export default createComponent({
    name: 'WalletBalance',
    setup() {
        const { walletBalance } = useAccountsStore()

        return {
            walletBalance,
        }
    },
    components: {
        Amount,
        FiatAmount,
    },
})
</script>

<style lang="scss">

</style>

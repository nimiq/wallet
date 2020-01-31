<template>
    <div class="wallet-balance">
        <h2 class="nq-h1">Total Balance</h2>
        <div class="amount nq-light-blue">
            <Amount :amount="walletBalance" />
        </div>
        <div class="fiat-amount">
            <FiatAmount :amount="123.76" currency="USD" />
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAccountsStore } from '../stores/Accounts'
import { FiatAmount, Amount } from '@nimiq/vue-components';

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
.wallet-balance {
    > span,
    > .fiat-amount > span  {
        opacity: .5;
    }
    > .amount {
        font-size: 4rem;
        font-weight: bold;
    }

}
</style>

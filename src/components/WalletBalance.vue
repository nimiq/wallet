<template>
    <div class="wallet-balance">
        <h2 class="nq-label">Total Balance</h2>
        <div class="fiat-amount">
            <FiatAmount :amount="walletBalance" />
        </div>
        <BalanceDistribution />
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { useAccountsStore } from '../stores/Accounts';
import FiatAmount from './FiatAmount.vue';
import BalanceDistribution from './BalanceDistribution.vue';

export default createComponent({
    name: 'WalletBalance',
    setup() {
        const { walletBalance } = useAccountsStore();

        return {
            walletBalance,
        }
    },
    components: {
        BalanceDistribution,
        FiatAmount,
    },
});
</script>

<style lang="scss">
.wallet-balance {
    .fiat-amount {
        font-size: 8rem;
        margin-bottom: 1rem;
    }
}
</style>

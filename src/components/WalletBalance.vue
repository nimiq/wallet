<template>
    <div class="wallet-balance">
        <h2 class="nq-label" translate>Total Balance</h2>
        <div class="fiat-amount">
            <FiatAmount :amount="accountBalance" />
        </div>
        <BalanceDistribution />
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';
import FiatAmount from './FiatAmount.vue';
import BalanceDistribution from './BalanceDistribution.vue';

export default createComponent({
    name: 'WalletBalance',
    setup() {
        const { accountBalance } = useAddressStore();

        return {
            accountBalance,
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

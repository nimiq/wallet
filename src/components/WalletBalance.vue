<template>
    <div class="wallet-balance">
        <h2 class="nq-label">{{ $t('Total Balance') }}</h2>
        <div class="fiat-amount">
            <FiatConvertedAmount :amount="accountBalance" />
        </div>
        <BalanceDistribution />
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import BalanceDistribution from './BalanceDistribution.vue';

export default createComponent({
    name: 'WalletBalance',
    setup() {
        const { accountBalance } = useAddressStore();

        return {
            accountBalance,
        };
    },
    components: {
        BalanceDistribution,
        FiatConvertedAmount,
    },
});
</script>

<style lang="scss" scoped>
.wallet-balance {
    .nq-label {
        margin-bottom: 0.5rem;
    }

    .fiat-amount {
        font-size: 8rem;
    }
}
</style>

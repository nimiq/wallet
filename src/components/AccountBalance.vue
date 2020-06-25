<template>
    <div class="account-balance">
        <h2 class="nq-label">{{ $t('Total Balance') }}</h2>
        <div class="fiat-amount">
            <FiatConvertedAmount :amount="accountBalance" />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
// re add <BalanceDistribution /> once Bitcoin is avalable
// import BalanceDistribution from './BalanceDistribution.vue';

export default defineComponent({
    setup() {
        const { accountBalance } = useAddressStore();

        return {
            accountBalance,
        };
    },
    components: {
        // BalanceDistribution,
        FiatConvertedAmount,
    },
});
</script>

<style lang="scss" scoped>
.account-balance {
    text-align: center;
}

.nq-label {
    margin-bottom: 0.5rem;
}

.fiat-amount {
    font-size: 7rem;
}

@media (max-width: 1160px) { // Half mobile breakpoint
    .fiat-amount {
        font-size: 5.5rem;
    }
}
</style>

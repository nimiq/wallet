<template>
    <div class="account-stake flex-row">
        <StakingIcon />
        <Amount :amount="accountStake" :currency="CryptoCurrency.NIM" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import Amount from '../Amount.vue';
import { useStakingStore } from '../../stores/Staking';
import { CryptoCurrency } from '../../lib/Constants';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

export default defineComponent({
    setup() {
        const { accountStake } = useStakingStore();

        return {
            accountStake,
            CryptoCurrency,
        };
    },
    components: {
        Amount,
        StakingIcon,
    },
});
</script>

<style lang="scss" scoped>
.account-stake {
    align-items: center;
    padding: 0 1.25rem;
    border-radius: 5rem;
    color: var(--nimiq-green);
    box-shadow: 0 0 0 1.5px rgba(19, 181, 157, 0.4);
}
.staking-icon {
    font-size: 2.75rem;
    margin-right: 0.5rem;

    ::v-deep path {
        stroke-width: 1;
    }
}

.amount {
    font-size: var(--small-size);
    line-height: 1;
    font-weight: bold;
}

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    .nq-label {
        display: none;
    }
}
</style>

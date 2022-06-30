<template>
    <div class="account-stake flex-row">
        <StakingIcon />
        <span class="nq-label">{{ $t('Staked') }}</span>
        <!-- <div class="flex-grow"> -->
        <Amount :amount="accountStake" :currency="CryptoCurrency.NIM" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import Amount from '../Amount.vue';
import { useStakingStore } from '../../stores/Staking';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import { CryptoCurrency } from '../../lib/Constants';

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
}

.staking-icon {
    font-size: 3rem;
    color: var(--text-40);
    margin-right: 0.5rem;

    ::v-deep path {
        stroke-width: 1;
    }
}

.amount {
    margin: 0.25rem 0.75rem 0.25rem auto;
    font-size: var(--small-size);
    line-height: 1;
    font-weight: bold;
    color: var(--nimiq-green);
    box-shadow: 0 0 0 1.5px rgba(19, 181, 157, 0.4);
    border-radius: 5rem;
    padding: 0.5rem 1.25rem;
}

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    .nq-label {
        display: none;
    }
}
</style>

<template>
    <div class="account-stake flex-row" title="Account stake">
        <TwoLeafStakingIcon />
        <Amount :amount="totalAccountStake" :currency="CryptoCurrency.NIM" value-mask/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Amount from '../Amount.vue';
import { useStakingStore } from '../../stores/Staking';
import { CryptoCurrency } from '../../lib/Constants';
import TwoLeafStakingIcon from '../icons/Staking/TwoLeafStakingIcon.vue';

export default defineComponent({
    setup() {
        const { totalAccountStake } = useStakingStore();

        return {
            totalAccountStake,
            CryptoCurrency,
        };
    },
    components: {
        Amount,
        TwoLeafStakingIcon,
    },
});
</script>

<style lang="scss" scoped>
.account-stake {
    align-items: center;
    padding: 0.5rem 1.25rem;
    border-radius: 5rem;
    color: var(--nimiq-green);
    box-shadow: 0 0 0 1.5px rgba(19, 181, 157, 0.4);
    gap: 0.5rem;
}
.staking-icon {
    font-size: 2.75rem;

    ::v-deep path {
        stroke-width: 1;
    }
}

.amount {
    --size: var(--small-size);
    font-size: var(--size);
    line-height: 1;
    font-weight: bold;
}

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    .nq-label {
        display: none;
    }
}
</style>

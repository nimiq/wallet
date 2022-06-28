<template>
    <button class="staking-preview nq-button-pill green flex-row"
        @click="$router.push('/staking')" @mousedown.prevent>
        <StakingIcon />
        <Amount :amount="stake && stake.balance || 0"/>

        <div class="flex-grow"></div>

        <div class="gain flex-row">
            <template v-if="gain">
                +<Amount :amount="gain"/>
            </template>
            <template v-else-if="validator && 'reward' in validator">
                {{ (validator.reward * 100).toFixed(1) }}% {{ $t("p.a.") }}
            </template>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import Amount from '../Amount.vue';
import { useStakingStore } from '../../stores/Staking';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

export default defineComponent({
    setup() {
        const { activeStake: stake, activeValidator: validator } = useStakingStore();

        // TODO: Calculate gain
        const gain = ref(0);

        return {
            stake,
            validator,
            gain,
        };
    },
    components: {
        StakingIcon,
        Amount,
    },
});
</script>

<style lang="scss" scoped>
.staking-preview {
    align-items: center;
    padding: 0.75rem;
    font-size: var(--large-button-size);
    line-height: 1;
    height: unset;
    border-radius: 5rem;
}

.nq-icon {
    font-size: 3.25rem;
    margin: -0.25rem 0.5rem -0.25rem 0;

    ::v-deep path {
        stroke-width: 1px;
    }
}

.gain {
    align-items: center;
    background: var(--nimiq-white);
    font-size: 1.625rem;
    color: var(--nimiq-green);
    height: 2.75rem;
    border-radius: 5rem;
    padding: 0 1.25rem;
    margin-left: 1.5rem;

    .amount {
        margin-left: 0.25rem;
    }
}
</style>

<template>
    <button class="staking-preview nq-button-pill green flex-row"
        @click="$router.push('/staking')" @mousedown.prevent>
        <!-- The percentages below should also match in AmountSlider.vue -->
        <OneLeafStakingIcon v-if="currentPercentage < 50"/>
        <TwoLeafStakingIcon v-else-if="currentPercentage < 75"/>
        <ThreeLeafStakingIcon v-else/>

        <Amount
            :amount="stake && (stake.activeBalance + stake.inactiveBalance + stake.retiredBalance) || 0"
            value-mask
        />

        <div class="flex-grow"></div>

        <div v-if="showGains" class="gain flex-row">
            <template v-if="gain">
                +<Amount :amount="gain" value-mask />
            </template>
            <template v-else-if="validator && 'annualReward' in validator">
                {{ (validator.annualReward * 100).toFixed(1) }}% {{ $t("p.a.") }}
            </template>
        </div>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import Amount from '../Amount.vue';
import { useStakingStore } from '../../stores/Staking';
import OneLeafStakingIcon from '../icons/Staking/OneLeafStakingIcon.vue';
import TwoLeafStakingIcon from '../icons/Staking/TwoLeafStakingIcon.vue';
import ThreeLeafStakingIcon from '../icons/Staking/ThreeLeafStakingIcon.vue';
import { useAddressStore } from '../../stores/Address';

export default defineComponent({
    props: {
        showGains: {
            type: Boolean,
            default: true,
        },
    },
    setup() {
        const { activeStake: stake, activeValidator: validator } = useStakingStore();
        const { activeAddressInfo } = useAddressStore();

        // TODO: Calculate gain
        const gain = ref(0);

        const currentPercentage = computed(() => {
            const alreadyStakedAmount = stake.value?.activeBalance || 0;
            const availableAmount = (activeAddressInfo.value?.balance || 0) + alreadyStakedAmount;
            const percent = (100 * alreadyStakedAmount) / availableAmount;

            return percent;
        });

        return {
            stake,
            validator,
            gain,
            currentPercentage,
        };
    },
    components: {
        OneLeafStakingIcon,
        TwoLeafStakingIcon,
        ThreeLeafStakingIcon,
        Amount,
    },
});
</script>

<style lang="scss" scoped>
.staking-preview {
    align-items: center;
    padding: 0.75rem;
    --size: var(--large-button-size);
    font-size: var(--size);
    line-height: 1;
    height: 4.25rem;
    border-radius: 5rem;

    & > .amount { margin-right: 1.5rem }
}

.nq-icon {
    font-size: 3.25rem;
}

.one-leaf-staking-icon,
.two-leaf-staking-icon,
.three-leaf-staking-icon {
    margin: -0.25rem 0.5rem -0.25rem 0;

    ::v-deep path {
        stroke-width: 1px;
    }
}

.one-leaf-staking-icon {
    margin: .2rem .35rem -0.25rem .2rem;
}

.gain {
    align-items: center;
    background: var(--nimiq-white);
    --size: 1.625rem;
    font-size: var(--size);
    color: var(--nimiq-green);
    height: 2.75rem;
    border-radius: 5rem;
    padding: 0 1.25rem;

    .amount {
        margin-left: 0.25rem;
    }
}
</style>

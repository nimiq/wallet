<template>
    <div class="staking-graph">
        <img class="graph-image" src="../../assets/staking/staking-graph.svg" alt="staking graph">
        <div class="bubbles" v-if="!loading">
            <div class="bubble">~&nbsp;{{ estimatedRewards['4M'] }}&nbsp;{{ $t('NIM') }}</div>
            <div class="bubble">~&nbsp;{{ estimatedRewards['8M'] }}&nbsp;{{ $t('NIM') }}</div>
            <div class="bubble">~&nbsp;{{ estimatedRewards['12M'] }}&nbsp;{{ $t('NIM') }}</div>
        </div>
        <div class="scale">
            <div class="scale-item">{{ $t('4M') }}</div>
            <div class="scale-item">{{ $t('8M') }}</div>
            <div class="scale-item">{{ $t('12M') }}</div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

import { formatNumber } from '../../lib/NumberFormatting';
import { calculateStakingReward } from '../../lib/AlbatrossMath';
import { useStakingStore } from '../../stores/Staking';

export default defineComponent({
    props: {
        stakedAmount: {
            type: Number,
            required: true,
        },
        fee: {
            type: Number,
            required: true,
        },
    },
    setup(props) {
        const { validatorsList, activeValidator } = useStakingStore();

        const totalStake = computed(() => validatorsList.value.reduce((sum, validator) => sum + validator.balance, 0));
        // assume loading if no validators or total stake is 0
        const loading = computed(() => validatorsList.value.length === 0 || totalStake.value === 0);

        const calculateReward = (months: number): number => {
            const days = months * (365 / 12); // Convert months to approximate days
            const fee = (activeValidator.value && 'fee' in activeValidator.value) ? activeValidator.value.fee : 0;
            const rewardsPercentage = calculateStakingReward(fee, totalStake.value, days);
            const rewards = rewardsPercentage * props.stakedAmount;

            return Math.trunc(rewards / 1e5);
        };

        const estimatedRewards = computed(() => ({
            '4M': formatNumber(calculateReward(4)),
            '8M': formatNumber(calculateReward(8)),
            '12M': formatNumber(calculateReward(12)),
        }));

        return {
            estimatedRewards,
            loading,
        };
    },
});
</script>

<style lang="scss" scoped>
.staking-graph {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(5, 1fr);
}

.graph-image {
    grid-row: 1 / -1;  // Spans all rows
    grid-column: 1 / -1;  // Spans all columns
    width: 100%;
    height: 100%;
}

.bubbles {
    z-index: 1;

    .bubble {
        color: var(--nimiq-green);
        background-color: white;

        border: 2px solid currentColor;
        border-radius: 1.75rem;

        margin: .5rem auto;
        padding: .4rem 1rem;
        min-width: 10rem;

        font-size: 1.75rem;
        font-weight: 700;

        justify-content: center;
        align-content: center;

        position: absolute;
        transform: translate(-50%, -50%);

        &:nth-child(1) {
            top: 72%;
            left: 15%;
        }
        &:nth-child(2) {
            top: 55.5%;
            left: 50%;
        }
        &:nth-child(3) {
            top: 39%;
            left: 85%;
        }
    }
}

.scale {
    display: grid;
    grid-row: 5;  // Last row
    grid-column: 1 / -1;  // Spans all columns
    grid-template-columns: repeat(3, 1fr);

    gap: 3rem;
    z-index: 1;
    padding-top: 1.6rem;

    .scale-item {
        text-align: center;
        align-self: center;

        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 0.8px;

        color: var(--text-40);
    }
}
</style>

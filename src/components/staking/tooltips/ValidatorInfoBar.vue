<template>
    <div @click="$emit('click')" class="validator-info-bar flex-row">
        <ValidatorLabel :validator="validator" />
        <ValidatorTrustScore v-if="'score' in validator && typeof validator.score.total === 'number'"
            :score="validator.score.total" />
        <ValidatorReward v-if="'annualReward' in validator" :reward="validator.annualReward" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Validator } from '../../../stores/Staking';
import ValidatorLabel from './ValidatorLabel.vue';
import ValidatorReward from './ValidatorReward.vue';
import ValidatorTrustScore from './ValidatorTrustScore.vue';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    components: {
        ValidatorLabel,
        ValidatorReward,
        ValidatorTrustScore,
    },
});
</script>

<style lang="scss" scoped>
@import '../../../scss/functions.scss';

.validator-info-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: inset 0 0 0 1.5px nimiq-blue(0.15);
    padding: 0 1.375rem 0 0.75rem;
    border-radius: 5rem;
    white-space: nowrap;
    height: 3.25rem;
    line-height: 3.25rem;
    cursor: pointer;

    > * {
        + *::before {
            display: inline-block;
            margin:0 0.75rem;
            content: ' ';
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background-color: nimiq-blue(0.25);
        }
    }
    ::v-deep {
        > * {
            font-weight: 600;
            font-size: 1.75rem;
        }

        .validator-label {
            color: var(--text-60);
        }

        .validator-icon {
            --size: 2.25rem;
        }
    }
}
</style>

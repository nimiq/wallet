<template>
    <div class="validator-trust-score flex-row"
        :class="{
            'high-score': !dry && score >= 5.0,
            'low-score': !dry && score < 2.5,
            'dry': dry,
        }"
    >
        <StarIcon />
        {{ score.toFixed(2) }}
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import StarIcon from '../../icons/Staking/StarIcon.vue';

export default defineComponent({
    props: {
        score: {
            type: Number,
            required: true,
        },
        dry: Boolean,
    },
    components: {
        StarIcon,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../../scss/functions.scss';

    .validator-trust-score {
        white-space: nowrap;
        align-items: center;
        color: var(--text-50);

        &.dry {
            box-shadow: inset 0 0 0 .1875rem nimiq-blue(0.15);
            padding: 0 1.375rem;
            border-radius: 5rem;
            height: 3.25rem;

            font-size: var(--small-size);
            font-weight: 600;
            color: var(--text-60);
        }

        &.high-score {
            color: var(--nimiq-gold);
        }

        &.low-score {
            color: var(--nimiq-red);
        }
    }

    svg {
        width: 1.5rem;
        height: 1.5rem;
        margin-right: 0.25rem;
        margin-top: -0.125rem;
    }
</style>

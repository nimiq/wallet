<template>
    <div class="validator-trust-score"
        :class="{
            'high-score': !dry && stars >= 4.5,
            'low-score': !dry && stars < 2.5,
            dry,
            borderless,
        }"
    >
        <StarIcon />
        {{ stars.toFixed(2) }}
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import StarIcon from '../../icons/Staking/StarIcon.vue';

export default defineComponent({
    props: {
        score: {
            type: Number,
            required: true,
        },
        dry: Boolean,
        borderless: Boolean,
    },
    setup(props) {
        const stars = computed(() => props.score * 5);

        return {
            stars,
        };
    },
    components: {
        StarIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../../scss/functions.scss';

.validator-trust-score {
    height: 3.125rem;
    line-height: 3.125rem;
    padding: 0 .875rem;
    border-radius: 5rem;
    white-space: nowrap;
    font-size: var(--body-size);
    font-weight: bold;

    --color: var(--text-50);
    --border-color: var(--color);

    color: var(--color);
    box-shadow: 0 0 0 1.5px var(--border-color);

    &.high-score { --color: var(--nimiq-gold)}
    &.low-score { --color: var(--nimiq-red) }

    &.dry {
        --border-color: #{nimiq-blue(0.15)};
        --color: var(--text-60);

        padding: 0 1.375rem;
        height: 3.25rem;
        line-height: 3.25rem;

        font-size: var(--small-size);
        font-weight: 600;
    }

    &.borderless {
        box-shadow: none;
        padding: 0;
    }

    svg {
        width: 1.5rem;
        height: 1.5rem;
        margin-right: 0.25rem;
        margin-top: -0.125rem;
    }
}
</style>

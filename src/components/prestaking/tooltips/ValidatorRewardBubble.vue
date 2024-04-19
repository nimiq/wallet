<template>
    <div class="validator-reward-bubble"
        :class="{
            'validator-warning': (reward * 100) < 2.5,
            'dry': dry,
        }"
    >
        {{ (reward * 100).toFixed(1) }}% {{ $t("p.a.") }}
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        reward: {
            type: Number,
            required: true,
        },
        dry: Boolean,
    },
});
</script>

<style lang="scss" scoped>
@import '../../../scss/functions.scss';

.validator-reward-bubble {
    height: 3.125rem;
    line-height: 3.125rem;
    padding: 0 .875rem;

    --border-color: var(--nimiq-green);
    box-shadow: 0 0 0 1.5px var(--border-color);
    border-radius: 5rem;
    white-space: nowrap;
    color: var(--nimiq-green);
    font-size: var(--body-size);
    font-weight: bold;

    &.validator-warning {
        --border-color: var(--nimiq-orange);
        color: var(--nimiq-orange);
    }

    &.dry {
        --border-color: #{nimiq-blue(0.15)};
        padding: 0 1.375rem;
        height: 3.25rem;
        line-height: 3.25rem;

        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-60);
    }
}
</style>

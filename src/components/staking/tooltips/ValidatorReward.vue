<template>
    <div class="validator-reward flex-row"
        :class="{
            'dry': dry,
            'low-reward': !dry && (reward * 100) < 2.5,
        }"
    >
        {{ (reward * 100).toFixed(2) }}% {{ $t("p.a.") }}
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

.validator-reward {
    white-space: nowrap;
    align-items: center;
    color: var(--text-50);

    &.low-reward { color: var(--nimiq-orange) }

    &.dry {
        box-shadow: inset 0 0 0 .1875rem nimiq-blue(0.15);
        padding: 0 1.375rem;
        border-radius: 5rem;
        height: 3.25rem;

        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-60);
    }
}
</style>

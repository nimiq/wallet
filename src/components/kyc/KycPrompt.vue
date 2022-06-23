<template>
    <div class="kyc-prompt nq-purple-bg">
        <div class="flex-row">
            <KycIcon />
            <h3>{{ $t('Get verified for higher limits') }}</h3>
        </div>
        <p class="explainer">
            {{ $t('Buy, and sell up to {limit} per month.', { limit: '$5000'}) }}
        </p>
        <button
            class="nq-button-pill inverse nq-purple"
            @mousedown.prevent @click="$emit('click')"
        >{{ $t('Get started') }}</button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import KycIcon from '../icons/KycIcon.vue';

export default defineComponent({
    components: {
        KycIcon,
    },
});
</script>

<style lang="scss" scoped>
.kyc-prompt {
    padding: 2rem;
    border-radius: 0.5rem;
    margin: 0 -1.25rem -1rem;
}

.flex-row {
    align-items: center;
}

.nq-icon {
    flex-shrink: 0;
    font-size: 3.625rem;
    margin-right: 1.25rem;
}

h3 {
    font-size: 2rem;
    margin: 0;
}

.nq-button-pill.nq-purple {
    background: white;

    &:hover,
    &:focus {
        background: var(--nimiq-gray);
    }
}
</style>

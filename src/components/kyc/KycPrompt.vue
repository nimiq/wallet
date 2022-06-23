<template>
    <div class="kyc-prompt nq-purple-bg" :class="`layout-${layout}`">
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
    props: {
        layout: {
            type: String,
            default: 'normal',
        },
    },
    components: {
        KycIcon,
    },
});
</script>

<style lang="scss" scoped>
.kyc-prompt {
    padding: 2rem;
    border-radius: 0.5rem;
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
    line-height: 1.2;
}

.nq-button-pill.nq-purple {
    background: white;

    &:hover,
    &:focus {
        background: var(--nimiq-gray);
    }
}

.layout-wide {
    display: grid;
    color: var(--nimiq-white);
    padding: 3rem;

    .kyc-icon {
        font-size: 2.25rem;
    }

    .explainer {
        font-size: var(--small-size);
        opacity: 0.6;
        margin: 0.5em 0 0;
    }

    .nq-button-pill.nq-purple {
        grid-column: 2;
        grid-row: 1 / span 2;
        align-self: center;
        justify-self: end;
        margin-right: 1rem;
    }
}
</style>

<template>
    <button @click="$router.push({ name: RouteName.WalletStatus })" class="wallet-status-button nq-button-pill">
        <CircledQuestionMark />
        <span>{{ $t('Help') }}</span>
    </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouteName } from '@/router';
import CircledQuestionMark from './icons/CircledQuestionMark.vue';

export default defineComponent({
    props: {},
    setup() {
        return {
            RouteName,
        };
    },
    components: {
        CircledQuestionMark,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.wallet-status-button {
    height: 4.25rem;
    border-radius: 2.25rem;

    position: absolute;
    bottom: 2rem;
    right: 2rem;

    display: flex;
    flex-direction: row;
    align-items: center;

    font-size: 2rem;

    svg {
        margin-right: 1rem;
    }
}

@media (max-width: $mobileBreakpoint) {
    .wallet-status-button {
        bottom: 11rem;
    }
}

</style>

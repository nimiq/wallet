<template>
    <div class="staking-summary-mobile nq-green-bg flex-row">
        <StakingButton :asButton="false" :inversePalette="true" />
        <span class="staking-projection-text">
            {{ $t('Earn NIM every month by staking your NIM') }}
        </span>
        <button @click="$router.push({ name: RouteName.Staking })" class="nq-button-s inverse staking-action">
            {{ $t('Stake now') }}
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { RouteName } from '@/router';
import StakingButton from './StakingButton.vue';

export default defineComponent({
    setup() {
        return {
            RouteName,
        };
    },
    components: {
        StakingButton,
    },
});
</script>

<style lang="scss" scoped>
.staking-summary-mobile {
    align-items: center;
    height: 6.75rem;
    border-radius: .75rem;

    ::v-deep svg {
        width: 6.5rem;
        height: 6.5rem;
        position: relative;
        top: .25rem;
        left: .75rem;
    }

    .staking-projection-text {
        width: 19.375rem;
        margin-left: 3rem;
        font-weight: 700;
        font-size: 1.625rem;
        line-height: 2.275rem;
    }

    .staking-action {
        margin-left: auto;
        margin-right: 2.75rem;
    }
}
</style>

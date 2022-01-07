<template>
    <div class="staking-summary">
        <StakeButtonPartial :asButton="false" :inversePalette="true" />
        <span class="staking-projection-text">
            {{ $t('Earn ~304 NIM a month by staking your NIM') }}
        </span>
        <button @click="$router.push('/stake')" class="nq-button-s inverse staking-action">
            {{ $t('Stake now') }}
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import StakeButtonPartial from './StakeButtonPartial.vue';

export default defineComponent({
    setup() {
        return {};
    },
    components: {
        StakeButtonPartial,
    },
});
</script>

<style lang="scss" scoped>
.staking-summary {
    display: flex;
    flex-direction: row;
    height: 6.75rem;
    margin-top: 1.25rem;
    border-radius: .75rem;
    background: radial-gradient(100% 100% at 100% 100%, #41A38E 0%, #21BCA5 100%);
    /deep/ svg {
        width: 6.5rem;
        height: 6.5rem;
        position: relative;
        top: .125rem;
        left: .75rem;
    }
    .staking-projection-text {
        width: 19.375rem;
        height: 6.75;
        padding: 1rem 0rem;
        margin-left: 3rem;
        color: white;
        font-weight: 700;
        font-size: 1.625rem;
        line-height: 2.275rem;
    }
    .staking-action {
        position: absolute;
        right: 2.75rem;
        color: white;
        font-weight: 700;
        font-size: 1.625rem;
        line-height: 130%;
        margin-top: 1.5rem;
        margin-left: 2.5rem;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 1.6875rem;
    }
}
</style>

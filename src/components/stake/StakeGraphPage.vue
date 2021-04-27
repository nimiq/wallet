<template>
    <div>
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                <br />
                {{ $t('Set an Amount') }}
            </template>
            <template #more>
                <span class="nq-text nq-blue">
                    {{ $t('Use the slider to lock your NIM and earn rewards.') }}
                </span>
            </template>
        </PageHeader>
        <PageBody>
            <StakingGraph />
            <StakeAmountSlider />
            <button class="nq-button light-blue stake-button" @click="$emit('next')">
                {{ $t('confirm stake') }}
            </button>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, onUnmounted } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import StakingGraph from './graph/StakingGraph.vue';
import StakeAmountSlider from './StakeAmountSlider.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

export default defineComponent({
    setup() {
        const page = document.querySelector<HTMLElement>('.small-page');
        if (page !== null) {
            page.style.width = '63.5rem';
        }
        onUnmounted(() => {
            if (page !== null) {
                page.style.removeProperty('width');
            }
        });
    },
    components: {
        PageHeader,
        PageBody,
        StakingIcon,
        StakingGraph,
        StakeAmountSlider,
    },
});
</script>

<style lang="scss" scoped>
    .page-header {
        padding-top: .75rem;
        height: 17rem;
    }
    .page-body {
        padding-left: 0;
        padding-right: 0;
        height: 56rem;
        overflow: hidden;

        .stake-button {
            margin: auto;
            margin-top: 5.5rem;
            margin-bottom: -1rem;
            width: 32rem;
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1rem;
        font-size: 2rem;
    }
</style>

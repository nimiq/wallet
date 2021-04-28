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
            <StakeAmountSlider class="stake-amount-slider" />
            <button class="nq-button light-blue stake-button" @click="$emit('next')">
                {{ $t('confirm stake') }}
            </button>
            <div class="stake-unstake-disclaimer">
                {{ unstakeDisclaimer }}
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, onUnmounted } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import StakingGraph from './graph/StakingGraph.vue';
import StakeAmountSlider from './StakeAmountSlider.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import { i18n } from '../../i18n/i18n-setup';

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
        return {
            unstakeDisclaimer: i18n.t(
                '{amount} NIM will be available within ~{unstakeDelay}',
                { amount: '1928', unstakeDelay: '12 hours' },
            ),
        };
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
        font-weight: 600;
    }
    .page-body {
        padding-left: 0;
        padding-right: 0;
        height: 57.875rem;
        overflow: hidden;

        .stake-amount-slider {
            margin-top: 12.125rem;
        }

        .stake-button {
            margin: auto;
            margin-top: 2rem;
            width: 40.5rem;
        }

        .stake-unstake-disclaimer {
            margin-top: 2rem;
            font-size: 1.75rem;
            font-weight: 600;
            color: #0582CA;
            text-align: center;
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1rem;
        font-size: 2rem;
    }
</style>

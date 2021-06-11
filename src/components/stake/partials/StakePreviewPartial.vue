<template>
    <span v-if="visible">
        <div class="stake-preview"
            :class="{ dark: validator.unstakePending }">
            <div class="stake-preview-background"
                :class="{ dark: validator.unstakePending }">
                <img :src="validator.unstakePending
                    ? '/img/staking/graph-preview-white.png'
                    : '/img/staking/graph-preview-black.png'" />
            </div>
            <div class="stake-preview-layout">
                <div class="col">
                    <div class="top-left">
                        <StakingIcon /> staked
                    </div>
                    <div class="bottom-left">
                        {{ formatAmount(validator.stakedAmount, NIM_MAGNITUDE) }} NIM
                    </div>
                </div>
                <div class="col">
                    <div class="top-right">
                        + {{ formatAmount(validator.unclaimedReward, NIM_MAGNITUDE) }} NIM
                    </div>
                    <div class="bottom-right" @click="$router.push('/stake')">
                        Edit &gt;
                    </div>
                </div>
            </div>
        </div>
    </span>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { useStakingStore } from '../../../stores/Staking';
import { formatAmount } from '../../../lib/NumberFormatting';

import StakingIcon from '../../icons/Staking/StakingIcon.vue';
import { NIM_MAGNITUDE } from '../../../lib/Constants';

export default defineComponent({
    setup() {
        const { activeValidator } = useStakingStore();
        const validator = activeValidator;
        const visible = computed(() => validator.value && validator.value.stakedAmount > 0);

        return {
            visible,
            validator,
            formatAmount,
            NIM_MAGNITUDE,
        };
    },
    components: {
        StakingIcon,
    },
});
</script>

<style lang="scss" scoped>
    .stake-preview {
        position: relative;
        margin-left: 6rem;
        margin-bottom: 3rem;
        width: 52.375rem;
        height: 10.25rem;
        background: radial-gradient(100% 100% at 100% 100%, #41A38E 0%, #21BCA5 100%);
        border-radius: .75rem;
        &.dark {
            background: #1F2348;
            opacity: 0.6;
        }
        .stake-preview-background {
            position: absolute;
        }
        .stake-preview-layout {
            display: flex;
            width: 100%;
            height: 100%;
            flex-direction: row;
            color: white;
            .col {
                display: flex;
                flex-direction: column;
                width: 50%;
            }
            .top-left {
                font-size: 1.75rem;
                line-height: 1.75rem;
                letter-spacing: 0.125rem;
                text-transform: uppercase;
                svg {
                    height: 2rem;
                    width: 2rem;
                    line, path {
                        stroke: white;
                    }
                }
            }
            .top-right {
                color: var(--nimiq-green);
                padding: .5rem 1.375rem 1.25rem 1.25rem;
                background: white;
                box-shadow: 0rem 0.40082625rem 1.6033rem rgba(0, 0, 0, 0.07),
                            0rem 0.15031rem 0.30062rem rgba(0, 0, 0, 0.05),
                            0rem 0.03377075rem 0.20041375rem rgba(0, 0, 0, 0.0254662);
                border-radius: 2.4049625rem;
            }
            .bottom-left {
                font-weight: bold;
                font-size: 2.5rem;
                line-height: 100%;
            }
            .bottom-right {
                font-weight: 600;
                font-size: 1.75rem;
                line-height: 2.625rem;
            }
        }
    }
</style>

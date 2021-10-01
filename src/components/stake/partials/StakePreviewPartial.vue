<template>
    <span v-if="stake">
        <div class="stake-preview"
            :class="{ dark: stake.inactiveStake }">
            <div class="stake-preview-background"
                :class="{ dark: stake.inactiveStake }">
                <img :src="stake.inactiveStake
                    ? '/img/staking/graph-preview-white.png'
                    : '/img/staking/graph-preview-black.png'" />
            </div>
            <div class="stake-preview-layout">
                <div class="col">
                    <div class="top-left">
                        <StakingIcon /> staked
                    </div>
                    <div class="bottom-left">
                        <Amount :amount="stake.activeStake"/>
                    </div>
                </div>
                <div class="col">
                    <div class="top-right">
                        <Amount :amount="0"/>
                    </div>
                    <div class="bottom-right">
                        <a href="javascript:void(0)"
                            @click="$router.push('/stake')">
                            Edit <img src='/img/staking/arrow-right.svg' />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </span>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { useStakingStore } from '../../../stores/Staking';
import StakingIcon from '../../icons/Staking/StakingIcon.vue';

export default defineComponent({
    setup() {
        const { activeValidator: validator, activeStake: stake } = useStakingStore();

        return {
            validator,
            stake,
        };
    },
    components: {
        StakingIcon,
        Amount,
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
                padding-top: 1.125rem;
                padding-left: 1.25rem;
                letter-spacing: 0.125rem;
                text-transform: uppercase;
                svg {
                    position: relative;
                    top: .75rem;
                    left: .5rem;
                    width: 3rem;
                    height: 3rem;
                    margin-right: .25rem;
                    line, path {
                        stroke: white;
                        stroke-width: 1;
                    }
                }
            }
            .top-right {
                position: absolute;
                top: 2.125rem;
                right: 2rem;
                display: flex;
                align-self: center;
                color: var(--nimiq-green);
                padding: .25rem 1.25rem;
                background: white;
                font-weight: bold;
                font-size: 2rem;
                line-height: 125%;
                box-shadow: 0rem 0.40082625rem 1.6033rem rgba(0, 0, 0, 0.07),
                            0rem 0.15031rem 0.30062rem rgba(0, 0, 0, 0.05),
                            0rem 0.03377075rem 0.20041375rem rgba(0, 0, 0, 0.0254662);
                border-radius: 2.4049625rem;
            }
            .bottom-left {
                margin-top: 1.25rem;
                margin-left: 2.25rem;
                font-weight: bold;
                font-size: 2.5rem;
                line-height: 100%;
            }
            .bottom-right {
                position: absolute;
                top: 6.375rem;
                right: 2.25rem;
                font-weight: 600;
                font-size: 1.75rem;
                line-height: 2.625rem;
                z-index: 1;
                a {
                    color: white;
                    text-decoration: none;
                }
                img {
                    padding-left: .25rem;
                }
            }
        }
    }
</style>

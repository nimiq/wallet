<template>
    <div v-if="stake && stake.balance" class="stake-preview">
        <div class="stake-preview-background">
            <img src="/img/staking/graph-preview-black.svg" alt="Staking Graph Preview" />
        </div>
        <div class="stake-preview-layout flex-row">
            <div class="col flex-column">
                <div class="top-left flex-row">
                    <StakingIcon /> <span class="nq-label">{{ $t('Staked') }}</span>
                </div>
                <Amount :amount="stake.balance" class="bottom-left"/>
            </div>
            <div class="col right flex-column">
                <Amount class="top-right" :amount="0"/>
                <div class="bottom-right">
                    <a href="javascript:void(0)"
                        @click="$router.push('/staking')">
                        Edit <img src='/img/staking/arrow-right.svg' alt="" />
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

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
        width: 52.375rem;
        height: 10.25rem;
        background: var(--nimiq-green-bg);
        border-radius: .75rem;

        .stake-preview-background {
            position: absolute;
            top: 0;
            right: 0;
        }

        .stake-preview-layout {
            padding: 2rem;
            width: 100%;
            height: 100%;
            color: white;
            position: relative;

            .col {
                width: 50%;
                justify-content: space-between;

                &.right {
                    align-items: flex-end;
                    margin-bottom: -0.5rem;
                }
            }

            .top-left {
                align-items: center;

                svg {
                    margin-right: .25rem;
                    line, path {
                        stroke: white;
                        stroke-width: 1;
                    }
                }

                .nq-label {
                    color: inherit;
                    margin: 0;
                }
            }

            .top-right {
                color: var(--nimiq-green);
                padding: .25rem 1.25rem;
                background: white;
                font-weight: bold;
                font-size: var(--body-size);
                line-height: 125%;
                box-shadow: 0rem 0.40082625rem 1.6033rem rgba(0, 0, 0, 0.07),
                            0rem 0.15031rem 0.30062rem rgba(0, 0, 0, 0.05),
                            0rem 0.03377075rem 0.20041375rem rgba(0, 0, 0, 0.0254662);
                border-radius: 5rem;
            }

            .bottom-left {
                font-weight: bold;
                font-size: var(--h2-size);
            }

            .bottom-right {
                font-weight: 600;
                font-size: var(--label-size);

                a {
                    color: inherit;
                    text-decoration: none;
                }

                img {
                    padding-left: .25rem;
                }
            }
        }

        &.dark {
            background: var(--text-60);

            .stake-preview-background {
                opacity: 0.4;
            }

            .top-right {
                color: var(--text-60);
            }
        }
    }
</style>

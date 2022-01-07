<template>
    <div class="stake-graph-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Set an Amount') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Use the slider to lock your NIM and earn rewards.') }}
                </p>
                <div v-if="validator" class="tooltip-bar flex-row">
                    <LabelTooltip :validatorData="validator" />
                    <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" dry />
                    <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" dry />
                </div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <span class="estimated-rewards-overlay">
                <Tooltip
                    preferredPosition="bottom right"
                    :styles="{'width': '32rem', 'margin-left': '-6rem'}"
                    :container="this"
                >
                    <div slot="trigger" class="flex-row">
                        Estimated rewards <InfoCircleSmallIcon />
                    </div>

                    <img src="/img/staking/estimated-rewards-projection.svg" />
                    <p>
                        Your reward is depending on how many people stake.
                        The less people stake, the higher your rewards.
                    </p>
                    <p class="explainer">
                        The corridor assumes that between 20% and 80% of all NIM holders stake.
                    </p>
                </Tooltip>
            </span>
            <StakingGraph
                :stakedAmount="newStake" :apy="validator && 'reward' in validator ? validator.reward : 0"
                :period="{
                    s: NOW,
                    p: 12,
                    m: MONTH,
                }"
            />

            <StakeAmountSlider class="stake-amount-slider"
                :stakedAmount="activeStake ? activeStake.activeStake : 0"
                @amount-staked="updateStaked"
            />

            <div>
                <button class="nq-button light-blue stake-button" @click="performStaking">
                    {{ $t('Confirm stake') }}
                </button>

                <div class="disclaimer stake-disclaimer" v-if="stakeDelta >= 0">
                    {{ $t('Unlock at any time. Your NIM will be available within {hours} hours.', { hours: 12 }) }}
                </div>
                <div class="disclaimer unstake-disclaimer" v-else>
                    <Amount :amount="-stakeDelta" :decimals="DISPLAYED_DECIMALS" />
                    {{ unstakeDisclaimer }}
                </div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';

import StakingGraph, { NOW, MONTH } from './graph/StakingGraph.vue';
import StakeAmountSlider from './StakeAmountSlider.vue';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

import LabelTooltip from './tooltips/LabelTooltip.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';

import { CryptoCurrency } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';

export default defineComponent({
    setup(props, context) {
        const { activeAddress } = useAddressStore();
        const { activeStake, activeValidator, setStake } = useStakingStore();

        const newStake = ref(activeStake.value ? activeStake.value.activeStake : 0);
        const stakeDelta = ref(0);

        function updateStaked(amount: number) {
            newStake.value = amount;
            stakeDelta.value = amount - (activeStake.value?.activeStake || 0);
        }

        function performStaking() {
            // TODO: Trigger transaction signing

            const currentStake = activeStake.value || {
                address: activeAddress.value!,
                activeStake: 0,
                inactiveStake: 0,
                validator: activeValidator.value!.address,
            };

            setStake({
                ...currentStake,
                activeStake: newStake.value,
                inactiveStake: stakeDelta.value < 0 ? -stakeDelta.value : 0,
            });

            context.emit('next');
        }

        return {
            NOW,
            MONTH,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(stakeDelta.value, CryptoCurrency.NIM),
            unstakeDisclaimer: context.root.$t(
                'will be available in ~{duration}.',
                { duration: context.root.$t('{hours} hours', { hours: 12 }) },
            ),
            activeStake,
            validator: activeValidator,
            newStake,
            stakeDelta,
            updateStaked,
            performStaking,
        };
    },
    components: {
        PageHeader,
        PageBody,
        LabelTooltip,
        ValidatorTrustScore,
        ValidatorRewardBubble,
        StakingIcon,
        StakingGraph,
        StakeAmountSlider,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    .stake-graph-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 3rem;

        .tooltip-bar {
            justify-content: center;

            > * + * {
                margin-left: 0.75rem;
            }
        }
    }
    .page-body {
        padding: 0 0 2rem 0;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;

        .estimated-rewards-overlay {
            position: absolute;
            top: 2.675rem;
            left: 1.5rem;
            z-index: 900;

            /deep/ .trigger {
                line-height: 1.2;
                font-size: var(--small-size);
                font-weight: 600;
                color: var(--text-40);
                background: white;
                padding: 0.25rem 0.5rem;

                div {
                    align-items: center;

                    svg {
                        margin-left: 0.5rem;
                    }
                }
            }
        }

        // .stake-amount-slider {}

        .stake-button {
            width: 40.5rem;
        }

        .disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: var(--small-size);
            text-align: center;
        }

        .stake-disclaimer {
            color: var(--text-50);
        }

        .unstake-disclaimer {
            color: var(--nimiq-light-blue);
        }
    }

    .nq-text {
        margin: 1rem 0 1.5rem;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

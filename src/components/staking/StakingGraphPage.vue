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
                    <LabelTooltip :validator="validator" @click="$emit('changeValidator')" />
                    <!-- <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" dry />
                    <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" dry /> -->
                </div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <div style="height: 150px; background: gainsboro;"></div>

            <AmountSlider
                :stakedAmount="activeStake ? activeStake.activeBalance : 0"
                @amount-staked="updateStaked"
            />

            <div>
                <button
                    class="nq-button light-blue stake-button"
                    :disabled="!stakeDelta || isStakeBelowMinimum"
                    @click="performStaking"
                >
                    {{ $t('Confirm stake') }}
                </button>

                <MessageTransition>
                    <div class="disclaimer minimum-stake-disclaimer" v-if="newStake !== 0 && isStakeBelowMinimum">
                        {{ $t('Stake must be at least {minStake}.', { minStake: `${MIN_STAKE / 1e5} NIM` }) }}
                    </div>
                    <div class="disclaimer stake-disclaimer" v-else-if="stakeDelta >= 0">
                        {{ $t('Prestaked funds are locked until launch') }}
                    </div>
                    <div class="disclaimer unstake-disclaimer" v-else>
                        <Amount :amount="Math.abs(stakeDelta)" :decimals="DISPLAYED_DECIMALS" />
                        {{ $t('will be available within hours.') }}
                    </div>
                </MessageTransition>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { captureException } from '@sentry/vue';
import { computed, defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';
import { Utf8Tools } from '@nimiq/utils';

import { CryptoCurrency, MIN_STAKE } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { sendTransaction } from '../../hub';

import { useConfig } from '../../composables/useConfig';

import { useStakingStore } from '../../stores/Staking';

import AmountSlider from './AmountSlider.vue';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';

import LabelTooltip from './tooltips/LabelTooltip.vue';
import { StatusChangeType } from './StakingModal.vue';
import MessageTransition from '../MessageTransition.vue';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';

export default defineComponent({
    setup(props, context) {
        const { activeStake, activeValidator } = useStakingStore();
        const { activeAddressInfo } = useAddressStore();
        const { state: network$ } = useNetworkStore();

        const newStake = ref(activeStake.value ? activeStake.value.activeBalance : 0);
        const stakeDelta = ref(0);

        const feePerByte = ref(0);
        const message = ref('');
        const fee = computed(() => message.value
            ? feePerByte.value * (166 + Utf8Tools.stringToUtf8ByteArray(message.value).byteLength)
            : feePerByte.value * 138);

        function updateStaked(amount: number) {
            newStake.value = amount;
            stakeDelta.value = amount - (activeStake.value?.activeBalance || 0);
        }

        async function performStaking() {
            if (newStake.value < MIN_STAKE) return;

            message.value = activeValidator.value!.address;
            const burnerAddress = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
            const amountToSend = newStake.value - (activeStake.value?.activeBalance || 0);

            try {
                const result = await sendTransaction({
                    sender: activeAddressInfo.value!.address,
                    recipient: burnerAddress,
                    value: amountToSend,
                    fee: fee.value,
                    extraData: message.value,
                    validityStartHeight: network$.height,
                });

                if (!result) {
                    // Handle failure
                    console.error('Failed to send staking transaction');
                    return;
                }

                // Handle success
                console.log('Staking transaction sent successfully');
            } catch (error) {
                console.error('Error sending staking transaction:', error);
            }
        }

        const isStakeBelowMinimum = computed(() => newStake.value < MIN_STAKE);

        return {
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(stakeDelta.value, CryptoCurrency.NIM),
            activeStake,
            validator: activeValidator,
            newStake,
            stakeDelta,
            updateStaked,
            performStaking,
            isStakeBelowMinimum,
            MIN_STAKE,
        };
    },
    components: {
        PageHeader,
        PageBody,
        LabelTooltip,
        AmountSlider,
        Amount,
        MessageTransition,
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

            ::v-deep .trigger {
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

        .amount-slider {
            margin: 4rem 3rem 0;
        }

        .stake-button {
            width: 40.5rem;
        }

        .disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: var(--small-size);
            text-align: center;
        }

        .minimum-stake-disclaimer {
            color: var(--nimiq-orange);
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

<template>
    <div class="prestake-graph-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Set an amount to lock') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">{{
                    $t('Prestake as much NIM as you can and help reach the next milestone of securing the network.')
                }}</p>
                <!-- <div v-if="validator" class="tooltip-bar flex-row">
                    <LabelTooltip :validator="validator" @click="$emit('changeValidator')" />
                    <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" dry />
                    <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" dry />
                </div> -->
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <div style="height: 150px; background: gainsboro;"></div>

            <AmountSlider
                :prestakedAmount="activePrestake ? activePrestake.balance : 0"
                @amount-prestaked="updatePrestaked"
            />

            <div>
                <button
                    class="nq-button light-blue prestake-button"
                    :disabled="!prestakeDelta || isPrestakeBelowMinimum"
                    @click="performPrestaking"
                >
                    {{ $t('Confirm prestake') }}
                </button>

                <MessageTransition>
                    <div class="disclaimer minimum-prestake-disclaimer"
                        v-if="newPrestake !== 0 && isPrestakeBelowMinimum">
                        {{
                            $t('Prestake must be at least {minPrestake}.', { minPrestake: `${MIN_PRESTAKE / 1e5} NIM` })
                        }}
                    </div>
                    <div class="disclaimer prestake-disclaimer" v-else-if="prestakeDelta >= 0">
                        {{ $t('Prestaked funds are locked until launch') }}
                    </div>
                    <div class="disclaimer unprestake-disclaimer" v-else>
                        <Amount :amount="Math.abs(prestakeDelta)" :decimals="DISPLAYED_DECIMALS" />
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
// import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';
import { Amount, PageHeader, PageBody } from '@nimiq/vue-components';
import { Utf8Tools } from '@nimiq/utils';

import { CryptoCurrency, MIN_PRESTAKE, BURNER_ADDRESS } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { sendTransaction } from '../../hub';

import { useConfig } from '../../composables/useConfig';

import { usePrestakingStore } from '../../stores/Prestaking';

import AmountSlider from './AmountSlider.vue';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';

// import LabelTooltip from './tooltips/LabelTooltip.vue';
import { StatusChangeType } from './PrestakingModal.vue';
import MessageTransition from '../MessageTransition.vue';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';

// import { useTransactionsStore } from '../../stores/Transactions';

export default defineComponent({
    setup(props, context) {
        const { config } = useConfig();
        const { activePrestake, activeValidator } = usePrestakingStore();
        const { activeAddressInfo } = useAddressStore();
        const { state: network$ } = useNetworkStore();

        // const { state: transactions$ } = useTransactionsStore();

        const newPrestake = ref(activePrestake.value ? activePrestake.value.balance : 0);
        const prestakeDelta = ref(0);
        const amountToSend = computed(() => newPrestake.value - (activePrestake.value?.balance || 0));

        const feePerByte = ref(0);
        const message = ref('');
        const fee = computed(() => message.value
            ? feePerByte.value * (166 + Utf8Tools.stringToUtf8ByteArray(message.value).byteLength)
            : feePerByte.value * 138);

        const maxSendableAmount = computed(() => Math.max((activeAddressInfo.value!.balance || 0) - fee.value, 0));

        const hasHeight = computed(() => !!network$.height);

        const canSend = computed(() =>
            network$.consensus === 'established'
            && hasHeight.value
            && !!newPrestake.value
            && amountToSend.value <= maxSendableAmount.value,
        );

        function updatePrestaked(amount: number) {
            newPrestake.value = amount;
            prestakeDelta.value = amount - (activePrestake.value?.balance || 0);
        }

        async function performPrestaking() {
            if (newPrestake.value < MIN_PRESTAKE || prestakeDelta.value <= 0) return;
            context.emit('statusChange', {
                type: StatusChangeType.PRESTAKING,
                state: State.LOADING,
                title: context.root.$t('Sending Pre-Prestaking Transaction') as string,
            });

            message.value = activeValidator.value!.address;

            try {
                const result = await sendTransaction({
                    sender: activeAddressInfo.value!.address,
                    recipient: BURNER_ADDRESS,
                    value: amountToSend.value,
                    fee: fee.value,
                    extraData: message.value,
                    validityStartHeight: network$.height,
                });

                if (!result) {
                    context.emit('statusChange', {
                        type: StatusChangeType.NONE,
                    });
                    return;
                }

                // Handle success
                context.emit('statusChange', {
                    state: State.SUCCESS,
                    title: context.root.$t(
                        'Successfully prestaked {amount} NIM with {validator}',
                        {
                            amount: Math.abs(prestakeDelta.value / 1e5),
                            validator: activeValidator.value && 'label' in activeValidator.value
                                ? activeValidator.value.label
                                : message.value,
                        },
                    ),
                });

                window.setTimeout(() => {
                    context.emit('statusChange', { type: StatusChangeType.NONE });
                    context.emit('next');
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

                // Show error screen
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: context.root.$t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

        const isPrestakeBelowMinimum = computed(() => newPrestake.value < MIN_PRESTAKE);

        return {
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(prestakeDelta.value, CryptoCurrency.NIM),
            activePrestake,
            validator: activeValidator,
            newPrestake,
            prestakeDelta,
            updatePrestaked,
            performPrestaking,
            isPrestakeBelowMinimum,
            MIN_PRESTAKE,
            // totalNimSentToBurner,
            canSend,
        };
    },
    components: {
        PageHeader,
        PageBody,
        // LabelTooltip,
        AmountSlider,
        Amount,
        MessageTransition,
    },
});
</script>

<style lang="scss" scoped>
    .prestake-graph-page {
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

        .prestake-button {
            width: 40.5rem;
        }

        .disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: var(--small-size);
            text-align: center;
        }

        .minimum-prestake-disclaimer {
            color: var(--nimiq-orange);
        }

        .prestake-disclaimer {
            color: var(--text-50);
        }

        .unprestake-disclaimer {
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

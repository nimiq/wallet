<template>
    <div class="staking-graph-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template v-if="!activeStake || !activeStake.activeBalance" #default>
                {{ $t('Set an Amount') }}
            </template>
            <template v-else #default>
                {{ $t('Adjust your stake') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Use the slider to lock your NIM and earn rewards.') }}
                </p>
                <div class="validator-info-bar flex-row" v-if="validator">
                    <ValidatorInfoBar :validator="validator" @click="$emit('selectValidator', validator)" />
                </div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <span class="estimated-rewards-overlay">
                <Tooltip
                    preferredPosition="bottom right"
                    :styles="{'width': '32rem', 'margin-left': '-6rem'}"
                    :container="tooltipContainer"
                >
                    <div slot="trigger" class="flex-row">
                        Estimated rewards <InfoCircleSmallIcon />
                    </div>

                    <img src="/img/staking/estimated-rewards-projection.svg" alt="Estimated Rewards Projection" />
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
                :stakedAmount="newStake"
                :fee="validator && 'fee' in validator ? validator.fee : 0"
            />

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
                        {{ $t('Unlock at any time. Your NIM will be available within ~24 hours.') }}
                    </div>
                    <div class="disclaimer unstake-disclaimer" v-else>
                        <Amount :amount="Math.abs(stakeDelta)" :decimals="DISPLAYED_DECIMALS" />
                        {{ $t('will be available within ~24 hours.') }}
                    </div>
                </MessageTransition>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { InfoCircleSmallIcon, Amount, PageHeader, PageBody, Tooltip } from '@nimiq/vue-components';

import { useI18n } from '@/lib/useI18n';
import { CryptoCurrency, MIN_STAKE } from '../../lib/Constants';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { getNetworkClient, sendTransaction as sendTx, waitForTransactionConfirmation } from '../../network';
import { usePolicy } from '../../composables/usePolicy';
import { sendStaking, signUnstakingTransactions } from '../../hub';
import { startUnstaking } from '../../lib/AlbatrossWatchtower';

import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';
import { useNetworkStore } from '../../stores/Network';

import ValidatorInfoBar from './tooltips/ValidatorInfoBar.vue';

import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';
import AmountSlider from './AmountSlider.vue';
import { StakingOperationType } from '../../lib/StakingUtils';
import MessageTransition from '../MessageTransition.vue';
import StakingGraph from './StakingGraph.vue';
import { reportToSentry } from '../../lib/Sentry';

export default defineComponent({
    setup(props, context) {
        const { $t } = useI18n();
        const { activeAddress } = useAddressStore();
        const { activeStake, activeValidator } = useStakingStore();

        const newStake = ref(activeStake.value ? activeStake.value.activeBalance : 0);
        const stakeDelta = ref(0);
        const tooltipContainer = ref<HTMLElement | null>(null);

        function updateStaked(amount: unknown) {
            if (typeof amount === 'number') {
                newStake.value = amount;
                stakeDelta.value = amount - (activeStake.value?.activeBalance || 0);
            }
        }

        async function performStaking() {
            if (isStakeBelowMinimum.value) return;

            const validatorLabelOrAddress = 'name' in activeValidator.value!
                ? activeValidator.value.name
                : activeValidator.value!.address;

            const { Address, TransactionBuilder } = await import('@nimiq/core');
            const client = await getNetworkClient();

            try {
                if (stakeDelta.value > 0) {
                    context.emit('statusChange', {
                        type: StakingOperationType.STAKING,
                        state: State.LOADING,
                        title: $t('Sending Staking Transaction') as string,
                    });

                    if (!activeStake.value
                        || (!activeStake.value.activeBalance && !activeStake.value.inactiveBalance)) {
                        const transaction = TransactionBuilder.newCreateStaker(
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            Address.fromUserFriendlyAddress(activeValidator.value!.address),
                            BigInt(stakeDelta.value),
                            BigInt(0),
                            useNetworkStore().state.height,
                            await client.getNetworkId(),
                        );
                        const txs = await sendStaking({
                            transaction: transaction.serialize(),
                            recipientLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                            validatorImageUrl: 'logo' in activeValidator.value!
                                && !activeValidator.value.hasDefaultLogo
                                ? activeValidator.value.logo
                                : undefined,
                        }).catch((error) => {
                            throw new Error(error.data);
                        });

                        if (!txs) {
                            context.emit('statusChange', {
                                type: StakingOperationType.NONE,
                            });
                            return;
                        }

                        if (txs.some((tx) => tx.executionResult === false)) {
                            throw new Error('The transaction did not succeed');
                        }

                        context.emit('statusChange', {
                            state: State.SUCCESS,
                            title: $t(
                                'Successfully staked {amount} NIM with {validator}',
                                {
                                    amount: Math.abs(stakeDelta.value / 1e5),
                                    validator: validatorLabelOrAddress,
                                },
                            ),
                        });
                    } else {
                        // TODO: Differentiate between adding and reactivating stake
                        const transaction = TransactionBuilder.newAddStake(
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            BigInt(stakeDelta.value),
                            BigInt(0),
                            useNetworkStore().state.height,
                            await client.getNetworkId(),
                        );
                        const txs = await sendStaking({
                            transaction: transaction.serialize(),
                            recipientLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                            validatorAddress: activeValidator.value!.address,
                            validatorImageUrl: ('logo' in activeValidator.value!
                                && !activeValidator.value.hasDefaultLogo)
                                ? activeValidator.value.logo
                                : undefined,
                        }).catch((error) => {
                            throw new Error(error.data);
                        });

                        if (!txs) {
                            context.emit('statusChange', {
                                type: StakingOperationType.NONE,
                            });
                            return;
                        }

                        if (txs.some((tx) => tx.executionResult === false)) {
                            throw new Error('The transaction did not succeed');
                        }

                        context.emit('statusChange', {
                            state: State.SUCCESS,
                            title: $t(
                                'Successfully added {amount} NIM to your stake with {validator}',
                                {
                                    amount: Math.abs(stakeDelta.value / 1e5),
                                    validator: validatorLabelOrAddress,
                                },
                            ),
                        });
                    }
                } else {
                    context.emit('statusChange', {
                        type: StakingOperationType.DEACTIVATING,
                        state: State.LOADING,
                        title: $t('Sending Staking Transaction') as string,
                    });

                    const unstakeAmount = Math.abs(stakeDelta.value);

                    // Load policy to calculate correct validity heights for retire/unstake transactions
                    const policy = await usePolicy();

                    // Use current height as the basis for validity height calculations
                    // This ensures our calculated heights are <= what the watchtower will calculate
                    // (since the actual block will be currentHeight or later)
                    const currentHeight = useNetworkStore().state.height;

                    // Calculate when the retire transaction can be broadcast (after inactivation period)
                    // This matches the watchtower's logic: election_block_after + blocks_per_epoch
                    const nextElectionBlock = policy.electionBlockAfter(currentHeight);
                    const retireValidityStartHeight = nextElectionBlock + policy.blocksPerEpoch();

                    // Unstake must be valid 1 block after retire
                    const unstakeValidityStartHeight = retireValidityStartHeight + 1;

                    // eslint-disable-next-line no-console
                    console.debug('Unstaking transaction validity heights:', {
                        currentHeight,
                        nextElectionBlock,
                        retireValidityStartHeight,
                        unstakeValidityStartHeight,
                        blocksPerEpoch: policy.blocksPerEpoch(),
                        genesisBlockNumber: policy.genesisBlockNumber,
                    });

                    // Build all 3 transactions for the unstaking watchtower flow:
                    // 1. Deactivation: Move active stake to inactive
                    const deactivationTx = TransactionBuilder.newSetActiveStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(activeStake.value!.activeBalance + stakeDelta.value),
                        BigInt(0),
                        currentHeight,
                        await client.getNetworkId(),
                    );

                    // 2. Retire: Move inactive stake to retired (will be broadcast after epoch boundary)
                    // Must specify the TOTAL inactive balance after deactivation
                    const totalInactiveAfterDeactivation = (activeStake.value!.inactiveBalance || 0) + unstakeAmount;
                    const retireTx = TransactionBuilder.newRetireStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(totalInactiveAfterDeactivation),
                        BigInt(0),
                        retireValidityStartHeight,
                        await client.getNetworkId(),
                    );

                    // 3. Remove: Remove retired stake and send funds back (will be broadcast after retire)
                    // Must remove TOTAL retired balance (existing retired + newly retired)
                    const totalRetiredAfterRetire = (activeStake.value!.retiredBalance || 0)
                        + totalInactiveAfterDeactivation;
                    const removeTx = TransactionBuilder.newRemoveStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(totalRetiredAfterRetire),
                        BigInt(0),
                        unstakeValidityStartHeight,
                        await client.getNetworkId(),
                    );

                    // Sign all 3 transactions at once using the SignTransaction API
                    const signedTransactions = await signUnstakingTransactions({
                        sender: activeAddress.value!,
                        // FROM = validator (rendered on the dashed "current" card in the keyguard).
                        senderLabel: 'name' in activeValidator.value! ? activeValidator.value.name : 'Validator',
                        // TO = user wallet — let the keyguard fall back to keyLabel.
                        transactions: [
                            deactivationTx.serialize(),
                            retireTx.serialize(),
                            removeTx.serialize(),
                        ],
                        validatorAddress: activeValidator.value!.address,
                        validatorImageUrl: 'logo' in activeValidator.value! && !activeValidator.value.hasDefaultLogo
                            ? activeValidator.value.logo
                            : undefined,
                    }).catch((error) => {
                        throw new Error(error?.data || error?.message || error);
                    });

                    if (!signedTransactions) {
                        context.emit('statusChange', {
                            type: StakingOperationType.NONE,
                        });
                        return;
                    }

                    // Validate that we received 3 signed transactions
                    if (!Array.isArray(signedTransactions) || signedTransactions.length !== 3) {
                        const got = Array.isArray(signedTransactions) ? signedTransactions.length : 'non-array';
                        throw new Error(`Expected 3 signed transactions, got ${got}`);
                    }

                    // Broadcast the deactivation transaction immediately
                    const deactivationResult = await sendTx(signedTransactions[0]);

                    if (!deactivationResult || deactivationResult.executionResult === false) {
                        throw new Error('Deactivation transaction failed');
                    }

                    // Wait for the deactivation transaction to be confirmed before sending to watchtower
                    // The watchtower requires the transaction to be confirmed on-chain
                    try {
                        await waitForTransactionConfirmation(signedTransactions[0].hash, {
                            requireConfirmed: true,
                        });
                    } catch (confirmationError: any) {
                        // Log confirmation timeout but continue - watchtower is optional
                        reportToSentry(confirmationError);
                        // eslint-disable-next-line no-console
                        console.warn('Transaction confirmation timeout:', confirmationError);
                    }

                    // Send the retire and remove transactions to the watchtower
                    try {
                        await startUnstaking({
                            stakerAddress: activeAddress.value!,
                            inactiveStakeTxHash: signedTransactions[0].hash,
                            retireTx: signedTransactions[1].serializedTx,
                            unstakeTx: signedTransactions[2].serializedTx,
                        });
                    } catch (watchtowerError: any) {
                        // Log watchtower error but don't fail the unstaking operation
                        // The deactivation was successful, watchtower is just for automation
                        reportToSentry(watchtowerError);
                        // eslint-disable-next-line no-console
                        console.warn('Watchtower registration failed:', watchtowerError);
                    }

                    context.emit('statusChange', {
                        state: State.SUCCESS,
                        title: $t(
                            'Successfully deactivated {amount} NIM from your stake with {validator}',
                            {
                                amount: Math.abs(unstakeAmount / 1e5),
                                validator: validatorLabelOrAddress,
                            },
                        ),
                    });
                }

                window.setTimeout(() => {
                    context.emit('statusChange', { type: StakingOperationType.NONE });
                    context.emit('next');
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                reportToSentry(error);

                // Show error screen
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: $t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

        const isStakeBelowMinimum = computed(() => newStake.value < MIN_STAKE && newStake.value > 0);

        return {
            // NOW,
            // MONTH,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(stakeDelta.value, CryptoCurrency.NIM),
            activeStake,
            validator: activeValidator,
            newStake,
            stakeDelta,
            updateStaked,
            performStaking,
            isStakeBelowMinimum,
            MIN_STAKE,
            tooltipContainer,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorInfoBar,
        StakingGraph,
        AmountSlider,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
        MessageTransition,
    },
});
</script>

<style lang="scss" scoped>
    .staking-graph-page { flex-grow: 1 }

    .page-header {
        padding-bottom: 3rem;

        .tooltip-bar {
            justify-content: center;

            > * + * {
                margin-left: 0.75rem;
            }
        }

        .validator-info-bar {
            justify-content: center;
        }
    }

    .page-body {
        padding: 0 0 2rem 0;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;

        .estimated-rewards-overlay {
            position: absolute;
            z-index: 1;
            top: 2.4rem;
            left: 2.4rem;

            ::v-deep .trigger {
                line-height: 1.2;
                font-size: var(--small-size);
                font-weight: 600;
                color: var(--text-30);
                background: white;
                padding: 0 .25rem;
                cursor: pointer;

                div {
                    align-items: center;

                    svg { margin-left: 0.5rem }
                }
            }
        }

        .staking-graph {
            margin-top: -2.8rem;
            z-index: 0;
        }

        .amount-slider {
            margin: 4rem 3rem 0;
            z-index: 0;
        }

        .stake-button { width: 40.5rem }

        .disclaimer {
            margin-top: 1.5rem;
            font-weight: 600;
            font-size: var(--small-size);
            text-align: center;
        }

        .minimum-stake-disclaimer { color: var(--nimiq-orange) }
        .stake-disclaimer { color: var(--text-50) }
        .unstake-disclaimer { color: var(--nimiq-light-blue) }
    }

    .nq-text {
        margin: 1rem 0 1.5rem;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>

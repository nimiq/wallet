<template>
    <div class="validator-details-overlay">
        <div class="scroll-container">
            <PageHeader :backArrow="showBackArrow" @back="$emit('back')">
                <ValidatorIcon :validator="validator" />
                <span v-if="'name' in validator">
                    {{ validator.name }}
                </span>
                <ShortAddress v-else :address="validator.address" />
            </PageHeader>
            <PageBody class="flex-column">
                <ValidatorScoreDetails v-if="'score' in validator"
                    :score="validator.score"
                />

                <div class="reward-info" v-if="'annualReward' in validator">
                    <div class="info-row">
                        <span class="label">{{ $t('Estimated yearly reward') }}</span>
                        <ValidatorReward :reward="validator.annualReward" percentOnly />
                    </div>
                    <div class="info-row sub-info">
                        <span class="label">{{ $t('incl. pool fee') }}</span>
                        <span class="fee">
                            {{ Math.trunc((validator.fee * 100) * 100) / 100 }}%
                        </span>
                    </div>
                    <p class="description">
                        <!-- eslint-disable-next-line max-len -->
                        {{ $t('Your rewards are influenced by how many NIM are staked globally and your validator pool’s fee.') }}
                    </p>
                </div>

                <hr />

                <div class="validator-description">
                    <q v-if="'description' in validator">{{ validator.description }}</q>
                    <p v-else>{{ $t('No description available') }}</p>
                </div>

                <BlueLink v-if="'website' in validator && validator.website && 'name' in validator"
                    :href="validator.website" target="_blank" rel="noopener"
                >
                    {{ $t('{poolName} Website', { poolName: validator.name }) }}
                </BlueLink>
                <p class="disclaimer">
                    <!-- eslint-disable-next-line max-len -->
                    {{ $t('The validator is solely responsible for the information provided above. It is not to be viewed as an endorsement or recommendation by Nimiq.') }}
                </p>
            </PageBody>
        </div>
        <div class="bottom-bar">
            <button class="action-button" :disabled="isSubmitting" @click="onActionButtonClick">
                {{ actionButtonLabel }}
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onBeforeUnmount } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { useI18n } from '@/lib/useI18n';
import { Validator, useStakingStore } from '../../stores/Staking';
import ValidatorIcon from './ValidatorIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import ValidatorScoreDetails from './ValidatorScoreDetails.vue';
import { useAddressStore } from '../../stores/Address';
import { signSwitchValidatorTransactions } from '../../hub';
import { sendTransaction as sendTx, getNetworkClient, waitForTransactionConfirmation } from '../../network';
import { usePolicy } from '../../composables/usePolicy';
import { useNetworkStore } from '../../stores/Network';
import { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { StakingOperationType, toValidatorRef, validatorLabel } from '../../lib/StakingUtils';
import { startSwitchValidator } from '../../lib/AlbatrossWatchtower';
import { sendImmediateValidatorSwitch } from '../../lib/SwitchValidator';
import ValidatorReward from './tooltips/ValidatorReward.vue';
import BlueLink from '../BlueLink.vue';
import { reportToSentry } from '../../lib/Sentry';

export default defineComponent({
    name: 'ValidatorDetailsOverlay',
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
        showBackArrow: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const { $t } = useI18n();
        const { activeAddress } = useAddressStore();
        const {
            activeStake, setStake, activeValidator,
            setSwitchOperation, clearSwitchOperation,
        } = useStakingStore();
        const { height } = useNetworkStore();

        const hasExistingStake = computed(() => !!activeStake.value
            && (activeStake.value.activeBalance > 0 || activeStake.value.inactiveBalance > 0));

        const isCurrentValidator = computed(() => !!activeValidator.value
            && activeValidator.value.address === props.validator.address);

        const actionButtonLabel = computed(() => (hasExistingStake.value
            ? $t('Switch validator')
            : $t('Select validator')));

        const isSubmitting = ref(false);

        let successRedirectTimer: number | null = null;
        function scheduleSuccessRedirect() {
            if (successRedirectTimer !== null) clearTimeout(successRedirectTimer);
            successRedirectTimer = window.setTimeout(() => {
                successRedirectTimer = null;
                // Emit `next` before clearing the status type so the parent closes the overlay
                // before the StatusScreen disappears — otherwise the v-show-hidden overlay
                // briefly flashes back into view.
                context.emit('next');
                context.emit('statusChange', { type: StakingOperationType.NONE });
            }, SUCCESS_REDIRECT_DELAY);
        }
        onBeforeUnmount(() => {
            if (successRedirectTimer !== null) clearTimeout(successRedirectTimer);
        });

        async function switchViaWatchtower() {
            if (!activeValidator.value) {
                reportToSentry(new Error('Attempted switchViaWatchtower without activeValidator'));
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: $t('Something went wrong') as string,
                    message: $t('Validator information not available') as string,
                });
                return;
            }

            context.emit('statusChange', {
                type: StakingOperationType.VALIDATOR,
                state: State.LOADING,
                title: $t('Switching validator') as string,
            });

            const [{ Address, TransactionBuilder }, client, policy] = await Promise.all([
                import('@nimiq/core'),
                getNetworkClient(),
                usePolicy(),
            ]);
            const networkId = await client.getNetworkId();
            const currentHeight = height.value;
            const stakerAddress = Address.fromUserFriendlyAddress(activeAddress.value!);

            // update-staker must be valid at the height the watchtower will broadcast it: one
            // full epoch after the deactivation lands (matching the watchtower's
            // `must_be_valid_at = electionBlockAfter(deactivation_block) + blocksPerEpoch`).
            // Without a future validity height the watchtower rejects with a misleading
            // "Transaction has invalid value" error.
            const updateValidityStartHeight = policy.electionBlockAfter(currentHeight) + policy.blocksPerEpoch();

            const deactivateTx = TransactionBuilder.newSetActiveStake(
                stakerAddress,
                BigInt(0),
                BigInt(0),
                currentHeight,
                networkId,
            );

            const updateTx = TransactionBuilder.newUpdateStaker(
                stakerAddress,
                Address.fromUserFriendlyAddress(props.validator.address),
                true, // reactivateAllStake
                BigInt(0),
                updateValidityStartHeight,
                networkId,
            );

            const target = toValidatorRef(props.validator);
            const from = toValidatorRef(activeValidator.value);

            const signedTxs = await signSwitchValidatorTransactions({
                sender: activeAddress.value!,
                transactions: [deactivateTx.serialize(), updateTx.serialize()],
                senderLabel: validatorLabel(from),
                recipientLabel: validatorLabel(target),
                validatorAddress: target.address,
                validatorImageUrl: target.logo,
                fromValidatorAddress: from.address,
                fromValidatorImageUrl: from.logo,
                amount: activeStake.value!.activeBalance + activeStake.value!.inactiveBalance,
            });

            if (!signedTxs) {
                context.emit('statusChange', { type: StakingOperationType.NONE });
                return;
            }

            const deactivationTxHash = signedTxs[0].hash;

            const deactivateResult = await sendTx(signedTxs[0]);
            if (deactivateResult.executionResult === false) {
                throw new Error('Deactivation transaction did not succeed');
            }

            // Watchtower won't accept the request before the deactivation is finalized.
            try {
                await waitForTransactionConfirmation(deactivationTxHash, { requireConfirmed: true });
            } catch (confirmationError: any) {
                reportToSentry(confirmationError);
                // eslint-disable-next-line no-console
                console.warn('Transaction confirmation timeout:', confirmationError);
            }

            // Watchtower failure is non-fatal: the deactivation is on-chain and the user can
            // still activate the new validator manually once the cooldown ends.
            try {
                await startSwitchValidator({
                    stakerAddress: activeAddress.value!,
                    deactivationTxHash,
                    updateStakerTx: signedTxs[1].serializedTx,
                });
            } catch (wtError: any) {
                reportToSentry(wtError);
                // eslint-disable-next-line no-console
                console.warn('Watchtower registration failed:', wtError);
            }

            setSwitchOperation(activeAddress.value!, {
                targetValidatorAddress: target.address,
                targetValidatorName: target.name,
                startedAtBlock: currentHeight,
                deactivationTxHash,
            });

            context.emit('statusChange', {
                state: State.SUCCESS,
                title: $t('Validator switch initiated') as string,
            });

            scheduleSuccessRedirect();
        }

        async function switchImmediate() {
            context.emit('statusChange', {
                type: StakingOperationType.VALIDATOR,
                state: State.LOADING,
                title: $t('Changing validator') as string,
            });

            const target = toValidatorRef(props.validator);

            const txs = await sendImmediateValidatorSwitch({
                stakerAddress: activeAddress.value!,
                height: height.value,
                amount: activeStake.value!.inactiveBalance,
                target,
                from: toValidatorRef(activeValidator.value!),
            });

            if (!txs) {
                context.emit('statusChange', { type: StakingOperationType.NONE });
                return;
            }

            if (txs.some((tx) => tx.executionResult === false)) {
                throw new Error('The transaction did not succeed');
            }

            clearSwitchOperation(activeAddress.value!);

            context.emit('statusChange', {
                state: State.SUCCESS,
                title: $t(
                    'Successfully changed validator to {validator}',
                    { validator: validatorLabel(target) },
                ),
            });

            scheduleSuccessRedirect();
        }

        async function selectValidator() {
            try {
                if (!hasExistingStake.value) {
                    setStake({
                        address: activeAddress.value!,
                        activeBalance: 0,
                        inactiveBalance: 0,
                        validator: props.validator.address,
                        retiredBalance: 0,
                    });
                    context.emit('next');
                    return;
                }

                if (activeStake.value!.activeBalance > 0) {
                    await switchViaWatchtower();
                    return;
                }

                if (activeStake.value!.inactiveBalance > 0
                    && activeStake.value!.inactiveRelease
                    && activeStake.value!.inactiveRelease <= height.value) {
                    await switchImmediate();
                    return;
                }

                // Stake is inactive but the cooldown has not yet ended.
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: $t('Cannot switch yet') as string,
                    message: $t('Please wait for the cooldown period to end.') as string,
                });
            } catch (error: any) {
                reportToSentry(error);
                context.emit('statusChange', {
                    state: State.WARNING,
                    title: $t('Something went wrong') as string,
                    message: `${error.message}${error.data ? ` - ${error.data}` : ''}`,
                });
            }
        }

        async function onActionButtonClick() {
            if (isSubmitting.value) return;
            if (isCurrentValidator.value) {
                context.emit('switch-validator');
                return;
            }
            isSubmitting.value = true;
            try {
                await selectValidator();
            } finally {
                isSubmitting.value = false;
            }
        }

        return {
            onActionButtonClick,
            actionButtonLabel,
            isSubmitting,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorIcon,
        ShortAddress,
        ValidatorScoreDetails,
        ValidatorReward,
        BlueLink,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

.validator-details-overlay {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}

.scroll-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    @extend %custom-scrollbar;
}

.page-header {
    padding-top: 6rem;
    padding-bottom: 4rem;

    &::v-deep h1 { font-size: 3rem }
    .short-address { justify-content: center }

    .validator-icon {
        --size: 14rem;

        margin: 0 auto;
        margin-bottom: 2rem;
    }
}

.page-body {
    overflow-x: hidden;
    padding: 4rem;
    padding-top: 0;
}

.reward-info {
    margin: 4rem 0;

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        color: var(--nimiq-blue);
        font-size: 2rem;
        font-weight: 600;

        .label + * {
            color: currentColor;
        }

        &.sub-info {
            color: var(--text-50);
            font-size: 1.75rem;
        }
    }

    .description {
        font-size: 1.5rem;
        color: var(--text-50);
        margin-bottom: 0;
    }
}

hr {
    margin: 0;
    height: 1px;
    background-color: var(--nimiq-blue);
    opacity: 0.2;

    width: calc(100% + 8rem);
    margin-left: -4rem;
}

.validator-description {
    margin-top: 4rem;
    margin-bottom: 1rem;

    font-size: 2rem;
    font-weight: 500;
    color: var(--nimiq-blue);

    p { margin: 0 }

    q {
        display: block;
        text-indent: -0.725rem;
    }
}

.blue-link {
    font-weight: 600;
    font-size: 2rem;
}

.disclaimer {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-50);
}

.bottom-bar {
    flex-shrink: 0;

    display: flex;
    justify-content: center;
    align-items: center;

    height: 9rem;
    padding: 2.75rem 0;

    background-color: white;
    border-bottom-left-radius: 1.25rem;
    border-bottom-right-radius: 1.25rem;
    box-shadow:
        0 0 4.125px rgba(31, 35, 72, 0.03),
        0 0 12.519px rgba(31, 35, 72, 0.05),
        0 0 32px rgba(31, 35, 72, 0.06),
        0 0 80px rgba(31, 35, 72, 0.07);
}

.action-button {
    border: none;
    cursor: pointer;

    padding: 0.625rem 1.5rem;
    border-radius: 10rem;

    background-color: rgba(31, 35, 72, 0.06);
    color: var(--nimiq-blue);

    font-family: 'Mulish', sans-serif;
    font-size: 1.75rem;
    font-weight: bold;
    line-height: 1.22;

    transition: background-color 200ms var(--nimiq-ease), opacity 200ms var(--nimiq-ease);

    &:hover:not(:disabled),
    &:focus:not(:disabled) {
        background-color: rgba(31, 35, 72, 0.1);
    }

    &:active:not(:disabled) {
        background-color: rgba(31, 35, 72, 0.14);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
}
</style>

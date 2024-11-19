<template>
    <div class="validator-details-overlay" :class="{ 'no-button': noButton }">
        <div class="scroll-container">
            <PageHeader>
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
                        <span class="fee">{{ validator.fee * 100 }}%</span>
                    </div>
                    <p class="description">
                        <!-- eslint-disable-next-line max-len -->
                        {{ $t('Your rewards are influenced by how many NIM are staked globally and your validator pool’s fee.') }}
                    </p>
                </div>

                <hr />

                <div class="validator-description">
                    <p v-if="'description' in validator">{{ validator.description }}</p>
                    <p v-else>{{ $t('No description available') }}</p>
                </div>

                <BlueLink v-if="'website' in validator && 'name' in validator"
                    :href="validator.website" target="_blank" rel="noopener"
                    >
                    {{ $t('{poolName} Website', { poolName: validator.name }) }}
                </BlueLink>
                <p class="disclaimer">
                    <!-- eslint-disable-next-line max-len -->
                    {{ $t('The validator is solely responsible for the information provided above. It is not to be viewed as an endorsement or recommendation by Nimiq.') }}
                </p>

                <div class="confirm-button" v-if="!noButton">
                    <button class="nq-button light-blue" @click="selectValidator">
                        {{ $t('Select validator') }}
                    </button>
                </div>
            </PageBody>
        </div>
    </div>
</template>

<script lang="ts">
import { captureException } from '@sentry/vue';
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { Validator, useStakingStore } from '../../stores/Staking';
import ValidatorIcon from './ValidatorIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import ValidatorScoreDetails from './ValidatorScoreDetails.vue';
import { useAddressStore } from '../../stores/Address';
import { sendStaking } from '../../hub';
import { useNetworkStore } from '../../stores/Network';
import { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { StatusChangeType } from './StakingModal.vue';
import { getNetworkClient } from '../../network';
import { useConfig } from '../../composables/useConfig';
import ValidatorReward from './tooltips/ValidatorReward.vue';
import BlueLink from '../BlueLink.vue';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
        noButton: {
            type: Boolean,
            default: true,
        },
    },
    setup(props, context) {
        const { config } = useConfig();
        const { activeAddress } = useAddressStore();
        const { activeStake, setStake } = useStakingStore();

        async function selectValidator() {
            const validatorLabelOrAddress = 'name' in props.validator
                ? props.validator.name
                : props.validator.address;

            try {
                if (!activeStake.value || (!activeStake.value.activeBalance && !activeStake.value.inactiveBalance)) {
                    setStake({
                        address: activeAddress.value!,
                        activeBalance: 0,
                        inactiveBalance: 0,
                        validator: props.validator.address,
                        retiredBalance: 0,
                    });

                    context.emit('next');
                } else {
                    context.emit('statusChange', {
                        type: StatusChangeType.VALIDATOR,
                        state: State.LOADING,
                        title: context.root.$t('Changing validator') as string,
                    });

                    const { Address, TransactionBuilder } = await import('@nimiq/core');
                    const client = await getNetworkClient();

                    const transaction = TransactionBuilder.newUpdateStaker(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        Address.fromUserFriendlyAddress(props.validator.address),
                        true,
                        BigInt(0),
                        useNetworkStore().state.height,
                        await client.getNetworkId(),
                    );

                    const txs = await sendStaking({
                        transaction: transaction.serialize(),
                    }).catch((error) => {
                        throw new Error(error.data);
                    });

                    if (!txs) {
                        context.emit('statusChange', {
                            type: StatusChangeType.NONE,
                        });
                        return;
                    }

                    if (txs.some((tx) => tx.executionResult === false)) {
                        throw new Error('The transaction did not succeed');
                    }

                    context.emit('statusChange', {
                        state: State.SUCCESS,
                        title: context.root.$t(
                            'Successfully changed validator to {validator}',
                            { validator: validatorLabelOrAddress },
                        ),
                    });

                    window.setTimeout(() => {
                        context.emit('statusChange', { type: StatusChangeType.NONE });
                        context.emit('next');
                    }, SUCCESS_REDIRECT_DELAY);
                }
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

                context.emit('statusChange', {
                    state: State.WARNING,
                    title: context.root.$t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

        return {
            selectValidator,
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
    max-height: calc(100% - 11rem);

    &.no-button {
        max-height: 100%;
    }
}

.scroll-container {
    height: 100%;
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

.confirm-button {
    position: fixed;
    bottom: 0rem;
    left: 50%;
    transform: translateX(-50%);

    padding-bottom: 4rem;

    --border-radius: 1.25rem;
    border-bottom-right-radius: var(--border-radius);
    border-bottom-left-radius: var(--border-radius);

    width: 100%;

    background-color: white;
    box-shadow: 0 -40px 19px -15px white; // TODO: find a better solution (scroll mask?)

    button {
        margin: 0 auto;
        width: 80%;
    }
}
</style>

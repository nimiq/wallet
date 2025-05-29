<template>
    <div class="staking-info-page flex-column">
        <PageHeader :backArrow="false">
            <template v-if="validator">
                {{  $t('Staking overview') }}
            </template>
            <template v-else>
                {{ $t('Staking') }}
            </template>
            <template #more>
                <div class="validator-info-bar flex-row" v-if="validator">
                    <ValidatorInfoBar :validator="validator" @click="$emit('selectValidator', validator)" />
                </div>
            </template>
        </PageHeader>
        <PageBody class="flex-column">
            <div class="rewards-chart">
                <LineChart
                    :points="rewardsChartPoints"
                    :stroke-width="2"
                    stroke="var(--nimiq-green)"
                    :stroke-opacity="1"
                    :padding="8"
                    height="150px"
                    :animate="true"
                >
                    <div v-if="rewardsChartPoints.length === 0" class="no-rewards">
                        No rewards yet
                    </div>
                </LineChart>
                <div class="timerange-selector">
                    <SliderToggle name="timerange-toggle" v-model="selectedRange">
                        <template #ALL>
                            <button class="reset timerange-btn">{{ $t('ALL') }}</button>
                        </template>
                        <template #Y1>
                            <button class="reset timerange-btn">{{ $t('1Y') }}</button>
                        </template>
                        <template #M6>
                            <button class="reset timerange-btn">{{ $t('6M') }}</button>
                        </template>
                        <template #M3>
                            <button class="reset timerange-btn">{{ $t('3M') }}</button>
                        </template>
                    </SliderToggle>
                </div>
            </div>

            <div v-if="stake">
                <span class="nq-label flex-row section-title">
                    <TwoLeafStakingIcon />
                    {{ $t('Staked') }}
                </span>
                <div class="row flex-row">
                    <div class="col flex-grow">
                        <div class="amount-staked">
                            <Amount :amount="stakedBalance" value-mask/>
                        </div>
                        <div class="amount-staked-fiat flex-row">
                            <FiatConvertedAmount :amount="stakedBalance" value-mask/>
                            <span class="dot"></span>
                            <span>{{ percentage }}%</span>
                        </div>
                    </div>
                    <div class="flex-row">
                        <Tooltip :disabled="!isStakeDeactivating" preferredPosition="top left"
                            :container="this" class="adjust-stake">
                            <button slot="trigger" class="nq-button-s" @click="$emit('adjust-stake')"
                                :disabled="isStakeDeactivating">
                                {{ $t('Adjust Stake') }}
                            </button>
                            <span>{{ $t('You can\'t adjust your stake while you\'re unstaking') }}</span>
                        </Tooltip>
                    </div>
                </div>
                <div v-if="stake && ((stake.inactiveBalance && hasUnstakableStake) || stake.retiredBalance)"
                    class="unstaking row flex-row nq-light-blue"
                >
                    <span class="nq-button-pill payout-amount">
                        <Amount :amount="stake.retiredBalance || stake.inactiveBalance" value-mask/>
                    </span>
                    <button class="nq-button-pill light-blue" @click="() => unstakeAll(!!stake.retiredBalance)">
                        Pay out <ArrowRightSmallIcon />
                    </button>
                    <div class="flex-grow"></div>
                    <!-- <p>{{ $t('Auto-payout failed, please pay out manually.') }}</p> -->
                </div>
                <div v-else-if="stake && stake.inactiveBalance"
                    class="unstaking row flex-row nq-light-blue"
                >
                    <span class="nq-button-s unstaking-amount">
                        <ArrowDownIcon />
                        <Amount :amount="stake.inactiveBalance" value-mask/>
                    </span>
                    <button class="nq-button-s unstaking-progress">
                        {{ inactiveReleaseTime }} <!-- <span>Cancel</span> -->
                        <!-- TODO: Add cancel function -->
                    </button>
                    <div class="flex-grow"></div>
                </div>
            </div>

            <div class="horizontal-separator" />

            <div v-if="validator">
                <span class="nq-label flex-row section-title">
                    {{ $t('Validator') }}
                </span>
                <div class="row flex-row">
                    <div class="validator flex-grow">
                        <div class="validator-top flex-row">
                            <ValidatorIcon :validator="validator" />
                            <span v-if="'name' in validator" class="validator-label">{{ validator.name }}</span>
                            <ShortAddress v-else :address="validator.address"/>
                        </div>
                        <div class="validator-bottom flex-row">
                            <ValidatorTrustScore
                                v-if="'score' in validator && typeof validator.score.total === 'number'"
                                :score="validator.score.total"
                                borderless
                            />
                            <strong class="dot"
                                v-if="'annualReward' in validator
                                    && 'score' in validator
                                    && typeof validator.score.total === 'number'"
                            >&middot;</strong>
                            <ValidatorReward v-if="'annualReward' in validator" :reward="validator.annualReward"/>
                        </div>
                    </div>
                </div>
            </div>

            <i18n v-if="showDeactivateAll"
                tag="span"
                path="To change your validator, un-stake all NIM and restart the process. Click here to {unstakeLink}."
                class="switch-validator"
            >
                <a href="#" slot="unstakeLink" @click="deactivateAll">{{ $t('un-stake all') }}</a>
            </i18n>
            <div v-else class="switch-validator"></div>

            <button class="nq-button-s rewards-history" @click="$emit('next')">
                {{ $t('Rewards history') }} &gt;
            </button>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import {
    InfoCircleSmallIcon,
    PageHeader,
    PageBody,
    Tooltip,
    ArrowRightSmallIcon,
    SliderToggle,
} from '@nimiq/vue-components';

import { useI18n } from '@/lib/useI18n';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import { MIN_STAKE } from '../../lib/Constants';

import Amount from '../Amount.vue';
import LineChart from '../LineChart.vue';
import TwoLeafStakingIcon from '../icons/Staking/TwoLeafStakingIcon.vue';
import ValidatorInfoBar from './tooltips/ValidatorInfoBar.vue';
import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorReward from './tooltips/ValidatorReward.vue';
import ShortAddress from '../ShortAddress.vue';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';
import { StatusChangeType } from './StakingModal.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';

import { sendStaking } from '../../hub';
import { useNetworkStore } from '../../stores/Network';
import { getNetworkClient } from '../../network';
import ArrowDownIcon from '../icons/ArrowDownIcon.vue';
import ValidatorIcon from './ValidatorIcon.vue';
import { reportToSentry } from '../../lib/Sentry';

export default defineComponent({
    setup(props, context) {
        const { $t } = useI18n();
        const { activeAddress, activeAddressInfo } = useAddressStore();
        const { activeStake: stake, activeValidator: validator, restakingRewards, stakingEvents } = useStakingStore();
        const { height, consensus } = useNetworkStore();

        const graphUpdate = ref(0);
        const availableBalance = computed(() => activeAddressInfo.value?.balance || 0);
        const stakedBalance = computed(() => stake.value
            ? stake.value.activeBalance + stake.value.inactiveBalance + stake.value.retiredBalance
            : 0);

        const percentage = computed(() => Math.round((
            stakedBalance.value / (availableBalance.value + stakedBalance.value)
        ) * 100));

        const inactiveReleaseTime = computed(() => {
            if (stake.value?.inactiveRelease) {
                // TODO: Take validator jail release into account
                const secondsRemaining = stake.value.inactiveRelease - height.value;
                const date = new Date(Date.UTC(0, 0, 0, 0, 0, secondsRemaining));
                const hours = date.getUTCHours().toString().padStart(2, '0');
                const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                const seconds = date.getUTCSeconds().toString().padStart(2, '0');
                return [
                    ...(hours !== '' ? [hours] : []),
                    minutes,
                    seconds,
                ].join(':');
            }

            return '00:00';
        });

        const hasUnstakableStake = computed(() => {
            if (!stake.value?.inactiveBalance) return false;
            return height.value > stake.value.inactiveRelease!;
        });

        const isStakeDeactivating = computed(() =>
            !!(stake.value?.inactiveBalance && stake.value.inactiveBalance > 0),
        );

        const canSwitchValidator = computed(() => stake.value?.activeBalance === 0
            && stake.value.inactiveBalance > 0
            && (stake.value.inactiveRelease && stake.value.inactiveRelease < height.value),
        );

        const showDeactivateAll = computed(() => {
            if (!stake.value) return false;
            if (stake.value?.activeBalance) return true;

            if (
                stake.value?.inactiveBalance
                && stake.value.inactiveRelease
                && stake.value.inactiveRelease > height.value
            ) return false;

            return true;
        });

        // Calculate rewards chart points
        const rewardsChartPoints = computed(() => {
            const events = stakingEvents.value;
            if (!events) return [];

            // Filter only reward events (type 6) and sort by date
            const rewardEvents = events
                .filter((event) => event.type === 6)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Group rewards by month
            const monthlyRewards = new Map();
            rewardEvents.forEach((event) => {
                const date = new Date(event.date);
                const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                const currentValue = monthlyRewards.get(monthKey) || 0;
                monthlyRewards.set(monthKey, currentValue + event.value);
            });

            // Calculate cumulative rewards by month
            let cumulativeRewards = 0;
            return Array.from(monthlyRewards.entries())
                .map(([monthKey, monthlyReward]) => {
                    cumulativeRewards += monthlyReward;
                    // Use the first day of the month for the x-axis
                    const [year, month] = monthKey.split('-');
                    return {
                        x: new Date(Date.UTC(Number(year), Number(month) - 1, 1)).getTime(),
                        y: cumulativeRewards,
                    };
                });
        });

        const selectedRange = ref<'ALL' | 'Y1' | 'M6' | 'M3'>('ALL');

        async function deactivateAll() {
            if (stake.value?.activeBalance) {
                context.emit('statusChange', {
                    type: StatusChangeType.VALIDATOR,
                    state: State.LOADING,
                    title: $t('Deactivating Stake') as string,
                });

                try {
                    const { Address, TransactionBuilder } = await import('@nimiq/core');
                    const client = await getNetworkClient();

                    const transaction = TransactionBuilder.newSetActiveStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(0),
                        BigInt(0),
                        useNetworkStore().state.height,
                        await client.getNetworkId(),
                    );

                    const deactivatedAmount = stake.value!.activeBalance;

                    const txs = await sendStaking({
                        transaction: transaction.serialize(),
                        recipientLabel: 'name' in validator.value! ? validator.value.name : 'Validator',
                        // @ts-expect-error Not typed yet in Hub
                        validatorAddress: validator.value!.address,
                        validatorImageUrl: 'logo' in validator.value! && !validator.value.hasDefaultLogo
                            ? validator.value.logo
                            : undefined,
                        amount: Math.abs(stake.value.activeBalance),
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
                        title: $t('Successfully deactivated {amount} NIM', {
                            amount: deactivatedAmount / 1e5,
                        }),
                    });

                    // // Close staking modal
                    // router.back();
                    context.emit('statusChange', {
                        type: StatusChangeType.NONE,
                        timeout: SUCCESS_REDIRECT_DELAY,
                    });
                } catch (error: any) {
                    reportToSentry(error);

                    context.emit('statusChange', {
                        state: State.WARNING,
                        title: $t('Something went wrong') as string,
                        message: `${error.message} - ${error.data}`,
                    });
                }
            } else {
                unstakeAll(!stake.value?.inactiveBalance);
            }
        }

        async function unstakeAll(removeOnly = false) {
            context.emit('statusChange', {
                type: StatusChangeType.UNSTAKING,
                state: State.LOADING,
                title: $t('Sending Unstaking Transaction') as string,
            });

            try {
                const { Address, TransactionBuilder } = await import('@nimiq/core');
                const client = await getNetworkClient();

                const transactions = [
                    ...(removeOnly ? [] : [
                        TransactionBuilder.newRetireStake(
                            Address.fromUserFriendlyAddress(activeAddress.value!),
                            BigInt(stake.value!.inactiveBalance),
                            BigInt(0),
                            useNetworkStore().state.height,
                            await client.getNetworkId(),
                        ),
                    ]),
                    // It is only allowed to remove the complete retired balance, not only parts of it.
                    TransactionBuilder.newRemoveStake(
                        Address.fromUserFriendlyAddress(activeAddress.value!),
                        BigInt(removeOnly
                            ? stake.value!.retiredBalance
                            : stake.value!.retiredBalance + stake.value!.inactiveBalance),
                        BigInt(0),
                        useNetworkStore().state.height,
                        await client.getNetworkId(),
                    ),
                ];

                const unstakedAmount = removeOnly
                    ? stake.value!.retiredBalance
                    : stake.value!.retiredBalance + stake.value!.inactiveBalance;

                const txs = await sendStaking({
                    transaction: transactions.map((tx) => tx.serialize()),
                    recipientLabel: 'name' in validator.value! ? validator.value.name : 'Validator',
                    // @ts-expect-error Not typed yet in Hub
                    validatorAddress: validator.value!.address,
                    validatorImageUrl: 'logo' in validator.value! && !validator.value.hasDefaultLogo
                        ? validator.value.logo
                        : undefined,
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
                    title: $t('Successfully unstaked {amount} NIM', { amount: unstakedAmount / 1e5 }),
                });

                // // Close staking modal
                // router.back();
                context.emit('statusChange', {
                    type: StatusChangeType.NONE,
                    timeout: SUCCESS_REDIRECT_DELAY,
                });
            } catch (error: any) {
                reportToSentry(error);

                context.emit('statusChange', {
                    state: State.WARNING,
                    title: $t('Something went wrong') as string,
                    message: `${error.message} - ${error.data}`,
                });
            }
        }

        return {
            // NOW,
            // MONTH,
            graphUpdate,
            stake,
            validator,
            restakingRewards,
            stakedBalance,
            percentage,
            inactiveReleaseTime,
            hasUnstakableStake,
            isStakeDeactivating,
            showDeactivateAll,
            deactivateAll,
            unstakeAll,
            canSwitchValidator,
            consensus,
            MIN_STAKE,
            rewardsChartPoints,
            selectedRange,
        };
    },
    components: {
        PageHeader,
        PageBody,
        TwoLeafStakingIcon,
        // StakingGraph,
        Amount,
        Tooltip,
        InfoCircleSmallIcon,
        ValidatorTrustScore,
        ValidatorReward,
        ShortAddress,
        ArrowDownIcon,
        ArrowRightSmallIcon,
        ValidatorIcon,
        ValidatorInfoBar,
        FiatConvertedAmount,
        LineChart,
        SliderToggle,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

    .staking-info-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 3rem;

        ::v-deep h1 {
            display: flex;
            justify-content: center;
            gap: 0.25em;
            flex-wrap: wrap;
        }

        .short-address {
            display: inline-flex;

            ::v-deep .address {
                line-height: inherit;
                font-family: inherit;
                font-weight: inherit;
            }
        }

        .validator-info-bar {
            justify-content: center;
            margin-top: 1rem;
        }
    }

    .page-body {
        padding: 0 2rem 4rem;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;
    }

    .section-title {
        padding-left: 2rem;
        align-items: center;

        .nq-icon {
            font-size: 3.25rem;
            margin: -0.5rem 0.25rem 0 -0.75rem;

            ::v-deep path {
                stroke-width: 1;
            }
        }
    }

    .amount-staked {
        --size: var(--h2-size);
        font-size: var(--size);
        font-weight: bold;
        line-height: 1;
        margin-bottom: 1rem;
    }

    .adjust-stake {
        // margin-right: 2rem;
        ::v-deep .tooltip-box {
            width: 25.75rem;
        }
    }

    .nq-button-pill:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        // pointer-events: none;
    }

    .amount-staked-fiat {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
    }

    .unstaking {
        flex-wrap: wrap;
        align-items: center;
        --size: var(--body-size);
        font-size: var(--size);
        font-weight: 600;
        margin-top: 2rem;

        .nq-button-s,
        .nq-button-pill {
            display: flex;
            flex-direction: row;
            align-items: center;
            color: white;

            &:first-child {
                z-index: 2;
                box-shadow: 0px 0px 0px 3px white;
                cursor: default;

                .nq-icon {
                    margin-right: 0.75rem;
                }
            }

            &:nth-child(2) {
                padding-left: 2rem;
                margin-left: -0.4rem;

                --left-radius: 0px;
                border-top-left-radius: var(--left-radius);
                border-bottom-left-radius: var(--left-radius);

                .nq-icon {
                    margin-left: 0.75rem;
                }
            }

            &.unstaking-amount { background-color: #797B91 }

            &.payout-amount .amount::after {
                top: 0.09em;
             }

            &.unstaking-progress {
                color: nimiq-blue(0.6);

                pointer-events: none;
                cursor: default;

                span {
                    color: nimiq-blue(1);
                    margin-left: 1rem;
                }
            }
        }
        p {
            color: nimiq-blue(0.6);
            font-size: 1.5rem;
            margin: 0;
            margin-top: 1rem;
            width: 100%;
        }
    }

    .horizontal-separator {
        width: 100%;
        height: 0.1875rem;
        border-top: 0.1875rem solid var(--nimiq-blue);
        opacity: 0.2;

        margin-top: 1rem;
        margin-bottom: 1rem;
    }

    .validator {
        .flex-row {
            align-items: center;
        }

        .validator-top {
            font-size: var(--h2-size);

            .validator-icon {
                margin-right: 0.75rem;
                --size: 3rem;
            }

            .validator-label {
                font-weight: bold;
            }

            .short-address {
                font-weight: 500;
            }

            .validator-reward-bubble {
                margin-left: 2rem;
            }
        }

        .validator-bottom {
            font-size: var(--small-size);
            color: var(--text-50);
            font-weight: 600;
            line-height: 1;
            margin-top: 0.75rem;

            .dot {
                margin: 0 0.675rem;
            }
        }
    }

    .rewards-history {
        align-self: center;
    }

    .row {
        padding: 0 2rem;

        button + button {
            margin-left: 2rem;
        }

        // @media (max-width: 700px) { // Full mobile breakpoint
        //     &.flex-row {
        //         flex-direction: column;
        //         align-items: flex-start;
        //         gap: 1.75rem;
        //     }
        // }
    }

    .switch-validator {
        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-40);
        align-self: center;
        padding: 0 2rem;

        a {
            color: inherit;
            text-decoration: underline;
            transition: color 200ms var(--nimiq-ease);

            &:hover {
                color: var(--text-60);
            }
        }
    }

    .rewards-chart {
        position: relative;
        width: 100%;
        height: 150px;
        border-radius: 0.5rem;

        .no-rewards {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--text-secondary);
            font-size: var(--small-size);
        }
    }

    .timerange-selector {
        position: absolute;
        bottom: 1.5rem;
        right: 1.5rem;
        background: white;
        border-radius: 2000rem;
        padding: 0.4rem;

        &::v-deep .slider-toggle {
            font-size: 1.375rem;
            font-weight: 700;

            --verticalPadding: 0.25rem;
            --horizontalPadding: 1rem;
            --padding: 0.2rem;
        }
    }

.dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: currentColor;
    margin: 0 0.25rem;
}
</style>

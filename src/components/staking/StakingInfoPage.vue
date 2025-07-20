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
            <div class="flex-row amounts" v-if="stake">
                <RoundStakingIcon color="green" />
                <div class="flex-column flex-grow">
                    <div class="amount-staked">
                        <Amount :amount="stakedBalance" value-mask/>
                        <span class="sm-hidden">&nbsp;{{ $t('staked') }}</span>
                    </div>
                    <div class="amount-staked-fiat flex-row">
                        <FiatConvertedAmount :amount="stakedBalance" value-mask/>
                        <span class="dot"></span>
                        <span>{{ percentage }}%</span>
                    </div>
                </div>
                <div class="flex-column">
                    <Tooltip :disabled="!isStakeDeactivating" preferredPosition="bottom left"
                        :container="this" class="adjust-stake">
                        <button slot="trigger" class="nq-button-s" @click="$emit('adjust-stake')"
                            :disabled="isStakeDeactivating">
                            <span class="sm-hidden">{{ $t('Adjust Stake') }}</span>
                            <span class="hidden sm-visible">{{ $t('Adjust') }}</span>
                        </button>
                        <span>{{ $t('You can\'t adjust your stake while you\'re unstaking') }}</span>
                    </Tooltip>
                </div>
            </div>
            <div class="flex-row rewards-and-chart">
                <div class="flex-column nq-green-bg rewards">
                    <h2 class="flex-row nq-label flex-grow">{{ $t('Rewards') }}</h2>
                    <div class="amount-row flex-row row">
                        +<Amount :amount="restakingRewards" value-mask/>
                    </div>
                    <div class="details-row flex-row row">
                        <FiatConvertedAmount :amount="restakingRewards" value-mask/>
                    </div>

                </div>
                <div class="flex-column flex-grow chart">
                    <h2 class="nq-label title">{{  $t('Reward History') }}</h2>
                    <StakingRewardsChart class="flex-grow" />
                </div>
            </div>
            <div class="flex-row flex-grow history">
                <div class="scroll-mask top"></div>
                <RecycleScroller
                    :items="rewards"
                    :item-size="itemSize"
                    key-field="month"
                    :buffer="scrollerBuffer"
                    ref="scroller"
                >
                    <template v-slot:default="{ item, index }">
                        <LoadingList v-if="item.loading" :delay="index * 100" :type="LoadingListType.TRANSACTION" />
                        <div v-else class="list-element" :data-id="index" :data-hash="item.id">
                            <StakingRewardsListItem
                                :monthly-reward="item.total"
                                :month="item.month"
                                :validators-addresses="item.validators"
                                hideIcon
                            />
                        </div>
                    </template>
                </RecycleScroller>
                <div class="scroll-mask bottom" v-if="stake && !stake.inactiveBalance && !stake.retiredBalance"></div>
            </div>
        </PageBody>
        <PageFooter v-if="stake && ((stake.inactiveBalance && hasUnstakableStake) || stake.retiredBalance)">
            <div class="flex-row unstaking nq-light-blue">
                <CircleExclamationMarkIcon />
                <Amount :amount="stake.retiredBalance || stake.inactiveBalance" value-mask />
                <span class="flex-grow">{{ $t('ready for pay out') }}</span>
                <button class="nq-button-pill light-blue" @click="() => unstakeAll(!!stake.retiredBalance)">
                    Pay out <ArrowRightSmallIcon />
                </button>
            </div>
        </PageFooter>
        <PageFooter v-else-if="stake && stake.inactiveBalance">
            <div class="flex-row unstaking nq-light-blue">
                <CircleArrowDownIcon /> {{  $t('Unstaking') }}
                <Amount :amount="stake.inactiveBalance" value-mask class="flex-grow"/>
                <button class="nq-button-s unstaking-progress">
                    {{ inactiveReleaseTime }} <!-- <span>Cancel</span> -->
                    <!-- TODO: Add cancel function -->
                </button>
            </div>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import {
    ArrowRightSmallIcon,
    PageBody,
    PageFooter,
    PageHeader,
    Tooltip,
} from '@nimiq/vue-components';

import { useI18n } from '@/lib/useI18n';
import { useStakingRewards } from '@/composables/useStakingRewards';
import { useWindowSize } from '@/composables/useWindowSize';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import { MIN_STAKE } from '../../lib/Constants';

import Amount from '../Amount.vue';
import RoundStakingIcon from '../icons/Staking/RoundStakingIcon.vue';
import ValidatorInfoBar from './tooltips/ValidatorInfoBar.vue';
import { SUCCESS_REDIRECT_DELAY, State } from '../StatusScreen.vue';
import { StatusChangeType } from './StakingModal.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import StakingRewardsChart from './StakingRewardsChart.vue';

import { sendStaking } from '../../hub';
import { useNetworkStore } from '../../stores/Network';
import { getNetworkClient } from '../../network';
import { reportToSentry } from '../../lib/Sentry';
import CircleArrowDownIcon from '../icons/Staking/CircleArrowDownIcon.vue';
import StakingRewardsListItem from '../StakingRewardsListItem.vue';
import CircleExclamationMarkIcon from '../icons/Staking/CircleExclamationMarkIcon.vue';

type Reward = {
    total: number,
    month: string,
    validators: string[],
    loading: boolean,
}

export default defineComponent({
    setup(props, context) {
        const { $t } = useI18n();
        const { activeAddress, activeAddressInfo } = useAddressStore();
        const { activeStake: stake, activeValidator: validator, restakingRewards } = useStakingStore();
        const { height, consensus, isFetchingTxHistory } = useNetworkStore();
        const { monthlyRewards } = useStakingRewards();
        const { isMobile } = useWindowSize();

        // Height of items in pixel
        const itemSize = computed(() => isMobile.value ? 68 : 72); // mobile: 64px + 4px margin between items
        const scrollerBuffer = 300;

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

        const rewards = computed(() => {
            const rew: Reward[] = [];

            // Display loading transactions
            if (!monthlyRewards.value.size && isFetchingTxHistory.value) {
                // create just as many placeholders that the scroller doesn't start recycling them because the loading
                // animation breaks for recycled entries due to the animation delay being off.
                const listHeight = window.innerHeight - 220; // approximated to avoid enforced layouting by offsetHeight
                const placeholderCount = Math.floor((listHeight + scrollerBuffer) / itemSize.value);
                for (let i = 0; i < placeholderCount; i++) {
                    rew.push({ total: 0, month: i.toString(), validators: [], loading: true });
                }
                return rew;
            }

            monthlyRewards.value.forEach((r, m, _map) => {
                rew.push({ total: r.total, month: m, validators: r.validators, loading: false });
            });
            return rew.reverse();
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
            selectedRange,
            rewards,
            itemSize,
            scrollerBuffer,
        };
    },
    components: {
        PageBody,
        PageFooter,
        PageHeader,
        RoundStakingIcon,
        Amount,
        Tooltip,
        CircleArrowDownIcon,
        CircleExclamationMarkIcon,
        ArrowRightSmallIcon,
        ValidatorInfoBar,
        FiatConvertedAmount,
        StakingRewardsChart,
        StakingRewardsListItem,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';
    @import '../../scss/variables.scss';

    @include scroll-mask(false, true, true);

    .staking-info-page {
        flex-grow: 1;
        height: 600px;
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
        padding: 0 2rem;
        position: relative;
        justify-content: space-between;
        flex-grow: 1;
        gap: 2rem;
    }

    .amounts {
        .round-staking-icon {
            width: 6rem;
            height: 6rem;
            margin-right: 1rem;
            flex-shrink: 0;
        }

        > * {
            justify-content: center;
        }
    }

    .rewards-and-chart {
        gap: 1rem;
        overflow-y: auto;

        @extend %custom-scrollbar;

        @media (max-width: $tabletBreakpoint) {
            padding: 0 2rem;
            margin: 0 -2rem;
        }

        h2 {
            margin: 2rem;
            font-size: 1.5rem;
        }

        .rewards {
            border-radius: 0.75rem;
            justify-items:left;
            padding-bottom: 2rem;

            h2 {
                color: white;
                opacity: 70%;
            }

            .amount-row {
                font-size: var(--body-size);
                font-weight: bold;
                line-height: 2.5rem;
                align-items: center;
                gap: 0.5rem;
            }

            .details-row {
                font-size: var(--small-size);
                font-weight: 600;
                line-height: 2.5rem;
                opacity: 0.7;
                align-items: center;
                gap: 0.75rem;
            }
        }

        .chart {
            position:relative;

            h2 { position: absolute }
        }
    }

    .history {
        position: relative;
        overflow: hidden;

        .scroll-mask {
            position: absolute;
            width: calc(100% - 1rem);
            left: 0;
        }

        .vue-recycle-scroller {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding-right: calc(2rem - 6px);
            padding-left: 2rem;
            // padding-bottom: 2rem;

            touch-action: pan-y;

            @extend %custom-scrollbar;
        }
    }

    .page-footer {
        padding: 3rem;
        box-shadow: 0 -3rem 2rem -1rem rgba(0, 0, 0, 0.05);

        .unstaking {
            align-items: center;
            color: var(--nimiq-light-blue);
            font-size: 2rem;
            font-weight: 600;
            gap: 0.75rem;

            svg {
                flex-shrink: 0;
            }

            .amount {
                text-overflow: ellipsis;
                overflow: hidden;
            }
        }
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
        margin-bottom: .5rem;
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

    .horizontal-separator {
        width: 100%;
        height: 0.1875rem;
        border-top: 0.1875rem solid var(--nimiq-blue);
        opacity: 0.2;

        margin-top: 1rem;
        margin-bottom: 1rem;
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

.dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: currentColor;
    margin: 0 0.25rem;
}

.hidden {
    display: none;
    visibility: unset;
}

@media (max-width: $mobileBreakpoint) {
    .sm-hidden {
        display: none;
    }
    .sm-visible {
        display: block;
    }
}

// @media (max-width: 375px) {
// }
</style>

<template>
    <div class="reset staking-reward-item" @click="openRewardsHistory">
        <div class="info">
            <div class="title flex-row">
                <!-- eslint-disable max-len -->
                <svg v-if="!hideIcon" class="staking-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M10 20c5.523 0 10-4.477 10-10S15.523 0 10 0 0 4.477 0 10s4.477 10 10 10ZM5.125 4.75a.833.833 0 0 0-.834.833c0 1.568.16 3.175.979 4.395.757 1.129 1.975 1.789 3.715 1.948v3.472a.833.833 0 1 0 1.667 0v-1.759c1.59-.129 2.925-.646 3.899-1.62 1.138-1.138 1.652-2.77 1.652-4.728a.833.833 0 0 0-.833-.833c-.987 0-1.888.023-2.667.153-.787.13-1.516.38-2.118.879a3.288 3.288 0 0 0-.238.218 4.111 4.111 0 0 0-.54-1.202C8.94 5.222 7.391 4.75 5.125 4.75Zm3.751 4.072c.059.417.087.89.1 1.428-1.27-.146-1.933-.621-2.323-1.201-.417-.621-.613-1.49-.673-2.604 1.493.108 2.12.51 2.446.994.213.316.362.755.45 1.383Zm4.496 2.019c-.595.596-1.472.998-2.698 1.123.087-1.938.472-2.774.976-3.192.292-.242.702-.413 1.326-.517.431-.072.932-.106 1.52-.121-.124 1.23-.527 2.11-1.124 2.707Z"
                        fill="url(#a)" />
                    <defs>
                        <radialGradient id="a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
                            gradientTransform="matrix(-20 0 0 -20 20 20)">
                            <stop stop-color="#41A38E" />
                            <stop offset="1" stop-color="#21BCA5" />
                        </radialGradient>
                    </defs>
                </svg>
                <!-- eslint-enable max-len -->
                <span v-if="!hideMonth">{{ monthLabel }}</span>
                <span v-else>{{ $t('Staking rewards') }}</span>
            </div>
            <div class="details flex-row">
                <template v-if="showOngoingIndicator">
                    <TextShimmer>{{ $t('Ongoing') }}</TextShimmer>
                    &nbsp;<div class="dot"></div>&nbsp;
                </template>
                <i18n path="Paid out by {validator}" tag="span" class="flex-row">
                    <template v-slot:validator>
                        <span
                            v-for="validator in validators"
                            :key="validator.address"
                            class="validator-icon-container"
                        >
                            <ValidatorIcon :validator="validator" />
                        </span>
                        <span v-if="validators.length">
                            {{ 'name' in validators[0] ? validators[0].name : validators[0].address }}
                            <span v-if="validators.length > 1" class="validator-count">
                                {{ $t('+{validatorCount} more', { validatorCount: validators.length - 1 }) }}
                            </span>
                        </span>
                    </template>
                </i18n>
            </div>
        </div>
        <div class="amounts isIncoming">
            <Amount :amount="monthlyReward" class="amount"/>
            <!-- HIDDEN TEMPORARILY: Show fiat value only in detailed modal for monthly rewards
            <FiatConvertedAmount :amount="monthlyReward" class="fiat-amount"/>
            -->
            <div class="fiat-amount">&nbsp;</div> <!-- Remove this once we show the fiat value again -->
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { useRouter, RouteName } from '@/router';
import { useStakingStore } from '@/stores/Staking';
import { isCurrentMonthAndStakingOngoing, getMonthLabel } from '../lib/StakingUtils';
import ValidatorIcon from './staking/ValidatorIcon.vue';
import Amount from './Amount.vue';
import TextShimmer from './staking/TextShimmer.vue';

export default defineComponent({
    name: 'StakingRewardsListItem',
    props: {
        hideIcon: {
            type: Boolean,
            required: false,
            default: false,
        },
        hideMonth: {
            type: Boolean,
            required: false,
            default: false,
        },
        monthlyReward: {
            type: Number,
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
        validatorsAddresses: {
            type: Array as () => string[],
            required: true,
        },
    },
    setup(props) {
        const router = useRouter();
        const { validators: validatorList } = useStakingStore();

        const monthLabel = computed(() => getMonthLabel(props.month));
        const validators = computed(() => props.validatorsAddresses.map(
            (validator) => validatorList.value[validator] || { address: validator }),
        );

        // Check if we should show the "Ongoing" indicator
        const showOngoingIndicator = computed(() => isCurrentMonthAndStakingOngoing(props.month));

        // Currently unused, as The Reward history is much too large
        const openRewardsHistory = () => {
            // Since StakingRewardsModal is now integrated as a page in StakingModal,
            // we no longer need to disable transitions or pass canUserGoBack param
            router.push({
                name: RouteName.StakingRewards,
                params: {
                    month: props.month,
                },
            });
        };

        return {
            openRewardsHistory,
            monthLabel,
            validators,
            showOngoingIndicator,
        };
    },
    components: {
        Amount,
        ValidatorIcon,
        TextShimmer,
    },
});
</script>

<style scoped lang="scss">
@import "../scss/variables.scss";

.staking-reward-item {
    display: flex;
    align-items: center;
    // align-items: flex-start;
    flex-direction: row;
    width: 100%;
    padding: 1.5rem 1rem;
    border: 0;
    background: transparent;
    border-radius: .75rem;
    font-size: var(--body-size);
    cursor: pointer;
    transition: background 400ms var(--nimiq-ease);

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }

    > * {
        margin: 0rem 1rem;
    }

    .staking-icon {
        --size: 20px;
        width: var(--size);
        height: var(--size);

        margin-right: 0.8rem;
    }

    .info {
        flex-grow: 1;
        overflow: hidden;
        line-height: 1.4;
        margin-left: 0;

        .title {
            white-space: nowrap;
            font-weight: 600;
        }

        .details {
            font-size: var(--small-size);
            font-weight: 600;
            color: var(--text-50);
            white-space: nowrap;
            align-items: center;

            & > span:last-child {
                align-items: center;
                overflow: hidden;
            }

            .dot {
                width: 3px;
                height: 3px;
                border-radius: 50%;
                background-color: currentColor;
                margin: 0 0.25rem;
                flex-shrink: 0;
            }

            .validator-icon-container {
                position: relative;

                &:before {
                    content: "";
                    display: block;
                    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
                    background: white;
                    height: 100%;
                    width: 100%;
                    flex-shrink: 0;
                    position: absolute;
                    top: 0;
                    left: -2px;
                }

                img,
                .validator-icon{
                    --size: 1.5rem;
                    position: relative;
                }

                img.validator-icon { transform: translateY(.4px) }

                &:not(:last-child) { margin-right: -.75rem }
            }

            & > span > span:first-child { margin-left: 0.8rem }
            & > span > span:last-child {
                margin-left: 1.2rem;
                text-overflow: ellipsis;
                overflow: hidden;
            }
        }
    }

    .amounts {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: 1.4;

        .amount {
            --size: var(--body-size);
            font-weight: bold;
            margin-bottom: 0.5rem;
            padding: 0.25rem 0;
        }

        .fiat-amount {
            --size: var(--small-size);
            font-size: var(--size);
            font-weight: 600;
            opacity: 0.4;
            align-items: center;
            line-height: 1;
            white-space: nowrap;
            text-align: right;
        }

        &.isIncoming {
            .amount {
                color: var(--nimiq-green);
                background: rgba(33, 188, 165, 0.1);
                border-radius: 0.5rem;
                padding: 0.25rem 0.75rem;
                margin-right: -0.75rem;

                &::before {
                    content: '+';
                    margin-right: -0.1em;
                }
            }
        }
    }
}

@media (max-width: $mobileBreakpoint) {
    .staking-reward-item {
        padding: 1rem 1rem;

        > * {
            margin: 0rem 0.75rem;
        }

        .staking-icon-container {
            width: 5.5rem;
            height: 5.5rem;

            .staking-icon {
                width: 5rem;
                height: 5rem;
                margin: 0.25rem;
            }
        }
    }
}
</style>

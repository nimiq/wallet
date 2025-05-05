<template>
    <button class="reset staking-reward-item" @click="openRewardsHistory">
        <div class="staking-icon-container">
            <StakingIcon class="staking-icon"/>
        </div>
        <div class="info">
            <div class="title">{{ monthLabel }} staking rewards</div>
            <div class="transaction-count">
                <span>{{ transactionCount }} transactions</span>
            </div>
        </div>
        <div class="amounts isIncoming">
            <Amount :amount="monthlyReward" class="amount"/>
            <FiatConvertedAmount :amount="monthlyReward" class="fiat-amount"/>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { useRouter } from '@/router';
import { useI18n } from '@/lib/useI18n';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import StakingIcon from './icons/Staking/StakingIcon.vue';

export default defineComponent({
    name: 'StakingRewardsListItem',
    props: {
        monthlyReward: {
            type: Number,
            required: true,
        },
        transactionCount: {
            type: Number,
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const router = useRouter();
        const { $t, locale } = useI18n();

        const monthLabel = computed(() => {
            const [year, month] = props.month.split('-');
            const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
            const now = new Date();

            // Check if it's the current month
            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                return $t('This month');
            }

            return new Intl.DateTimeFormat(locale, {
                month: 'long',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            }).format(date);
        });

        const openRewardsHistory = () => {
            router.push({
                name: 'staking-rewards-history',
                params: { month: props.month },
            });
        };

        return {
            openRewardsHistory,
            monthLabel,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        StakingIcon,
    },
});
</script>

<style scoped lang="scss">
@import "../scss/variables.scss";

.staking-reward-item {
    display: flex;
    align-items: center;
    flex-direction: row;
    width: 100%;
    padding: 1.5rem 1rem;
    border: 0;
    background: transparent;
    border-radius: .75rem;
    cursor: pointer;
    transition: background 400ms var(--nimiq-ease);
    font-size: var(--body-size);

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }

    > * {
        margin: 0rem 1rem;
    }

    .staking-icon-container {
        position: relative;
        width: 6rem;
        height: 6rem;
        flex-shrink: 0;

        .staking-icon {
            width: 6rem;
            height: 6rem;
            padding: 0.375rem;
            color: var(--nimiq-green);
            display: block;
        }
    }

    .info {
        flex-grow: 1;
        overflow: hidden;
        line-height: 1.4;

        .title {
            white-space: nowrap;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
            font-weight: 600;
        }

        .transaction-count {
            font-size: var(--small-size);
            font-weight: 600;
            color: var(--text-50);
            white-space: nowrap;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
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

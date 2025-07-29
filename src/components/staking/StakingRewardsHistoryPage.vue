<template>
    <div class="staking-rewards-history-page flex-column">
        <PageHeader>
            {{ month ? $t('{month}. Staking Rewards', { month: formatMonthTitle(month) }) : $t('Staking Rewards') }}
        </PageHeader>
        <PageBody class="flex-column">
            <div v-if="filteredStakingEvents && filteredStakingEvents.length > 0" class="rewards-list">
                <div class="scroll-mask top"></div>
                <div
                    v-for="event in filteredStakingEvents"
                    :key="event.date"
                    class="reset transaction"
                >
                    <div class="date">
                        <span class="day">{{ getFormattedDate(event.date).dateDay.value }}</span><br>
                        <span class="month">{{ getFormattedDate(event.date).dateMonth.value }}</span>
                    </div>
                    <div class="identicon">
                        <ValidatorIcon
                            :validator="validators[event.sender_address] || { address: event.sender_address }" />
                    </div>
                    <div class="data">
                        <div class="label">{{ getValidatorName(event.sender_address) || 'Staking Reward' }}</div>
                        <div class="time-and-message">
                            <span>{{ getFormattedDate(event.date).dateTime.value }}</span>
                        </div>
                    </div>
                    <div class="amounts isIncoming">
                        <Amount :amount="event.value" value-mask/>
                        <FiatConvertedAmount :amount="event.value" class="fiat-amount" value-mask/>
                    </div>
                </div>
                <div class="scroll-mask bottom"></div>
            </div>
            <div v-else class="no-rewards flex-column">
                <img src="/img/staking/no-rewards.svg" alt="No Rewards" />
                <h2>{{ $t('No rewards yet') }}</h2>
                <p>{{ $t('Your rewards will appear here once you start staking.') }}</p>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { useStakingStore, StakingEvent } from '../../stores/Staking';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import ValidatorIcon from './ValidatorIcon.vue';
import { useSettingsStore } from '../../stores/Settings';
import { useFormattedDate } from '../../composables/useFormattedDate';

export default defineComponent({
    name: 'StakingRewardsHistoryPage',
    props: {
        month: {
            type: String,
            default: '',
            validator: (value: string) => {
                if (!value) return true;
                const date = new Date(value);
                return !Number.isNaN(date.getTime());
            },
        },
    },
    setup(props) {
        const { stakingEvents, validators } = useStakingStore();
        const { language } = useSettingsStore();

        const monthFormatter = computed(() => new Intl.DateTimeFormat(language.value, { month: 'short' }));

        function formatMonthTitle(dateString: string) {
            const [year, month] = dateString.split('-');
            const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
            return monthFormatter.value.format(date);
        }

        const sortedStakingEvents = computed(() => {
            const events = stakingEvents.value as StakingEvent[] | null;
            if (!events) return [];
            // Sort by date descending
            return [...events]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as any[];
        });

        const filteredStakingEvents = computed(() => {
            if (!props.month) return sortedStakingEvents.value;

            const [year, month] = props.month.split('-');
            const targetMonth = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
            return sortedStakingEvents.value.filter((event) => {
                const eventDate = new Date(event.date);
                return eventDate.getMonth() === targetMonth.getMonth()
                    && eventDate.getFullYear() === targetMonth.getFullYear();
            });
        });

        function getValidatorName(address: string) {
            const validator = validators.value[address];
            return validator && 'name' in validator ? validator.name : null;
        }

        function getFormattedDate(dateString: string) {
            const timestamp = ref(new Date(dateString).getTime());
            return useFormattedDate(timestamp);
        }

        return {
            stakingEvents,
            sortedStakingEvents,
            filteredStakingEvents,
            getFormattedDate,
            getValidatorName,
            validators,
            formatMonthTitle,
        };
    },
    components: {
        PageHeader,
        PageBody,
        Amount,
        FiatConvertedAmount,
        ValidatorIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";
@import "../../scss/mixins.scss";

@include scroll-mask(true, true, true);

.staking-rewards-history-page {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 80vh;
    overflow: hidden;
}

.page-body {
    padding: 1rem 0;
    flex-grow: 1;
    position: relative;
    min-height: 0;
    overflow: hidden;
}

.rewards-list {
    width: 100%;
    padding: 0 2rem;
    overflow-y: auto;
    position: relative;
    height: 100%;
    min-height: 0;

    @extend %custom-scrollbar;
}

.transaction {
    display: flex;
    align-items: center;
    flex-direction: row;
    width: 100%;
    padding: 1.5rem 1rem;
    border: 0;
    background: transparent;
    border-radius: .75rem;
    // cursor: pointer;
    transition: background 400ms var(--nimiq-ease);
    font-size: var(--body-size);
    text-align: left;

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }

    > * {
        margin: 0rem 1rem;
    }

    .date {
        font-weight: bold;
        text-transform: uppercase;
        opacity: 0.4;
        flex-grow: 0;
        letter-spacing: 0.0125em;
        line-height: 1;
        flex-shrink: 0;
        width: 3.75rem;
        text-align: center;

        > .month {
            font-size: var(--small-label-size);
            letter-spacing: 0.0667em;
            text-transform: uppercase;
        }
    }

    .identicon {
        position: relative;
        width: 6rem;
        height: 6rem;
        flex-shrink: 0;

        svg {
            width: 6rem;
            height: 6rem;
            padding: 0.375rem;
        }
    }

    .data {
        flex-grow: 1;
        overflow: hidden;
        line-height: 1.4;

        .label {
            white-space: nowrap;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
            font-weight: 600;
        }

        .time-and-message {
            font-size: var(--small-size);
            font-weight: 600;
            color: var(--text-50);
            white-space: nowrap;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }
    }

    .amounts {
        --fiat-amount-height: 2.5rem;
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
            }

            .amount::before {
                content: '+';
                margin-right: -0.1em;
            }
        }
    }
}

@media (max-width: $mobileBreakpoint) {
    .transaction {
        padding: 1rem 1rem;

        > * {
            margin: 0rem 0.75rem;
        }

        .identicon {
            width: 5.5rem;
            height: 5.5rem;

            svg {
                width: 5rem;
                height: 5rem;
                margin: 0.25rem;
            }
        }
    }
}

.no-rewards {
    flex-grow: 1;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    padding: 4rem 0;

    img {
        width: 12rem;
        height: auto;
    }

    h2 {
        font-size: var(--h2-size);
        font-weight: bold;
        margin: 0;
    }

    p {
        font-size: var(--small-size);
        color: var(--text-60);
        margin: 0;
    }
}
</style>

<template>
    <div class="validators-list-overlay">
        <div class="scroll-container">
            <PageHeader>
                {{ $t('Multiple Validators') }}
            </PageHeader>
            <PageBody class="flex-column">
                <div class="validator-list">
                    <div
                        v-for="validatorReward in validatorRewards"
                        :key="validatorReward.validator.address"
                        class="validator-item"
                        @click="$emit('select-validator', validatorReward.validator)"
                    >
                        <ValidatorIcon :validator="validatorReward.validator" />
                        <div class="validator-info">
                            <div class="validator-name-row">
                                <span v-if="'name' in validatorReward.validator" class="validator-name">
                                    {{ validatorReward.validator.name }}
                                </span>
                                <ShortAddress v-else :address="validatorReward.validator.address" />
                            </div>
                            <div class="validator-date-row">
                                {{ validatorReward.dateLabel }}
                            </div>
                        </div>
                        <div class="reward-info">
                            <Amount
                                class="reward-amount nq-green"
                                :amount="validatorReward.amount"
                                value-mask
                            />
                            <div class="fiat-amount">
                                <FiatAmount
                                    v-if="validatorReward.fiatValue !== undefined
                                        && validatorReward.fiatValue !== constants.FIAT_PRICE_UNAVAILABLE"
                                    :amount="validatorReward.fiatValue"
                                    :currency="fiatCurrency"
                                    value-mask
                                />
                                <span v-else-if="validatorReward.fiatValue === constants.FIAT_PRICE_UNAVAILABLE"
                                    class="unavailable">
                                    {{ $t('unavailable') }}
                                </span>
                                <div v-else class="fiat-loading-placeholder"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </PageBody>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { PageHeader, PageBody, FiatAmount } from '@nimiq/vue-components';
import { useFiatStore } from '@/stores/Fiat';
import { getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { CryptoCurrency, FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, FIAT_PRICE_UNAVAILABLE } from '@/lib/Constants';
import { Validator, useStakingStore, AggregatedRestakingEvent } from '../../stores/Staking';
import { useI18n } from '../../lib/useI18n';
import { buildRewardsByValidatorMap } from '../../lib/StakingUtils';
import ValidatorIcon from './ValidatorIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import Amount from '../Amount.vue';

type ValidatorReward = {
    validator: Validator | { address: string },
    amount: number,
    dateLabel: string,
    fiatValue?: number | typeof FIAT_PRICE_UNAVAILABLE,
};

export default defineComponent({
    props: {
        validators: {
            type: Array as () => Array<Validator | { address: string }>,
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const { stakingEvents } = useStakingStore();
        const { currency: preferredFiatCurrency } = useFiatStore();
        const { $t, locale } = useI18n();
        const constants = { FIAT_PRICE_UNAVAILABLE };

        const fiatCurrency = computed<FiatCurrency>(() => isHistorySupportedFiatCurrency(
            preferredFiatCurrency.value,
            FIAT_API_PROVIDER_TX_HISTORY,
        ) ? preferredFiatCurrency.value : FiatCurrency.USD);

        // Get events for this month
        const monthEvents = computed(() => {
            const monthKey = props.month;
            return (stakingEvents.value || []).filter((event) => event.time_window.startsWith(monthKey));
        });

        // Calculate per-validator rewards
        const validatorRewards = ref<ValidatorReward[]>([]);

        const calculateValidatorRewards = () => {
            const events = monthEvents.value;
            if (!events.length) {
                validatorRewards.value = [];
                return;
            }

            // Group rewards by validator
            const rewardsByValidator = buildRewardsByValidatorMap(events);

            // Build validator rewards list immediately (without fiat values)
            const rewards: ValidatorReward[] = [];
            for (const validator of props.validators) {
                const validatorData = rewardsByValidator.get(validator.address);
                if (!validatorData) continue;

                // Determine date label based on first and last event
                const sortedTimestamps = [...validatorData.timestamps].sort((a, b) => a - b);
                const firstDate = new Date(sortedTimestamps[0]);
                const lastDate = new Date(sortedTimestamps[sortedTimestamps.length - 1]);
                const isOngoing = lastDate.getMonth() === new Date().getMonth()
                    && lastDate.getFullYear() === new Date().getFullYear();

                let dateLabel = '';
                if (sortedTimestamps.length === 1 || firstDate.getDate() === lastDate.getDate()) {
                    const month = firstDate.toLocaleString(locale, { month: 'short' });
                    dateLabel = `${firstDate.getDate()} ${month}`;
                } else {
                    const firstDay = firstDate.getDate();
                    const lastDay = lastDate.getDate();
                    const month = firstDate.toLocaleString(locale, { month: 'short' });
                    if (isOngoing) {
                        dateLabel = $t('From {day} {month}', { day: firstDay, month }).toString();
                    } else {
                        dateLabel = $t('Until {day} {month}', { day: lastDay, month }).toString();
                    }
                }

                rewards.push({
                    validator,
                    amount: validatorData.amount,
                    dateLabel,
                    fiatValue: undefined, // Load fiat values asynchronously
                });
            }

            // Render list immediately
            validatorRewards.value = rewards;

            // Load fiat values asynchronously in the background
            loadFiatValues(events, rewardsByValidator);
        };

        const loadFiatValues = async (
            events: readonly AggregatedRestakingEvent[],
            rewardsByValidator: Map<string, { amount: number, timestamps: number[] }>,
        ) => {
            // Get historic fiat rates for all timestamps
            const allTimestamps = Array.from(rewardsByValidator.values())
                .flatMap((data) => data.timestamps);
            const ratesMap = await getHistoricExchangeRates(
                CryptoCurrency.NIM,
                fiatCurrency.value,
                allTimestamps,
                FIAT_API_PROVIDER_TX_HISTORY,
            );

            const eventsByKey = new Map<string, AggregatedRestakingEvent>();
            for (const event of events) {
                const timestamp = new Date(event.time_window).getTime();
                const key = `${timestamp}-${event.sender_address}`;
                eventsByKey.set(key, event);
            }

            // Update fiat values for each validator
            const updatedRewards = validatorRewards.value.map((reward) => {
                const validatorData = rewardsByValidator.get(reward.validator.address);
                if (!validatorData) return reward;

                // Calculate fiat value
                let fiatValue: number | typeof FIAT_PRICE_UNAVAILABLE = 0;
                for (const timestamp of validatorData.timestamps) {
                    const rate = ratesMap.get(timestamp);
                    if (rate === undefined) {
                        fiatValue = FIAT_PRICE_UNAVAILABLE;
                        break;
                    }

                    const key = `${timestamp}-${reward.validator.address}`;
                    const event = eventsByKey.get(key);
                    if (event) {
                        fiatValue += rate * (event.aggregated_value / 1e5);
                    }
                }

                return {
                    ...reward,
                    fiatValue: fiatValue === FIAT_PRICE_UNAVAILABLE ? FIAT_PRICE_UNAVAILABLE : fiatValue,
                };
            });

            validatorRewards.value = updatedRewards;
        };

        // Recalculate rewards when month, validators, or events change
        watch([
            () => props.month,
            () => props.validators,
            () => monthEvents.value.length,
        ], calculateValidatorRewards, { lazy: false });

        // Reload fiat values when currency changes (without recalculating the entire list)
        watch(() => fiatCurrency.value, () => {
            const events = monthEvents.value;
            if (!events.length) return;

            // Rebuild rewardsByValidator map
            const rewardsByValidator = buildRewardsByValidatorMap(events);

            loadFiatValues(events, rewardsByValidator);
        });

        return {
            validatorRewards,
            fiatCurrency,
            constants,
        };
    },
    components: {
        PageHeader,
        PageBody,
        ValidatorIcon,
        ShortAddress,
        Amount,
        FiatAmount,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
@import '../../scss/functions.scss';

.validators-list-overlay {
    height: 100%;
    max-height: 100%;
}

.scroll-container {
    height: 100%;
    overflow-y: auto;

    @extend %custom-scrollbar;
}

.page-header {
    padding: 4rem 2rem;

    ::v-deep h1 {
        font-size: 3rem;
    }
}

.page-body {
    overflow-x: hidden;
    padding: 0 2rem 4rem;
}

.validator-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.validator-item {
    display: flex;
    align-items: center;
    padding: 2rem 2.25rem;
    background: transparent;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: background-color 400ms var(--nimiq-ease);
    min-height: 9.25rem;
    box-sizing: border-box;

    &:hover {
        background: #f2f2f4;
    }

    .validator-icon {
        --size: 6rem;
        flex-shrink: 0;
    }

    .validator-info {
        flex-grow: 1;
        margin-left: 2.25rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;

        .validator-name-row {
            line-height: 3rem;
            margin-bottom: 0;

            .validator-name {
                font-size: var(--body-size);
                font-weight: 600;
                color: var(--nimiq-blue);
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .short-address {
                justify-content: flex-start;
                font-weight: 500;
            }
        }

        .validator-date-row {
            color: var(--text-50);
            font-size: var(--small-size);
            font-weight: 600;
            line-height: 2rem;
        }
    }

    .reward-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
        margin-left: 2rem;

        .reward-amount {
            font-size: var(--body-size);
            font-weight: bold;
            line-height: 3rem;

            &::before {
                content: '+ ';
            }

            ::v-deep .currency {
                font-weight: bold;
                margin-left: 0.25em;
            }
        }

        .fiat-amount {
            font-size: var(--small-size);
            font-weight: 600;
            color: var(--text-50);
            line-height: 2rem;
            min-height: 2rem;
            display: flex;
            align-items: center;
            justify-content: flex-end;

            .unavailable {
                font-size: var(--small-size);
                opacity: 0.5;
            }

            .fiat-loading-placeholder {
                width: 5rem;
                height: 1.25rem;
                background-color: var(--text-6);
                border-radius: 0.5rem;
                animation: breathing 1s infinite;
            }

            @keyframes breathing {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
        }
    }
}
</style>

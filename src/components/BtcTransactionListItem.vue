<template>
    <button
        class="reset transaction"
        :class="state"
        @click="$router.push({name: 'btc-transaction', params: {hash: transaction.transactionHash}})"
        :key="`tx-${transaction.transactionHash}`"
    >
        <div v-if="state === TransactionState.MINED || state === TransactionState.CONFIRMED" class="date">
            <span class="day">{{ dateDay }}</span><br>
            <span class="month">{{ dateMonth }}</span>
        </div>
        <div v-else-if="state === TransactionState.PENDING" class="pending">
            <CircleSpinner/>
        </div>
        <div
            v-else-if="state === TransactionState.INVALIDATED"
            class="invalid nq-red"
        >
            <CrossIcon/>
        </div>
        <div v-else-if="state === TransactionState.NEW" class="new nq-orange">
            <AlertTriangleIcon/>
        </div>
        <div v-if="swapInfo" class="identicon-container">
            <Identicon
                v-if="swapData && swapData.asset === SwapAsset.NIM && swapTransaction"
                :address="peerAddresses[0]"
            />
            <UsdcIcon v-else-if="swapData && swapData.asset === SwapAsset.USDC"/>
            <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
            <Avatar v-else :label="!isCancelledSwap ? peerLabel || '' : ''"/>
            <SwapSmallIcon/>
        </div>
        <Avatar v-else :label="peerLabel || ''"/>
        <div class="data">
            <div v-if="peerLabel" class="label">{{ peerLabel }}</div>
            <div v-else class="address">
                {{ peerAddresses[0] }}
                <small v-if="peerAddresses.length > 1">+{{ peerAddresses.length - 1 }}</small>
            </div>

            <div class="time-and-message">
                <span v-if="state === TransactionState.NEW">{{ $t('not sent') }}</span>
                <span v-else-if="state === TransactionState.PENDING">{{ $t('pending') }}</span>
                <span v-else-if="state === TransactionState.INVALIDATED">{{ $t('invalid') }}</span>
                <span v-else-if="dateTime">{{ dateTime }}</span>

                <span v-if="data" class="message">
                    <strong class="dot">&middot;</strong>{{ data }}
                    <TransactionListOasisPayoutStatus
                        v-if="swapData && swapData.asset === SwapAsset.EUR"
                        :data="swapData"/>
                </span>
            </div>

        </div>
        <div class="amounts" :class="{isIncoming}">
            <Amount :amount="isIncoming ? amountReceived : amountSent" currency="btc" value-mask/>
            <transition v-if="!swapData || swapData.asset !== SwapAsset.EUR" name="fade">
                <FiatConvertedAmount v-if="state === TransactionState.PENDING"
                    :amount="isIncoming ? amountReceived : amountSent" currency="btc" value-mask
                />
                <div v-else-if="fiatValue === undefined" class="fiat-amount">&nbsp;</div>
                <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                    {{ $t('Fiat value unavailable') }}
                </div>
                <div v-else class="fiat-amount flex-row">
                    <!-- <HistoricValueIcon/> -->
                    <FiatAmount :amount="fiatValue" :currency="fiatCurrency" value-mask/>
                </div>
            </transition>
            <FiatAmount v-else-if="swapData.asset === SwapAsset.EUR"
                :amount="(swapData.amount / 100)
                    - ((swapInfo && swapInfo.fees && swapInfo.fees.totalFee) || 0)
                    * (isIncoming ? 1 : -1)"
                :currency="swapData.asset.toLowerCase()" value-mask/>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import {
    CircleSpinner,
    AlertTriangleIcon,
    FiatAmount,
    CrossIcon,
    Identicon,
} from '@nimiq/vue-components';
import { TransactionState } from '@nimiq/electrum-client';
import { SwapAsset } from '@nimiq/fastspot-api';
import { useFiatStore } from '../stores/Fiat';
import { Transaction } from '../stores/BtcTransactions';
import { twoDigit } from '../lib/NumberFormatting';
import Avatar from './Avatar.vue';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
// import HistoricValueIcon from './icons/HistoricValueIcon.vue';
import UsdcIcon from './icons/UsdcIcon.vue';
import BankIcon from './icons/BankIcon.vue';
import SwapSmallIcon from './icons/SwapSmallIcon.vue';
import { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS } from '../lib/Constants';
import { useBtcTransactionInfo } from '../composables/useBtcTransactionInfo';
import TransactionListOasisPayoutStatus from './TransactionListOasisPayoutStatus.vue';

export default defineComponent({
    props: {
        transaction: {
            type: Object as () => Transaction,
            required: true,
        },
    },
    setup(props, context) {
        const constants = { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS };

        const state = computed(() => props.transaction.state);

        const transaction = computed(() => props.transaction);

        const {
            amountReceived,
            amountSent,
            data,
            isCancelledSwap,
            isIncoming,
            peerAddresses,
            peerLabel,
            outputsReceived,
            outputsSent,
            swapData,
            swapInfo,
            swapTransaction,
        } = useBtcTransactionInfo(transaction);

        // Date
        const date = computed(() => props.transaction.timestamp && new Date(props.transaction.timestamp * 1000));
        const dateDay = computed(() => date.value && twoDigit(date.value.getDate()));
        const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const dateMonth = computed(() => date.value && MONTHS[date.value.getMonth()]);
        const dateTime = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Fiat currency
        const { currency: fiatCurrency } = useFiatStore();

        const fiatValue = computed(() => {
            const outputsToCount = isIncoming.value ? outputsReceived.value : outputsSent.value;
            let value = 0;
            for (const output of outputsToCount) {
                if (!output.fiatValue || output.fiatValue[fiatCurrency.value] === undefined) return undefined;
                if (output.fiatValue[fiatCurrency.value] === FIAT_PRICE_UNAVAILABLE) return FIAT_PRICE_UNAVAILABLE;
                value += output.fiatValue[fiatCurrency.value]!;
            }
            return value;
        });

        return {
            constants,
            state,
            TransactionState,
            dateDay,
            dateMonth,
            dateTime,
            data,
            amountReceived,
            amountSent,
            fiatCurrency,
            fiatValue,
            isIncoming,
            peerAddresses,
            peerLabel,
            SwapAsset,
            swapInfo,
            swapData,
            swapTransaction,
            isCancelledSwap,
        };
    },
    components: {
        CircleSpinner,
        CrossIcon,
        AlertTriangleIcon,
        Avatar,
        Amount,
        FiatConvertedAmount,
        FiatAmount,
        // HistoricValueIcon,
        Identicon,
        UsdcIcon,
        BankIcon,
        SwapSmallIcon,
        TransactionListOasisPayoutStatus,
    },
});
</script>

<style scoped lang="scss">
svg {
    display: block;
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
    cursor: pointer;
    transition: background 400ms var(--nimiq-ease);
    font-size: var(--body-size);

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);

        .identicon-container > svg:last-child {
            border-color: #F2F2F4;
        }
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

        > .month {
            font-size: var(--small-label-size);
            letter-spacing: 0.0667em;
        }
    }

    .date,
    .pending,
    .new,
    .invalid {
        width: 3.75rem;
        text-align: center;
        flex-shrink: 0;
    }

    .pending,
    .new,
    .invalid {
        ::v-deep svg {
            margin: 0 auto;
        }
    }

    ::v-deep .circle-spinner {
        display: block;
    }

    .avatar {
        flex-shrink: 0;
        margin: 0.375rem 1.375rem;
    }

    .identicon-container {
        position: relative;

        .identicon {
            width: 6rem;
            height: 6rem;
            flex-shrink: 0;
        }

        > svg {
            width: 6rem;
            height: 6rem;
            padding: 0.375rem;

            &.usdc {
                color: var(--usdc-blue);
            }
        }

        > svg:last-child {
            position: absolute;
            right: -0.125rem;
            bottom: -0.375rem;

            width: 2.75rem; // 3rem + border
            height: 2.75rem;
            padding: 0;
            color: white;
            background: var(--nimiq-blue-bg);
            border-radius: 50%;
            border: 0.375rem solid var(--bg-primary);
            transition: border-color 400ms var(--nimiq-ease);
        }

        .avatar {
            margin: .375rem;
        }
    }

    .data {
        flex-grow: 1;
        overflow: hidden;
        line-height: 1.4;

        .label,
        .address {
            white-space: nowrap;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }

        .label {
            font-weight: 600;
        }

        .address {
            font-family: 'Fira Mono', monospace;
            word-spacing: -0.2em;

            small {
                color: var(--text-50);
                font-weight: 500;
                margin-left: -0.25em;
                font-size: var(--small-size);
            }
        }

        .time-and-message {
            font-size: var(--small-size);
            font-weight: 600;
            opacity: .5;
            white-space: nowrap;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));

            .dot {
                margin: 0 0.875rem;
                opacity: 0.6;
            }
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

        > .fiat-amount {
            --size: var(--small-size);
            font-size: var(--size);
            font-weight: 600;
            opacity: 0.4;
            align-items: center;
            line-height: 1;

            svg {
                margin-right: 0.5rem;
                opacity: 0.75;
            }

            &.fade-enter-active {
                position: relative;
                top: calc(-1 * var(--fiat-amount-height));
            }

            &.loading {
                min-height: var(--fiat-amount-height); // to avoid jumping when fiat value loaded
            }
        }

        > * {
            white-space: nowrap;
            text-align: right;
        }

        &:not(.isIncoming) {
            .amount {
                opacity: 0.6;
            }

            .amount::before {
                content: '-';
                margin-right: -0.1em;
            }
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

    &.expired,
    &.invalidated {
        .avatar {
            filter: saturate(0);
            opacity: 0.5;
        }

        .data,
        .amounts {
            opacity: 0.5;
        }

        .amounts {
            text-decoration: line-through;
        }
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .transaction {
        padding: 1rem 1rem;

        > * {
            margin: 0rem 0.75rem;
        }

        .avatar {
            width: 5rem;
            height: 5rem;
            font-size: 2.25rem;
            margin: 0.25rem 1rem;
        }

        .identicon-container {
            .identicon {
                width: 5.5rem;
                height: 5.5rem;
            }

            > svg {
                border-width: 0.25rem;
                height: 2.5rem;
                width: 2.5rem;
            }
        }
    }
}
</style>

<template>
    <button
        class="reset transaction"
        :class="state"
        @click="$router.push({name: 'usdc-transaction', params: {hash: transaction.transactionHash}})"
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
            v-else-if="state === TransactionState.EXPIRED || state === TransactionState.FAILED"
            class="invalid nq-red"
        >
            <CrossIcon/>
        </div>
        <div v-else-if="state === TransactionState.NEW" class="new nq-orange">
            <AlertTriangleIcon/>
        </div>
        <div class="identicon">
            <BitcoinIcon v-if="swapData && swapData.asset === SwapAsset.BTC"/>
            <Identicon v-else-if="swapData && swapData.asset === SwapAsset.NIM" :address="peerAddress" />
            <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
            <UsdcIcon v-else-if="transaction.event && transaction.event.name === 'Swap'" class="nq-blue" />
            <Avatar v-else :label="isCancelledSwap ? '' : (peerLabel || '')"/>
            <div v-if="swapInfo /* || isSwapProxy */
                || (transaction.event && transaction.event.name === 'Swap')" class="swap"><SwapSmallIcon/></div>
        </div>
        <div class="data">
            <div v-if="peerLabel" class="label">{{ peerLabel }}</div>
            <div v-else class="address">{{ peerAddress }}</div>
            <div class="time-and-message">
                <span v-if="state === TransactionState.NEW">{{ $t('not sent') }}</span>
                <span v-else-if="state === TransactionState.PENDING">{{ $t('pending') }}</span>
                <span v-else-if="state === TransactionState.EXPIRED">{{ $t('expired') }}</span>
                <span v-else-if="state === TransactionState.FAILED">{{ $t('partially reverted') }}</span>
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
            <Amount :amount="txValue" :currency="ticker" value-mask/>
            <transition v-if="!swapData || swapData.asset !== SwapAsset.EUR" name="fade">
                <FiatConvertedAmount v-if="state === TransactionState.PENDING"
                    :amount="txValue" currency="usdc" value-mask
                />
                <div v-else-if="fiat.value === undefined" class="fiat-amount">&nbsp;</div>
                <div v-else-if="fiat.value === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                    {{ $t('Fiat value unavailable') }}
                </div>
                <div v-else class="fiat-amount flex-row">
                    <!-- <HistoricValueIcon/> -->
                    <FiatAmount
                        :amount="fiat.value / transaction.value * txValue"
                        :currency="fiat.currency"
                        value-mask
                    />
                </div>
            </transition>
            <FiatAmount v-else-if="swapData.asset === SwapAsset.EUR"
                :amount="(swapData.amount / 100)
                    - ((swapInfo && swapInfo.fees && swapInfo.fees.totalFee) || 0)
                    * (isIncoming ? 1 : -1)"
                :currency="assetToCurrency(swapData.asset)" value-mask/>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import {
    CircleSpinner,
    AlertTriangleIcon,
    Identicon,
    FiatAmount,
    CrossIcon,
} from '@nimiq/vue-components';
import { SwapAsset } from '@nimiq/fastspot-api';
import { Transaction, TransactionState } from '../stores/UsdcTransactions';
import Avatar from './Avatar.vue';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
// import HistoricValueIcon from './icons/HistoricValueIcon.vue';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import BankIcon from './icons/BankIcon.vue';
import UsdcIcon from './icons/UsdcIcon.vue';
import SwapSmallIcon from './icons/SwapSmallIcon.vue';
import { useConfig } from '../composables/useConfig';
import { CryptoCurrency, FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS } from '../lib/Constants';
import { assetToCurrency } from '../lib/swap/utils/Assets';
import { useUsdcTransactionInfo } from '../composables/useUsdcTransactionInfo';
import { useFormattedDate } from '../composables/useFormattedDate';
import TransactionListOasisPayoutStatus from './TransactionListOasisPayoutStatus.vue';

export default defineComponent({
    props: {
        transaction: {
            type: Object as () => Transaction,
            required: true,
        },
    },
    setup(props) {
        const { config } = useConfig();
        const constants = { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS };

        const state = computed(() => props.transaction.state);

        const transaction = computed(() => props.transaction);

        const {
            txValue,
            data,
            isCancelledSwap,
            isIncoming,
            peerAddress,
            peerLabel,
            swapData,
            swapInfo,
            fiat,
        } = useUsdcTransactionInfo(transaction);

        const timestamp = computed(() => transaction.value.timestamp && transaction.value.timestamp * 1000);
        const { dateDay, dateMonth, dateTime } = useFormattedDate(timestamp);

        const ticker = computed(() => {
            // If the swap had a positive slippage, the ticker should be the asset we received.
            if (transaction.value.event?.name === 'Swap' && isIncoming.value) {
                return CryptoCurrency.USDC;
            }

            return transaction.value.token === config.polygon.usdc.tokenContract
                ? CryptoCurrency.USDC
                : 'usdc.e';
        });

        return {
            constants,
            state,
            TransactionState,
            dateDay,
            dateMonth,
            dateTime,
            txValue,
            data,
            fiat,
            isIncoming,
            // isSwapProxy,
            peerAddress,
            peerLabel,
            SwapAsset,
            swapInfo,
            swapData,
            isCancelledSwap,
            ticker,
            assetToCurrency,
        };
    },
    components: {
        CircleSpinner,
        CrossIcon,
        AlertTriangleIcon,
        Avatar,
        Amount,
        FiatConvertedAmount,
        Identicon,
        BitcoinIcon,
        BankIcon,
        UsdcIcon,
        SwapSmallIcon,
        TransactionListOasisPayoutStatus,
        FiatAmount,
    },
});
</script>

<style scoped lang="scss">
@import "../scss/variables.scss";

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

        .identicon .swap {
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
        flex-shrink: 0;

        > .month {
            font-size: var(--small-label-size);
            letter-spacing: 0.0667em;
            text-transform: uppercase;
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

    .identicon {
        position: relative;
        width: 6rem;
        height: 6rem;
        flex-shrink: 0;

        .avatar {
            margin: .375rem;
        }

        img {
            height: 100%
        }

        svg {
            height: 100%;
            width: 100%;
        }

        > svg {
            width: 6rem;
            height: 6rem;
            padding: 0.375rem;

            &.bitcoin {
                color: var(--bitcoin-orange);
            }

            &.usdc {
                color: var(--usdc-blue);
            }
        }

        .swap {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            bottom: -0.5rem;
            right: -0.125rem;
            color: white;
            background: var(--nimiq-blue-bg);
            border: 0.375rem solid var(--bg-primary);
            transition: border-color 400ms var(--nimiq-ease);
            border-radius: 2rem;
            height: 2.75rem;
            width: 2.75rem;
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
        }

        .time-and-message {
            font-size: var(--small-size);
            font-weight: 600;
            color: var(--text-50);
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
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .transaction {
        padding: 1rem 1rem;

        > * {
            margin: 0rem 0.75rem;
        }

        .identicon {
            width: 5.5rem;
            height: 5.5rem;

            > svg {
                width: 5rem;
                height: 5rem;
                margin: 0.25rem;
            }

            .swap {
                border-width: 0.25rem;
                height: 2.5rem;
                width: 2.5rem;
            }
        }
    }
}
</style>

<template>
    <button
        class="reset transaction"
        :class="[state, {'not-executed': transaction.executionResult === false}]"
        @click="$router.push({name: 'transaction', params: {hash: transaction.transactionHash}})"
        :key="`tx-${transaction.transactionHash}`"
    >
        <div v-if="
            state === TransactionState.INCLUDED
            || state === TransactionState.CONFIRMED
            || state === TransactionState.MINED
        " class="date">
            <span class="day">{{ dateDay }}</span><br>
            <span class="month">{{ dateMonth }}</span>
        </div>
        <div v-else-if="state === TransactionState.PENDING" class="pending">
            <CircleSpinner/>
        </div>
        <div
            v-else-if="state === TransactionState.EXPIRED || state === TransactionState.INVALIDATED"
            class="invalid nq-red"
        >
            <CrossIcon/>
        </div>
        <div v-else-if="state === TransactionState.NEW" class="new nq-orange">
            <AlertTriangleIcon/>
        </div>
        <div class="identicon">
            <UnclaimedCashlinkIcon v-if="peerAddress === constants.CASHLINK_ADDRESS" />
            <BitcoinIcon v-else-if="swapData && swapData.asset === SwapAsset.BTC"/>
            <UsdcIcon v-else-if="swapData
                && (swapData.asset === SwapAsset.USDC || swapData.asset === SwapAsset.USDC_MATIC)"/>
            <UsdtIcon v-else-if="swapData && swapData.asset === SwapAsset.USDT_MATIC"/>
            <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
            <StakingIcon v-else-if="peerAddress === constants.STAKING_CONTRACT_ADDRESS" full-size/>
            <Identicon v-else :address="peerAddress" />
            <div v-if="isCashlink" class="cashlink-or-swap"><CashlinkXSmallIcon/></div>
            <div v-if="swapInfo || isSwapProxy" class="cashlink-or-swap"><SwapSmallIcon/></div>
        </div>
        <div class="data">
            <div v-if="peerLabel" class="label">{{
                peerAddress === constants.STAKING_CONTRACT_ADDRESS ? data : peerLabel
            }}</div>
            <div v-else class="address">{{ peerAddress }}</div>
            <div class="time-and-message">
                <span v-if="state === TransactionState.NEW">{{ $t('not sent') }}</span>
                <span v-else-if="state === TransactionState.PENDING">{{ $t('pending') }}</span>
                <span v-else-if="state === TransactionState.EXPIRED">{{ $t('expired') }}</span>
                <span v-else-if="state === TransactionState.INVALIDATED">{{ $t('invalid') }}</span>
                <span v-else-if="dateTime">{{ dateTime }}</span>

                <span v-if="data && peerAddress !== constants.STAKING_CONTRACT_ADDRESS" class="message">
                    <strong class="dot">&middot;</strong>{{ data }}
                    <TransactionListOasisPayoutStatus
                        v-if="swapData && swapData.asset === SwapAsset.EUR"
                        :data="swapData"/>
                </span>
            </div>
        </div>
        <div class="amounts" :class="{isIncoming, 'signalling': transaction.flags === 2}">
            <Amount :amount="transaction.value" value-mask/>
            <transition v-if="!swapData || swapData.asset !== SwapAsset.EUR" name="fade">
                <FiatConvertedAmount v-if="state === TransactionState.PENDING" :amount="transaction.value" value-mask/>
                <div v-else-if="fiat.value === undefined" class="fiat-amount fiat-loading">&nbsp;</div>
                <div v-else-if="fiat.value === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount fiat-unavailable">
                    {{ $t('Fiat value unavailable') }}
                </div>
                <div v-else class="fiat-amount flex-row">
                    <!-- <HistoricValueIcon/> -->
                    <FiatAmount :amount="fiat.value" :currency="fiat.currency" value-mask/>
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
    CashlinkXSmallIcon,
    Identicon,
    FiatAmount,
    CrossIcon,
} from '@nimiq/vue-components';
import { SwapAsset } from '@nimiq/fastspot-api';
import { toMs, Transaction, TransactionState } from '../stores/Transactions';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import UnclaimedCashlinkIcon from './icons/UnclaimedCashlinkIcon.vue';
// import HistoricValueIcon from './icons/HistoricValueIcon.vue';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import UsdcIcon from './icons/UsdcIcon.vue';
import UsdtIcon from './icons/UsdtIcon.vue';
import BankIcon from './icons/BankIcon.vue';
import SwapSmallIcon from './icons/SwapSmallIcon.vue';
import {
    FIAT_PRICE_UNAVAILABLE,
    CASHLINK_ADDRESS,
    BANK_ADDRESS,
    STAKING_CONTRACT_ADDRESS,
} from '../lib/Constants';
import { useTransactionInfo } from '../composables/useTransactionInfo';
import { useFormattedDate } from '../composables/useFormattedDate';
import TransactionListOasisPayoutStatus from './TransactionListOasisPayoutStatus.vue';
import StakingIcon from './icons/Staking/StakingIcon.vue';

export default defineComponent({
    props: {
        transaction: {
            type: Object as () => Transaction,
            required: true,
        },
    },
    setup(props) {
        const constants = {
            FIAT_PRICE_UNAVAILABLE,
            CASHLINK_ADDRESS,
            BANK_ADDRESS,
            STAKING_CONTRACT_ADDRESS,
        };

        const state = computed(() => props.transaction.state);

        const transaction = computed(() => props.transaction);

        const {
            data,
            isCashlink,
            isIncoming,
            isSwapProxy,
            peerAddress,
            peerLabel,
            swapData,
            swapInfo,
            fiat,
        } = useTransactionInfo(transaction);

        const timestamp = computed(() => transaction.value.timestamp && toMs(transaction.value.timestamp));
        const { dateDay, dateMonth, dateTime } = useFormattedDate(timestamp);

        return {
            constants,
            state,
            TransactionState,
            dateDay,
            dateMonth,
            dateTime,
            data,
            fiat,
            isCashlink,
            isIncoming,
            isSwapProxy,
            peerAddress,
            peerLabel,
            SwapAsset,
            swapInfo,
            swapData,
        };
    },
    components: {
        CircleSpinner,
        CrossIcon,
        AlertTriangleIcon,
        Amount,
        FiatConvertedAmount,
        CashlinkXSmallIcon,
        Identicon,
        FiatAmount,
        UnclaimedCashlinkIcon,
        // HistoricValueIcon,
        BitcoinIcon,
        UsdcIcon,
        UsdtIcon,
        BankIcon,
        SwapSmallIcon,
        TransactionListOasisPayoutStatus,
        StakingIcon,
    },
});
</script>

<style scoped lang="scss">
@import "../scss/variables.scss";
@import "../scss/mixins.scss";

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

        .identicon .cashlink-or-swap {
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

        img { height: 100% }

        svg:not(.staking-icon) {
            height: 100%;
            width: 100%;
        }

        > svg:not(.staking-icon) {
            width: 6rem;
            height: 6rem;
            padding: 0.375rem;
            overflow: initial;

            &.bitcoin { color: var(--bitcoin-orange) }
            &.usdc { color: var(--usdc-blue) }
            &.usdt { color: var(--usdt-green) }
        }

        .cashlink-or-swap {
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

            &.fiat-loading {
                @include amount-loading-placeholder(4rem, 1.6rem);
            }

            &.fiat-unavailable {
                @include fiat-unavailable;
            }
        }

        > * {
            white-space: nowrap;
            text-align: right;
        }

        &:not(.isIncoming):not(.signalling) {
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

        &.signalling {
            .amount {
                opacity: 0.4;
            }

            .fiat-amount {
                display: none;
            }
        }
    }

    &.expired,
    &.invalidated {
        .identicon {
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

    &.not-executed {
        text-decoration: line-through;
        opacity: 0.4;
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

            > svg:not(.staking-icon) {
                width: 5rem;
                height: 5rem;
                margin: 0.25rem;
            }

            .cashlink-or-swap {
                border-width: 0.25rem;
                height: 2.5rem;
                width: 2.5rem;
            }
        }
    }
}
</style>

<template>
    <button
        class="reset transaction"
        :class="state"
        @click="$router.push({name: 'transaction', params: {hash: transaction.transactionHash}})"
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
            <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
            <Identicon v-else :address="peerAddress" />
            <div v-if="isCashlink" class="cashlink-or-swap"><CashlinkXSmallIcon/></div>
            <div v-if="swapInfo || isSwapProxy" class="cashlink-or-swap"><SwapSmallIcon/></div>
        </div>
        <div class="data">
            <div v-if="peerLabel" class="label">{{ peerLabel }}</div>
            <div v-else class="address">{{ peerAddress }}</div>
            <div class="time-and-message">
                <span v-if="state === TransactionState.NEW">{{ $t('not sent') }}</span>
                <span v-else-if="state === TransactionState.PENDING">{{ $t('pending') }}</span>
                <span v-else-if="state === TransactionState.EXPIRED">{{ $t('expired') }}</span>
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
            <Amount :amount="transaction.value" value-mask/>
            <transition name="fade">
                <FiatConvertedAmount v-if="state === TransactionState.PENDING" :amount="transaction.value" value-mask/>
                <div v-else-if="fiatValue === undefined" class="fiat-amount">&nbsp;</div>
                <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                    {{ $t('Fiat value unavailable') }}
                </div>
                <div v-else class="fiat-amount flex-row">
                    <!-- <HistoricValueIcon/> -->
                    <FiatAmount :amount="fiatValue" :currency="fiatCurrency" value-mask/>
                </div>
            </transition>
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
import { AddressBook } from '@nimiq/utils';
import { SwapAsset } from '@nimiq/fastspot-api';
import { useAddressStore } from '../stores/Address';
import { useFiatStore } from '../stores/Fiat';
import { useSettingsStore } from '../stores/Settings';
import { Transaction, TransactionState, useTransactionsStore } from '../stores/Transactions';
import { twoDigit } from '../lib/NumberFormatting';
import { parseData } from '../lib/DataFormatting';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import UnclaimedCashlinkIcon from './icons/UnclaimedCashlinkIcon.vue';
// import HistoricValueIcon from './icons/HistoricValueIcon.vue';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import BankIcon from './icons/BankIcon.vue';
import SwapSmallIcon from './icons/SwapSmallIcon.vue';
import { useContactsStore } from '../stores/Contacts';
import { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS, BANK_ADDRESS } from '../lib/Constants';
import { isProxyData, ProxyType } from '../lib/ProxyDetection';
import { useProxyStore } from '../stores/Proxy';
import { useSwapsStore } from '../stores/Swaps';
import { useOasisPayoutStatusUpdater } from '../composables/useOasisPayoutStatusUpdater';
import TransactionListOasisPayoutStatus from './TransactionListOasisPayoutStatus.vue';
import { SettlementStatus } from '../lib/OasisApi';

export default defineComponent({
    props: {
        transaction: {
            type: Object as () => Transaction,
            required: true,
        },
    },
    setup(props, context) {
        const constants = { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS, BANK_ADDRESS };

        const { activeAddress, state: addresses$ } = useAddressStore();
        const { getLabel } = useContactsStore();

        const state = computed(() => props.transaction.state);

        const isIncoming = computed(() => {
            const haveSender = !!addresses$.addressInfos[props.transaction.sender];
            const haveRecipient = !!addresses$.addressInfos[props.transaction.recipient];

            if (haveSender && !haveRecipient) return false;
            if (!haveSender && haveRecipient) return true;

            // Fall back to comparing with active address
            return props.transaction.recipient === activeAddress.value;
        });

        // Related Transaction
        const { state: transactions$ } = useTransactionsStore();
        const relatedTx = computed(() => {
            if (!props.transaction.relatedTransactionHash) return null;
            return transactions$.transactions[props.transaction.relatedTransactionHash] || null;
        });

        const { getSwapByTransactionHash } = useSwapsStore();
        const swapInfo = computed(() => getSwapByTransactionHash.value(props.transaction.transactionHash)
            || (props.transaction.relatedTransactionHash
                ? getSwapByTransactionHash.value(props.transaction.relatedTransactionHash)
                : null));
        const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
        useOasisPayoutStatusUpdater(swapData);
        // Note: the htlc proxy tx that is not funding or redeeming the htlc itself, i.e. the one we are displaying here
        // related to our address, always holds the proxy data.
        const isSwapProxy = computed(() => isProxyData(props.transaction.data.raw, ProxyType.HTLC_PROXY));
        const isCancelledSwap = computed(() =>
            (swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset)
            // Funded proxy and then refunded without creating an actual htlc?
            || (isSwapProxy.value && (isIncoming.value
                ? props.transaction.recipient === relatedTx.value?.sender
                : props.transaction.sender === relatedTx.value?.recipient)));

        // Data
        const isCashlink = computed(() => isProxyData(props.transaction.data.raw, ProxyType.CASHLINK));
        const data = computed(() => {
            if (isCashlink.value) {
                const { state: proxies$ } = useProxyStore();
                const cashlinkAddress = isIncoming.value ? props.transaction.sender : props.transaction.recipient;
                const hubCashlink = proxies$.hubCashlinks[cashlinkAddress];
                return hubCashlink ? hubCashlink.message : '';
            }

            if (swapData.value && !isCancelledSwap.value) {
                const message = context.root.$t('Sent {fromAsset} – Received {toAsset}', {
                    fromAsset: isIncoming.value ? swapData.value.asset : SwapAsset.NIM,
                    toAsset: isIncoming.value ? SwapAsset.NIM : swapData.value.asset,
                }) as string;

                // The TransactionListOasisPayoutStatus takes care of the second half of the message
                if (
                    swapData.value.asset === SwapAsset.EUR
                    && swapData.value.htlc?.settlement
                    && swapData.value.htlc.settlement.status !== SettlementStatus.CONFIRMED
                ) return `${message.split('–')[0]} –`;

                return message;
            }

            if ('hashRoot' in props.transaction.data
                || (relatedTx.value && 'hashRoot' in relatedTx.value.data)) {
                return context.root.$t('HTLC Creation') as string;
            }
            if ('hashRoot' in props.transaction.proof
                || (relatedTx.value && 'hashRoot' in relatedTx.value.proof)) {
                return context.root.$t('HTLC Settlement') as string;
            }
            if ('creator' in props.transaction.proof
                || (relatedTx.value && 'creator' in relatedTx.value.proof)
                // if we have an incoming tx from a HTLC proxy but none of the above conditions met, the tx and related
                // tx are regular transactions and we regard the tx from the proxy as refund
                || (relatedTx.value && isSwapProxy.value && isIncoming.value)) {
                return context.root.$t('HTLC Refund') as string;
            }

            return parseData(props.transaction.data.raw);
        });

        // Peer
        const peerAddress = computed(() => {
            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.BTC) return 'bitcoin';
                if (swapData.value.asset === SwapAsset.EUR) return constants.BANK_ADDRESS;
            }

            // For Cashlinks and swap proxies
            if (relatedTx.value) {
                return isIncoming.value
                    ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
                    : relatedTx.value.recipient; // This is a funding tx, so the related tx is the claiming one
            }

            if (isSwapProxy.value) return ''; // avoid displaying proxy address identicon until we know related address

            if (isCashlink.value) return constants.CASHLINK_ADDRESS; // No related tx yet, show placeholder

            return isIncoming.value ? props.transaction.sender : props.transaction.recipient;
        });
        const peerLabel = computed(() => {
            if (isSwapProxy.value && !relatedTx.value) {
                return context.root.$t('Swap'); // avoid displaying the proxy address until we know related peer address
            }

            if (isCancelledSwap.value) {
                return context.root.$t('Cancelled Swap');
            }

            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.BTC) {
                    return context.root.$t('Bitcoin') as string;
                }

                if (swapData.value.asset === SwapAsset.EUR) {
                    return swapData.value.bankLabel || context.root.$t('Bank Account') as string;
                }

                return swapData.value.asset.toUpperCase();
            }

            // Label cashlinks
            if (peerAddress.value === constants.CASHLINK_ADDRESS) {
                return isIncoming.value
                    ? context.root.$t('Cashlink') as string
                    : context.root.$t('Unclaimed Cashlink') as string;
            }

            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
            if (ownedAddressInfo) return ownedAddressInfo.label;

            // Search contacts
            if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value)!;

            // Search global address book
            const globalLabel = AddressBook.getLabel(peerAddress.value);
            if (globalLabel) return globalLabel;

            return false;
        });

        // Date
        const { language } = useSettingsStore();
        const date = computed(() => props.transaction.timestamp && new Date(props.transaction.timestamp * 1000));
        const dateDay = computed(() => date.value && twoDigit(date.value.getDate()));
        const monthFormatter = computed(() => new Intl.DateTimeFormat(language.value, { month: 'short' }));
        const dateMonth = computed(() => date.value && monthFormatter.value
            && monthFormatter.value.format(date.value as Date));
        const dateTime = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Fiat currency
        const { currency: fiatCurrency } = useFiatStore();
        const fiatValue = computed(() => props.transaction.fiatValue
            ? props.transaction.fiatValue[fiatCurrency.value]
            : undefined,
        );

        return {
            constants,
            state,
            TransactionState,
            dateDay,
            dateMonth,
            dateTime,
            data,
            fiatCurrency,
            fiatValue,
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
        /deep/ svg {
            margin: 0 auto;
        }
    }

    /deep/ .circle-spinner {
        display: block;
    }

    .identicon {
        position: relative;
        width: 6rem;
        height: 6rem;
        flex-shrink: 0;

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
}

@media (max-width: 700px) { // Full mobile breakpoint
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

            .cashlink-or-swap {
                border-width: 0.25rem;
                height: 2.5rem;
                width: 2.5rem;
            }
        }
    }
}
</style>

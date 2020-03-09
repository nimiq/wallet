<template>
    <button
        class="reset transaction"
        :class="state"
        @click="$router.push({name: 'transaction', params: {hash: transaction.transactionHash}})"
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
            <Identicon v-else :address="peerAddress" />
            <div v-if="isCashlink" class="cashlink">
                <CashlinkXSmallIcon/>
            </div>
        </div>
        <div class="data">
            <div v-if="peerLabel" class="label">{{ peerLabel }}</div>
            <div v-else class="address">
                <span class="bold">{{ peerAddress.substring(0, 9) }}</span>
                <span>{{ peerAddress.substring(9) }}</span>
            </div>
            <div class="time-and-message">
                <span v-if="state === TransactionState.NEW" class="time">{{ $t('not sent') }}</span>
                <span v-else-if="state === TransactionState.PENDING" class="time">{{ $t('pending') }}</span>
                <span v-else-if="state === TransactionState.EXPIRED" class="time">{{ $t('expired') }}</span>
                <span v-else-if="state === TransactionState.INVALIDATED" class="time">{{ $t('invalid') }}</span>
                <span v-else-if="dateTime" class="time">{{ dateTime }}</span>

                <span v-if="data" class="message">
                    <strong class="dot">&middot;</strong>{{ data }}
                </span>
            </div>
        </div>
        <div class="amounts" :class="{isIncoming}">
            <Amount :amount="transaction.value"/>
            <transition name="fade">
                <FiatConvertedAmount v-if="state === TransactionState.PENDING" :amount="transaction.value"/>
                <div v-else-if="fiatValue === undefined" class="fiat-amount-loading">&nbsp;</div>
                <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount-unavailable">
                    Fiat value unavailable
                </div>
                <FiatAmount v-else :amount="fiatValue" :currency="fiatCurrency" :locale="language"/>
            </transition>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { CircleSpinner, AlertTriangleIcon, CashlinkXSmallIcon, Identicon, FiatAmount } from '@nimiq/vue-components';
import { AddressBook } from '@nimiq/utils';
import { useAddressStore } from '../stores/Address';
import { useFiatStore } from '../stores/Fiat';
import { useSettingsStore } from '../stores/Settings';
import { Transaction, TransactionState, useTransactionsStore } from '../stores/Transactions';
import { twoDigit } from '../lib/NumberFormatting';
import { parseData } from '../lib/DataFormatting';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import CrossIcon from './icons/CrossIcon.vue';
import UnclaimedCashlinkIcon from './icons/UnclaimedCashlinkIcon.vue';
import { useContactsStore } from '../stores/Contacts';
import { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS } from '../lib/Constants';
import { isCashlinkData } from '../lib/CashlinkDetection';

export default defineComponent({
    props: {
        transaction: {
            type: Object as () => Transaction,
            required: true,
        },
    },
    setup(props, context) {
        const constants = { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS };

        const { activeAddress, state: addresses$ } = useAddressStore();
        const { getLabel } = useContactsStore();

        const state = computed(() => props.transaction.state);

        const isIncoming = computed(() => props.transaction.recipient === activeAddress.value);

        // Data
        const data = computed(() => parseData(props.transaction.data.raw));
        const isCashlink = computed(() => isCashlinkData(props.transaction.data.raw));

        // Related Transaction
        const { state: transactions$ } = useTransactionsStore();
        const relatedTx = computed(() => {
            if (!props.transaction.relatedTransactionHash) return null;
            return transactions$.transactions[props.transaction.relatedTransactionHash] || null;
        });

        // Peer
        const peerAddress = computed(() => isCashlink.value
            ? relatedTx.value
                ? isIncoming.value
                    ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
                    : relatedTx.value.recipient // This is a funding tx, so the related tx is the claiming one
                : constants.CASHLINK_ADDRESS // No related tx yet, show placeholder
            : isIncoming.value
                ? props.transaction.sender
                : props.transaction.recipient);
        const peerLabel = computed(() => {
            // Label cashlinks
            if (peerAddress.value === constants.CASHLINK_ADDRESS) {
                return isIncoming.value
                    ? context.root.$t('Cashlink')
                    : context.root.$t('Unclaimed Cashlink');
            }

            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
            if (ownedAddressInfo) return ownedAddressInfo.label;

            // Search contacts
            if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value);

            // Search global address book
            const globalLabel = AddressBook.getLabel(peerAddress.value);
            if (globalLabel) return globalLabel;

            return false;
        });

        // Date
        const date = computed(() => props.transaction.timestamp && new Date(props.transaction.timestamp * 1000));
        const dateDay = computed(() => date.value && twoDigit(date.value.getDate()));
        const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const dateMonth = computed(() => date.value && MONTHS[date.value.getMonth()]);
        const dateTime = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Fiat currency
        const { currency: fiatCurrency } = useFiatStore();
        const fiatValue = computed(() => props.transaction.fiatValue
            ? props.transaction.fiatValue[fiatCurrency.value]
            : undefined,
        );

        const { language } = useSettingsStore();

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
            language,
            peerAddress,
            peerLabel,
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
    } as any,
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
    border-radius: .5rem;
    cursor: pointer;
    transition: background 400ms var(--nimiq-ease);

    &:hover,
    &:focus {
        background: var(--nimiq-highlight-bg);
    }

    > * {
        margin: 0rem 1rem;
    }

    .date {
        font-size: 2rem;
        font-weight: bold;
        text-transform: uppercase;
        opacity: 0.4;
        text-align: center;
        margin: 0 1.25rem;
        flex-grow: 0;
        letter-spacing: 0.0125em;
        line-height: 1;

        > .month {
            font-size: 1.5rem;
            letter-spacing: 0.0667em;
        }
    }

    .pending {
        margin: 0 1.5rem;
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

        .cashlink {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            bottom: 0;
            right: 0;
            color: white;
            background: var(--nimiq-blue-bg);
            border-radius: 2rem;
            height: 2rem;
            width: 2rem;
            font-size: 2rem;
        }
    }

    .data {
        flex-grow: 1;
        overflow: hidden;
        line-height: 1.4;
        font-size: 2rem;

        .label {
            font-weight: 600;
        }

        .address {
            font-family: 'Fira Mono', monospace;
            word-spacing: -0.1em;
            white-space: nowrap;

            .bold {
                font-weight: 500;
            }

            :not(.bold) {
                opacity: .5;
            }
        }

        .time-and-message {
            font-size: 1.75rem;
            opacity: .5;

            .time {
                font-weight: 600;
            }

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
            font-size: 2rem;
            font-weight: bold;
        }

        .fiat-amount,
        .fiat-amount-loading,
        .fiat-amount-unavailable {
            font-size: 1.75rem;
            font-weight: 600;
            opacity: 0.4;

            &.fade-enter-active {
                position: relative;
                top: calc(-1 * var(--fiat-amount-height));
            }
        }

        .fiat-amount-loading {
            min-height: var(--fiat-amount-height); // to avoid jumping when fiat value loaded
        }

        > * {
            white-space: nowrap;
            text-align: right;
        }

        &:not(.isIncoming) {
            .amount {
                opacity: 0.6;
            }

            > .amount::before,
            > .fiat-amount::before {
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
                margin-bottom: .375rem;
            }

            > .amount::before,
            > .fiat-amount::before {
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
</style>

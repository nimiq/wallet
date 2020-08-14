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
            v-else-if="state === TransactionState.EXPIRED || state === TransactionState.INVALIDATED"
            class="invalid nq-red"
        >
            <CrossIcon/>
        </div>
        <div v-else-if="state === TransactionState.NEW" class="new nq-orange">
            <AlertTriangleIcon/>
        </div>
        <Avatar :label="peerLabel || ''"/>
        <div class="data">
            <div v-if="peerLabel" class="label">{{ peerLabel }}</div>
            <div v-else class="address">
                {{ peerAddresses[0] }}
                <small v-if="peerAddresses.length > 1">+{{ peerAddresses.length - 1 }}</small>
            </div>

            <span v-if="state === TransactionState.NEW" class="time">{{ $t('not sent') }}</span>
            <span v-else-if="state === TransactionState.PENDING" class="time">{{ $t('pending') }}</span>
            <span v-else-if="state === TransactionState.EXPIRED" class="time">{{ $t('expired') }}</span>
            <span v-else-if="state === TransactionState.INVALIDATED" class="time">{{ $t('invalid') }}</span>
            <span v-else-if="dateTime" class="time">{{ dateTime }}</span>

        </div>
        <div class="amounts" :class="{isIncoming}">
            <Amount :amount="isIncoming ? amountReceived : amountSent" currency="btc" value-mask/>
            <transition name="fade">
                <FiatConvertedAmount v-if="state === TransactionState.PENDING"
                    :amount="isIncoming ? amountReceived : amountSent" currency="btc" value-mask
                />
                <div v-else-if="fiatValue === undefined" class="fiat-amount">&nbsp;</div>
                <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                    {{ $t('Fiat value unavailable') }}
                </div>
                <div v-else class="fiat-amount flex-row">
                    <HistoricValueIcon/>
                    <FiatAmount :amount="fiatValue" :currency="fiatCurrency" :locale="language" value-mask/>
                </div>
            </transition>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import {
    CircleSpinner,
    // AlertTriangleIcon,
    FiatAmount,
    // CrossIcon,
} from '@nimiq/vue-components';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { useFiatStore } from '../stores/Fiat';
import { useSettingsStore } from '../stores/Settings';
import { Transaction, TransactionState } from '../stores/BtcTransactions';
import { twoDigit } from '../lib/NumberFormatting';
import Avatar from './Avatar.vue';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import HistoricValueIcon from './icons/HistoricValueIcon.vue';
import { FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { useAccountStore } from '../stores/Account';

export default defineComponent({
    props: {
        transaction: {
            type: Object as () => Transaction,
            required: true,
        },
    },
    setup(props) {
        const constants = { FIAT_PRICE_UNAVAILABLE };

        const {
            state: btcAddresses$,
            activeInternalAddresses,
            activeExternalAddresses,
            getRecipientLabel,
            getSenderLabel,
        } = useBtcAddressStore();

        const state = computed(() => props.transaction.timestamp ? TransactionState.MINED : TransactionState.PENDING);

        const inputsSent = computed(() => props.transaction.inputs.filter((input) =>
            input.address && (activeInternalAddresses.value.includes(input.address)
                || activeExternalAddresses.value.includes(input.address)
            ),
        ));

        const isIncoming = computed(() => inputsSent.value.length === 0);

        const outputsReceived = computed(() => {
            if (!isIncoming.value) return [];

            const receivedToExternal = props.transaction.outputs
                .filter((output) => activeExternalAddresses.value.includes(output.address));

            if (receivedToExternal.length > 0) return receivedToExternal;

            return props.transaction.outputs
                .filter((output) => activeInternalAddresses.value.includes(output.address));
        });
        const amountReceived = computed(() => outputsReceived.value.reduce((sum, output) => sum + output.value, 0));

        const outputsSent = computed(() => isIncoming.value
            ? []
            : props.transaction.outputs.filter((output) => !activeInternalAddresses.value.includes(output.address)),
        );
        const amountSent = computed(() => outputsSent.value.reduce((sum, output) => sum + output.value, 0));

        // Peer
        const peerAddresses = computed(() => isIncoming.value
            ? props.transaction.inputs.map((input) => input.address).filter((address) => !!address) as string[]
            : outputsSent.value.map((output) => output.address));
        const peerLabel = computed(() => {
            if (isIncoming.value) {
                // Search sender labels
                const ownAddresses = outputsReceived.value.map((output) => output.address);
                for (const address of ownAddresses) {
                    const label = getSenderLabel.value(address);
                    if (label) return label;
                }
            } else {
                // Search recipient labels
                for (const address of peerAddresses.value) {
                    const label = getRecipientLabel.value(address);
                    if (label) return label;
                }
            }

            // Search other stored addresses
            for (const address of peerAddresses.value) {
                const ownedAddressInfo = btcAddresses$.addressInfos[address];
                if (ownedAddressInfo) {
                    // Find account label
                    const { accountInfos } = useAccountStore();
                    return Object.values(accountInfos.value)
                        .find((accountInfo) => accountInfo.btcAddresses.external.includes(address))?.label
                        || Object.values(accountInfos.value)
                            .find((accountInfo) => accountInfo.btcAddresses.internal.includes(address))!.label;
                }
            }

            // // Search global address book
            // const globalLabel = AddressBook.getLabel(peerAddress.value);
            // if (globalLabel) return globalLabel;

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

        const { language } = useSettingsStore();

        return {
            constants,
            state,
            TransactionState,
            dateDay,
            dateMonth,
            dateTime,
            amountReceived,
            amountSent,
            fiatCurrency,
            fiatValue,
            isIncoming,
            language,
            peerAddresses,
            peerLabel,
        };
    },
    components: {
        CircleSpinner,
        // CrossIcon,
        // AlertTriangleIcon,
        Avatar,
        Amount,
        FiatConvertedAmount,
        FiatAmount,
        HistoricValueIcon,
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
        }
    }

    .date,
    .pending,
    .new,
    .invalid {
        width: 3.75rem;
        text-align: center;
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

    .avatar {
        flex-shrink: 0;
        margin: 0.375rem 1.375rem;
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

        .time {
            font-size: var(--small-size);
            opacity: .5;
            font-weight: 600;
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
    }
}
</style>

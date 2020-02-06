<template>
    <div class="transaction" @click="$router.push({name: 'transaction', params: {hash}}).catch((err)=> {})">
        <div v-if="dateDay" class="date">
            <span class="day">{{ dateDay }}</span><br>
            <span class="month">{{ dateMonth }}</span>
        </div>
        <svg v-else class="date">
            <use xlink:href="/img/nimiq-style.icons.svg#nq-stopwatch"/>
        </svg>
        <div class="identicon">
            <Identicon :address="peerAddress"/>
            <div v-if="isCashlink" class="cashlink">
                <CashlinkIcon/>
            </div>
        </div>
        <div class="data">
            <div v-if="peerLabel" class="label">{{ peerLabel }}</div>
            <div v-else class="address">
                <span class="bold">{{ peerAddress.substring(0, 9) }}</span>
                <span>{{ peerAddress.substring(9) }}</span>
            </div>
            <div class="time-and-message">
                <span v-if="dateTime" class="time">{{ dateTime }}</span>
                <span v-else class="time">{{ $t('pending') }}</span>
                <span class="message">{{ data }}</span>
            </div>
        </div>
        <div class="amounts" :class="{isIncoming}">
            <Amount :amount="transaction.value"/>
            <template v-if="fiatValue !== undefined">
                <FiatAmount v-if="fiatValue !== NaN" :amount="fiatValue" :currency="fiatCurrency"/>
                <div v-else class="fiat-amount">Fiat value unavailable</div>
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { CashlinkIcon, Identicon, FiatAmount } from '@nimiq/vue-components';
import { useAddressStore } from '../stores/Address'
import { useFiatStore } from '../stores/Fiat';
import { Transaction } from '../stores/Transactions'
import { twoDigit } from '../lib/NumberFormatting'
import { AddressBook, Utf8Tools } from '@nimiq/utils'
import { isFundingCashlink, isClaimingCashlink } from '../lib/CashlinkDetection'
import Amount from './Amount.vue';
import { useContactsStore } from '../stores/Contacts';

export default createComponent({
    props: {
        transaction: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        // Only for typing of the prop
        const tx = computed(() => props.transaction as Transaction);

        const { activeAddress, state: addresses$ } = useAddressStore();
        const { label } = useContactsStore();

        const isIncoming = computed(() => tx.value.recipient === activeAddress.value)

        // Peer
        const peerAddress = computed(() => isIncoming.value ? tx.value.sender : tx.value.recipient)
        const peerLabel = computed(() => {
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value]
            if (ownedAddressInfo) return ownedAddressInfo.label;
            // search contacts
            if (label.value(peerAddress.value)) return label.value(peerAddress.value);

            // Search global address book
            const globalLabel = AddressBook.getLabel(peerAddress.value)
            if (globalLabel) return globalLabel

            return false
        })

        // Date
        const date = computed(() => tx.value.timestamp && new Date(tx.value.timestamp * 1000))
        const dateDay = computed(() => date.value && twoDigit(date.value.getDate()))
        const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        const dateMonth = computed(() => date.value && MONTHS[date.value.getMonth()])
        const dateTime = computed(() => date.value && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`)

        // Data
        const dataBytes = computed(() => tx.value.data.raw
            ? new Uint8Array(tx.value.data.raw.match(/.{1,2}/g)!.map(hex => parseInt(hex, 16)))
            : new Uint8Array(0)
        )
        const data = computed(() => {
            if (!dataBytes.value.length) return ''

            if (isFundingCashlink(dataBytes.value)) return 'Funding Cashlink'
            if (isClaimingCashlink(dataBytes.value)) return 'Claiming Cashlink'

            // @ts-ignore Readonly<Uint8Array> is not assignable to Utf8Tools functions
            if (Utf8Tools.isValidUtf8(dataBytes.value)) return Utf8Tools.utf8ByteArrayToString(dataBytes.value)
            else return '<DATA>'
        })
        const isCashlink = computed(() => isFundingCashlink(dataBytes.value) || isClaimingCashlink(dataBytes.value))

        // Fiat currency
        const fiatStore = useFiatStore();
        const fiatCurrency = computed(() => fiatStore.currency.value);
        const fiatValue = computed(() => tx.value.fiatValue ? tx.value.fiatValue[fiatCurrency.value] : undefined);

        return {
            isIncoming,
            peerAddress,
            peerLabel,
            dateDay,
            dateMonth,
            dateTime,
            data,
            fiatCurrency,
            fiatValue,
            isCashlink,
            hash: tx.value.transactionHash,
        }
    },
    components: {
        Amount,
        CashlinkIcon,
        Identicon,
        FiatAmount,
    } as any,
})
</script>

<style scoped lang="scss">
.transaction {
    display: flex;
    align-items: center;
    flex-direction: row;
    width: 100%;
    padding: 2rem 1rem;
    border: 0;
    background: transparent;
    border-radius: .5rem;

    &:hover {
        background: var(--nimiq-highlight-bg);
    }

    > * {
        margin: 0rem 1rem;
    }

    .date {
        font-size: 2rem;
        text-transform: uppercase;
        opacity: 0.4;
        text-align: center;
        margin-right: 1.25rem;

        > .day {
            font-weight: bold;
        }

        > .month {
            font-size: 1.625rem;
            font-weight: 600;
        }
    }

    .identicon {
        display: inline-block;
        position: relative;
        width: 6rem;
        height: 6rem;
        flex-shrink: 0;

        > img {
            height: 100%
        }

        > .cashlink {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            bottom: 0;
            right: 0;
            color: white;
            background: var(--nimiq-blue-bg);
            border-radius: 1rem;
            height: 2rem;
            width: 2rem;
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

            .message {
                margin-left: 1.5rem;
            }
        }
    }

    .amounts {
        display: flex;
        flex-direction: column;
        justify-self: right;
        line-height: 1.4;

        .amount {
            font-size: 2rem;
            font-weight: bold;
        }

        .fiat-amount {
            font-size: 1.75rem;
            font-weight: 600;
            opacity: 0.4;
        }

        > * {
            white-space: nowrap;
            text-align: right;
        }

        &:not(.isIncoming) {
            .amount {
                opacity: 0.6;
            }

            > *:before {
                content: '-';
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

            > *:before {
                content: '+';
            }
        }
    }
}
</style>

<template>
    <div class="transaction" @click="$router.push('/transaction')">
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
            <Amount :amount="transaction.value" :maxDecimals="2"/>
            <FiatAmount :amount="transaction.value"/>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { CashlinkIcon } from '@nimiq/vue-components';
import { useAddressStore } from '../stores/Address'
import { Transaction } from '../stores/Transactions'
import { twoDigit } from '../lib/NumberFormatting'
import { AddressBook, Utf8Tools } from '@nimiq/utils'
import { isFundingCashlink, isClaimingCashlink } from '../lib/CashlinkDetection'

import { Identicon, Amount } from '@nimiq/vue-components'
import FiatAmount from '@/components/FiatAmount.vue'

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

        const { activeAddress, state: addresses$ } = useAddressStore()

        const isIncoming = computed(() => tx.value.recipient === activeAddress.value)

        // Peer
        const peerAddress = computed(() => isIncoming.value ? tx.value.sender : tx.value.recipient)
        const peerLabel = computed(() => {
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value]
            if (ownedAddressInfo) return ownedAddressInfo.label

            // TODO: Search contacts

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

        return {
            isIncoming,
            peerAddress,
            peerLabel,
            dateDay,
            dateMonth,
            dateTime,
            data,
            isCashlink,
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
        opacity: .4;
        text-align: center;

        > .day {
            font-weight: 600;
        }

        > .month {
            font-weight: 500;
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

        .address {
            font-size: 1.875rem;
            font-family: monospace;
            word-spacing: -0.1em;
            white-space: nowrap;

            .bold {
                font-weight: 600;
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
            font-weight: 600;
        }

        .fiat-amount {
            font-size: 1.75rem;
            opacity: .5;
        }

        > * {
            white-space: nowrap;
            text-align: right;
        }

        > *:before {
            display: inline;
        }

        &:not(.isIncoming) {
            .amount {
                // color: var(--nimiq-red);
            }

            > *:before {
                content: '-';
            }
        }

        &.isIncoming {
            .amount {
                color: var(--nimiq-green);
            }

            > *:before {
                content: '+';
            }
        }
    }
}
</style>

<template>
    <button class="group flex flex-row w-full text-left items-center p-4 my-1 rounded hover:bg-gray-200">
        <div v-if="dateDay" class="mr-4 text-center leading-tight opacity-50 flex-shrink-0">
            <span class="font-bold">{{ dateDay }}</span><br>
            <span class="text-sm font-semibold">{{ dateMonth }}</span>
        </div>
        <svg v-else class="nq-icon text-3xl opacity-25 mr-4 flex-shrink-0">
            <use xlink:href="/img/nimiq-style.icons.svg#nq-stopwatch"/>
        </svg>
        <div class="w-12 h-12 flex-shrink-0 relative">
            <Identicon :address="peerAddress"/>
            <svg v-if="isCashlink" class="nq-icon absolute right-0 bottom-0 text-white bg-blue-900 rounded-full text-lg border-white border-solid border">
                <use xlink:href="/img/nimiq-style.icons.svg#nq-cashlink-xsmall"/>
            </svg>
        </div>
        <div class="flex-grow overflow-hidden whitespace-no-wrap ml-4">
            <div v-if="peerLabel" class="font-semibold">{{ peerLabel }}</div>
            <div v-else class="font-mono">
                <span class="font-medium">{{ peerAddress.substring(0, 9) }}</span>
                <span class="opacity-50">{{ peerAddress.substring(9) }}</span>
            </div>
            <div class="opacity-50 text-sm font-semibold">
                <span v-if="dateTime">{{ dateTime }}</span>
                <span v-else class="uppercase tracking-wider">pending</span>
                <span class="ml-3">{{ data }}</span>
            </div>
        </div>
        <div class="text-right flex-shrink-0">
            <span class="flex flex-row flex-no-wrap font-bold" :class="isIncoming ? 'text-green-500' : 'opacity-75'">
                <span v-if="isIncoming">+</span>
                <!--<span v-else>-</span>-->
                <Amount
                    :amount="transaction.value"/>
            </span>
            <span class="flex flex-row flex-no-wrap justify-end text-sm font-semibold opacity-50">
                <span v-if="isIncoming">+</span>
                <!--<span v-else>-</span>-->
                <FiatAmount
                    :amount="transaction.value"/>
            </span>
        </div>
    </button>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { useAccountsStore } from '../stores/Accounts'
import { Transaction } from '../stores/Transactions'
import { twoDigit } from '../lib/NumberFormatting'
import { AddressBook, Utf8Tools } from '@nimiq/utils'
import { isFundingCashlink, isClaimingCashlink } from '../lib/CashlinkDetection'

import Identicon from '@/components/Identicon.vue'
import Amount from '@/components/Amount.vue'
import FiatAmount from '@/components/FiatAmount.vue'

export default createComponent({
    props: {
        transaction: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const tx = props.transaction as Transaction

        const { activeAddress, state: accounts$ } = useAccountsStore()

        const isIncoming = computed(() => tx.recipient === activeAddress.value)

        // Peer
        const peerAddress = computed(() => isIncoming.value ? tx.sender : tx.recipient)
        const peerLabel = computed(() => {
            // Search other accounts
            const ownedAccount = accounts$.accounts[peerAddress.value]
            if (ownedAccount) return ownedAccount.label

            // TODO: Search contacts

            // Search global address book
            const globalLabel = AddressBook.getLabel(peerAddress.value)
            if (globalLabel) return globalLabel

            return false
        })

        // Date
        const date = computed(() => tx.timestamp && new Date(tx.timestamp * 1000))
        const dateDay = computed(() => date.value && twoDigit(date.value.getDate()))
        const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        const dateMonth = computed(() => date.value && MONTHS[date.value.getMonth()])
        const dateTime = computed(() => date.value && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`)

        // Data
        const dataBytes = computed(() => tx.data.raw
            ? new Uint8Array(tx.data.raw.match(/.{1,2}/g)!.map(hex => parseInt(hex, 16)))
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
        Identicon,
        Amount,
        FiatAmount,
    },
})
</script>

<style lang="scss">

</style>

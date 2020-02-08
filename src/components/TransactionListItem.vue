<template>
    <div class="transaction" @click="$router.push({name: 'transaction', params: {hash}}).catch((err)=> {})">
        <div v-if="dateDay" class="date">
            <span class="day">{{ dateDay }}</span><br>
            <span class="month">{{ dateMonth }}</span>
        </div>
        <div v-else class="pending">
            <svg width="17" height="17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path opacity=".3" d="M4 2.5A7.49 7.49 0 1014.5 13" stroke="#1F2348" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 8.5A7.5 7.5 0 008.5 1" stroke="#0582CA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
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
            <transition name="fade">
                <div v-if="fiatValue === undefined" class="fiat-amount-loading">&nbsp;</div>
                <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount-unavailable">
                    Fiat value unavailable
                </div>
                <FiatAmount v-else :amount="fiatValue" :currency="fiatCurrency" :locale="language"/>
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
import { CashlinkIcon, Identicon, FiatAmount } from '@nimiq/vue-components';
import { useAddressStore } from '../stores/Address'
import { useFiatStore } from '../stores/Fiat';
import { useSettingsStore } from '../stores/Settings';
import { Transaction } from '../stores/Transactions'
import { twoDigit } from '../lib/NumberFormatting'
import { AddressBook, Utf8Tools } from '@nimiq/utils'
import { isFundingCashlink, isClaimingCashlink } from '../lib/CashlinkDetection'
import Amount from './Amount.vue';
import { useContactsStore } from '../stores/Contacts';
import { FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';

export default createComponent({
    props: {
        transaction: {
            type: Object,
            required: true,
        },
    },
    setup(props) {
        const constants = { FIAT_PRICE_UNAVAILABLE };

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
        const hash = computed(() => tx.value.transactionHash);
        const fiatValue = computed(() => tx.value.fiatValue ? tx.value.fiatValue[fiatCurrency.value] : undefined);

        const language = useSettingsStore().language;

        return {
            constants,
            dateDay,
            dateMonth,
            dateTime,
            data,
            fiatCurrency,
            fiatValue,
            hash,
            isCashlink,
            isIncoming,
            language,
            peerAddress,
            peerLabel,
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
    cursor: pointer;
    transition: background 500ms var(--nimiq-ease);

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
        flex-grow: 0;

        > .day {
            font-weight: bold;
        }

        > .month {
            font-size: 1.625rem;
            font-weight: 600;
        }
    }

    .pending {
        flex-grow: 0;
        height: 5rem;
        display: flex;
        align-items: center;
        justify-items: space-around;
        > * {
            animation: rotate 2s 0s linear infinite;

            @keyframes rotate {
                0% {
                    transform: rotateZ(0deg);
                }
                100% {
                    transform: rotateZ(360deg);
                }
            }
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
            }
        }
    }
}
</style>

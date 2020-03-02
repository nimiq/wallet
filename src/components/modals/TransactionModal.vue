<template>
    <Modal>
        <SmallPage class="transaction-modal">
            <PageHeader>
                Transaction
                {{ isIncoming ? $t('from') : $t('to') }}
                {{ peerLabel || peerAddress.substring(0, 14) }}

                <span v-if="state === TransactionState.PENDING" slot="more" class="nq-light-blue flex-row">
                    <CircleSpinner/>
                    {{ $t('Pending...') }}
                </span>
                <span v-else slot="more" :class="isIncoming ? 'nq-green' : 'opacity-60'">
                    {{ isIncoming ? $t('received') : $t('sent') }}
                    at {{ datum }} {{ time }}
                </span>
            </PageHeader>
            <PageBody class="flex-column">
                <div v-if="isIncoming" class="flex-row sender-recipient">
                    <div class="address-info flex-column">
                        <Identicon :address="peerAddress"/>
                        <span class="label">{{ peerLabel || peerAddress.substring(0, 9) }}</span>
                        <Copyable :text="peerAddress">
                            <AddressDisplay :address="peerAddress"/>
                        </Copyable>
                    </div>
                    <ArrowRightIcon/>
                    <div class="address-info flex-column">
                        <Identicon :address="activeAddressInfo.address"/>
                        <span class="label">{{ activeAddressInfo.label }}</span>
                        <Copyable :text="activeAddressInfo.address">
                            <AddressDisplay :address="activeAddressInfo.address"/>
                        </Copyable>
                    </div>
                </div>
                <div v-else class="flex-row sender-recipient">
                    <div class="address-info flex-column">
                        <Identicon :address="activeAddressInfo.address"/>
                        <span class="label">{{ activeAddressInfo.label }}</span>
                        <Copyable :text="activeAddressInfo.address">
                            <AddressDisplay :address="activeAddressInfo.address"/>
                        </Copyable>
                    </div>
                    <ArrowRightIcon/>
                    <div class="address-info flex-column">
                        <Identicon :address="peerAddress"/>
                        <span class="label">{{ peerLabel || peerAddress.substring(0, 9) }}</span>
                        <Copyable :text="peerAddress">
                            <AddressDisplay :address="peerAddress"/>
                        </Copyable>
                    </div>
                </div>

                <hr>

                <div class="amount-and-message flex-column">
                    <Amount :amount="transaction.value" :class="{
                        'nq-light-blue': state === TransactionState.PENDING,
                        'nq-green': state !== TransactionState.PENDING && isIncoming,
                    }"/>
                    <transition name="fade">
                        <FiatConvertedAmount v-if="state === TransactionState.PENDING" :amount="transaction.value"/>
                        <div v-else-if="fiatValue === undefined" class="fiat-amount-loading">&nbsp;</div>
                        <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount-unavailable">
                            Fiat value unavailable
                        </div>
                        <FiatAmount v-else :amount="fiatValue" :currency="fiatCurrency" :locale="language"/>
                    </transition>

                    <div class="message">{{ data }}</div>
                </div>

                <!-- <button class="nq-button-s">Send more</button> -->
                <div class="flex-spacer"></div>

                <Tooltip v-if="transaction.blockHeight">
                    <InfoCircleIcon slot="icon"/>
                    <span class="block">Block #{{ transaction.blockHeight }}</span>
                    <span v-if="confirmations" class="confirmations">{{ confirmations }} Confirmations</span>
                </Tooltip>
            </PageBody>
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { AddressBook } from '@nimiq/utils';
import {
    SmallPage,
    PageHeader,
    PageBody,
    Identicon,
    ArrowRightIcon,
    Copyable,
    AddressDisplay,
    FiatAmount,
    Tooltip,
    InfoCircleIcon,
    CircleSpinner,
} from '@nimiq/vue-components';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Contact from '../Contact.vue';
import Modal from './Modal.vue';
import { useTransactionsStore, TransactionState } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { useContactsStore } from '../../stores/Contacts';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useNetworkStore } from '../../stores/Network';
import { twoDigit } from '../../lib/NumberFormatting';
import { hex2Bytes, parseDataBytes, isCashlinkBytes } from '../../lib/DataFormatting';
import { FIAT_PRICE_UNAVAILABLE } from '../../lib/Constants';

export default defineComponent({
    name: 'transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const constants = { FIAT_PRICE_UNAVAILABLE };
        const transaction = computed(() => useTransactionsStore().state.transactions[props.hash]);

        const { activeAddressInfo, state: addresses$ } = useAddressStore();
        const { getLabel } = useContactsStore();

        const state = computed(() => transaction.value.state);

        const isIncoming = computed(() => transaction.value.recipient === activeAddressInfo.value!.address);

        // Peer
        const peerAddress = computed(() => isIncoming.value ? transaction.value.sender : transaction.value.recipient);
        const peerLabel = computed(() => {
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
            if (ownedAddressInfo) return ownedAddressInfo.label;
            // search contacts
            if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value);

            // Search global address book
            const globalLabel = AddressBook.getLabel(peerAddress.value);
            if (globalLabel) return globalLabel;

            return false;
        });

        // Date
        const date = computed(() => transaction.value.timestamp && new Date(transaction.value.timestamp * 1000));
        const datum = computed(() => date.value && date.value.toLocaleDateString());
        const time = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Data
        const dataBytes = computed(() => hex2Bytes(transaction.value.data.raw));
        const data = computed(() => parseDataBytes(dataBytes.value));
        const isCashlink = computed(() => isCashlinkBytes(dataBytes.value));

        // Fiat currency
        const { currency: fiatCurrency } = useFiatStore();
        const fiatValue = computed(() => transaction.value.fiatValue
            ? transaction.value.fiatValue[fiatCurrency.value]
            : undefined,
        );

        const { state: network$ } = useNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight && (network$.height - transaction.value.blockHeight));

        const { language } = useSettingsStore();

        return {
            transaction,
            constants,
            state,
            TransactionState,
            datum,
            time,
            data,
            fiatCurrency,
            fiatValue,
            isCashlink,
            isIncoming,
            language,
            peerAddress,
            peerLabel,
            activeAddressInfo,
            confirmations,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        ArrowRightIcon,
        Contact,
        Identicon,
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
        Copyable,
        AddressDisplay,
        FiatAmount,
        Tooltip,
        InfoCircleIcon,
        CircleSpinner,
    } as any,
});
</script>

<style lang="scss" scoped>
.transaction-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-header {
        /deep/ .nq-h1 {
            white-space: nowrap;
            overflow: hidden;
            margin-bottom: 1rem;
            mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
        }

        span {
            font-size: 2rem;
            font-weight: 600;
            align-items: center;
            justify-content: center;

            /deep/ .circle-spinner {
                margin-right: 1rem;
            }
        }
    }

    .page-body {
        justify-content: space-between;
        align-items: center;
        padding-bottom: 3rem;
    }

    .opacity-60 {
        opacity: 0.6;
    }

    .sender-recipient {
        justify-content: space-between;
        width: 100%;
        padding: 0 1rem;

        .nq-icon {
            font-size: 3rem;
            margin-top: 2.5rem;
            opacity: 0.4;
            flex-shrink: 0;
        }
    }

    .address-info {
        align-items: center;
        width: 19rem;
    }

    .identicon {
        width: 9rem;
        height: 9rem;
        margin: -0.5rem 0; // Identicon should be 72x63

        img {
            display: block;
        }
    }

    .label {
        font-size: 2rem;
        font-weight: 600;
        margin: 2rem 0 1rem;
        white-space: nowrap;
        overflow: hidden;
        width: 100%;
        text-align: center;
        mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
    }

    .copyable {
        padding: 0rem;
        margin-bottom: 3.5rem;

        &::before,
        &::after {
            padding-top: 1.5rem;
            padding-bottom: 0;
        }
    }

    .address-display {
        font-size: 2rem;
    }

    .address-display /deep/ .chunk {
        margin: 0.5rem 0;
    }

    hr {
        border: none;
        border-top: 1px solid rgba(31, 35, 72, 0.1);
        margin: 0 -2rem;
        width: calc(100% + 4rem);
    }

    .amount-and-message {
        align-items: center;
        margin-top: 3.5rem; // Same as .copyable margin-bottom
    }

    .amount {
        font-size: 5rem;
        line-height: 1.1;

        /deep/ .currency {
            font-size: 0.5em;
            font-weight: bold;
        }
    }

    .fiat-amount {
        font-size: 2rem;
        font-weight: 600;
        color: rgba(31, 35, 72, 0.5);
    }

    .message {
        margin: 1rem 0;
        text-align: center;
        font-size: 2rem;
        line-height: 1.375;
    }

    .tooltip {
        position: absolute;
        right: 2rem;
        top: 2rem;

        /deep/ a {
            color: rgba(31, 35, 72, 0.25);

            &:hover,
            &:focus {
                color: rgba(31, 35, 72, 0.6);
            }
        }

        /deep/ .tooltip-box {
            font-size: 1.75rem;
            white-space: nowrap;
            text-align: right;
            line-height: 1.3;
        }

        .block {
            font-weight: 600;
        }

        .confirmations {
            display: block;
            font-size: 1.625rem;
            opacity: 0.6;
        }
    }
}
</style>

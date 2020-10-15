<template>
    <Modal class="transaction-modal" :class="{'value-masked': amountsHidden}">
        <PageHeader :class="{'inline-header': !peerLabel}">

            <i18n v-if="swapTransaction && isIncoming" path="Swap from {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddress.substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else-if="swapTransaction" path="Swap to {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddress.substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <template v-else-if="peerAddress === constants.CASHLINK_ADDRESS">
                <label><i>&nbsp;</i>{{
                    peerLabel || peerAddress.substring(0, 9)
                }}</label>
            </template>

            <i18n v-else-if="isCashlink && isIncoming" path="Cashlink from {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddress.substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else-if="isCashlink && !isIncoming" path="Cashlink to {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddress.substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else-if="!isCashlink && isIncoming" path="Transaction from {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddress.substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else-if="!isCashlink && !isIncoming" path="Transaction to {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddress.substring(0, 9)
                    }}</label>
                </template>
            </i18n>
            <!-- TODO: find a way to avoid the template#address repetition -->

            <span
                v-if="state === TransactionState.NEW || state === TransactionState.PENDING"
                slot="more"
                class="nq-light-blue flex-row"
            >
                <CircleSpinner/>
                {{ $t('Pending...') }}
            </span>
            <span
                v-else-if="state === TransactionState.EXPIRED || state === TransactionState.INVALIDATED"
                slot="more"
                class="nq-red failed flex-row"
            >
                <CrossIcon/>
                {{ state === TransactionState.EXPIRED ? $t('Expired') : $t('Failed') }}
            </span>
            <span v-else slot="more" class="date" :class="isIncoming ? 'nq-green' : 'opacity-60'">
                <i18n v-if="isIncoming" path="received at {dateAndTime}" :tag="false">
                    <template v-slot:dateAndTime>
                        {{ datum }} <strong>&middot;</strong> {{ time }}
                    </template>
                </i18n>
                <i18n v-else path="sent at {dateAndTime}" :tag="false">
                    <template v-slot:dateAndTime>
                        {{ datum }} <strong>&middot;</strong> {{ time }}
                    </template>
                </i18n>
            </span>
        </PageHeader>
        <PageBody class="flex-column" :class="state">
            <div v-if="isIncoming" class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <div class="identicon">
                        <BitcoinIcon v-if="swapTransaction"/>
                        <Identicon v-else :address="peerAddress"/>
                        <div v-if="isCashlink" class="cashlink"><CashlinkSmallIcon/></div>
                        <div v-if="swapTransaction" class="cashlink"><SwapMediumIcon/></div>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerIsContact || !peerLabel"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <Tooltip v-if="swapTransaction" preferredPosition="bottom right" class="left-aligned">
                        <ShortAddress :address="peerAddress" slot="trigger"/>
                        {{ peerAddress }}
                    </Tooltip>
                    <Copyable v-else-if="peerAddress !== constants.CASHLINK_ADDRESS" :text="peerAddress">
                        <AddressDisplay :address="peerAddress"/>
                    </Copyable>
                </div>
                <ArrowRightIcon class="arrow"/>
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
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div class="identicon">
                        <UnclaimedCashlinkIcon v-if="peerAddress === constants.CASHLINK_ADDRESS" />
                        <BitcoinIcon v-else-if="swapTransaction"/>
                        <Identicon v-else :address="peerAddress"/>
                        <div v-if="isCashlink" class="cashlink"><CashlinkSmallIcon/></div>
                        <div v-if="swapTransaction" class="cashlink"><SwapMediumIcon/></div>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerIsContact || !peerLabel"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <Tooltip v-if="swapTransaction" preferredPosition="bottom left" class="right-aligned">
                        <ShortAddress :address="peerAddress" slot="trigger"/>
                        {{ peerAddress }}
                    </Tooltip>
                    <Copyable v-else-if="peerAddress !== constants.CASHLINK_ADDRESS" :text="peerAddress">
                        <AddressDisplay :address="peerAddress"/>
                    </Copyable>
                    <button
                        v-else-if="hubCashlink && hubCashlink.value"
                        class="nq-button-s manage-cashlink"
                        @click="manageCashlink(hubCashlink.address)"
                        @mousedown.prevent>{{ $t('Show Link') }}</button>
                </div>
            </div>

            <div class="amount-and-message flex-column">
                <Amount :amount="transaction.value" :class="{
                    isIncoming,
                    'nq-light-blue': state === TransactionState.NEW || state === TransactionState.PENDING,
                    'nq-green': (state === TransactionState.MINED || state === TransactionState.CONFIRMED)
                        && isIncoming,
                }" value-mask/>
                <transition name="fade">
                    <FiatConvertedAmount
                        v-if="state === TransactionState.PENDING"
                        :amount="transaction.value"
                        value-mask/>
                    <div v-else-if="fiatValue === undefined" class="fiat-amount">&nbsp;</div>
                    <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                        {{ $t('Fiat value unavailable') }}
                    </div>
                    <div v-else class="fiat-amount flex-row">
                        <Tooltip>
                            <template slot="trigger">
                                <!-- <HistoricValueIcon/> -->
                                <FiatAmount
                                    :amount="fiatValue"
                                    :currency="fiatCurrency"
                                    value-mask/>
                            </template>
                            {{ $t('Historic value') }}
                        </Tooltip>
                        <!-- <strong class="dot">&middot;</strong> -->
                        <!-- <Tooltip>
                            <FiatConvertedAmount slot="trigger" :amount="transaction.value" value-mask/>
                            {{ $t('Current value') }}
                        </Tooltip> -->
                    </div>
                </transition>

                <div class="message">{{ data }}</div>
            </div>

            <!-- <button class="nq-button-s">Send more</button> -->
            <div v-if="swapTransaction" class="swap-transaction flex-row">
                <div class="icon" :class="{'incoming': !isIncoming}">
                    <GroundedArrowUpIcon v-if="isIncoming"/>
                    <GroundedArrowDownIcon v-else/>
                </div>
                <div class="values">
                    <Amount :amount="swapTransaction.outputs[0].value" currency="btc" value-mask/>

                    <FiatConvertedAmount v-if="swapTransaction.state === TransactionState.PENDING"
                        :amount="swapTransaction.outputs[0].value" currency="btc" value-mask/>
                    <div v-else-if="!swapTransaction.outputs[0].fiatValue
                        || swapTransaction.outputs[0].fiatValue[fiatCurrency] === undefined"
                        class="fiat-amount">&nbsp;</div>
                    <div v-else-if="
                        swapTransaction.outputs[0].fiatValue[fiatCurrency] === constants.FIAT_PRICE_UNAVAILABLE"
                        class="fiat-amount">Fiat value unavailable</div>
                    <FiatAmount v-else
                        :amount="swapTransaction.outputs[0].fiatValue[fiatCurrency]" :currency="fiatCurrency"
                        value-mask/>
                </div>
                <div class="flex-grow"></div>
                <div class="swap-info">
                    <div v-if="swapInfo.provider" class="provider flex-row">
                        <FastspotIcon v-if="swapInfo.provider === 'Fastspot'"/>
                        {{ swapInfo.provider }}
                    </div>
                    <div v-if="swapInfo.id" class="id flex-row">
                        <span class="ID">ID</span>
                        <Tooltip preferredPosition="top left">
                            <ShortAddress :address="swapInfo.id" slot="trigger"/>
                            {{ swapInfo.id }}
                        </Tooltip>
                    </div>
                </div>
            </div>
            <div v-else class="flex-spacer"></div>

            <Tooltip preferredPosition="bottom right" class="info-tooltip">
                <InfoCircleSmallIcon slot="trigger"/>
                <span v-if="transaction.blockHeight" class="block">
                    {{ $t('Block #{height}', { height: transaction.blockHeight }) }}
                </span>
                <span class="confirmations">
                    {{ $tc('{count} Confirmation | {count} Confirmations', confirmations) }}
                </span>
                <i18n v-if="transaction.fee" class="fee" tag="span" path="{fee} fee">
                    <template #fee>
                        <Amount :amount="transaction.fee"/>
                    </template>
                </i18n>

                <BlueLink
                    :href="`https://${env === ENV_MAIN ? '' : 'test.'}nimiq.watch/#${transaction.transactionHash}`"
                    target="_blank"
                >{{ $t('Block explorer') }}</BlueLink>
            </Tooltip>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { AddressBook, BrowserDetection } from '@nimiq/utils';
import {
    PageHeader,
    PageBody,
    Identicon,
    ArrowRightIcon,
    Copyable,
    AddressDisplay,
    FiatAmount,
    Tooltip,
    InfoCircleSmallIcon,
    CircleSpinner,
    LabelInput,
    CashlinkSmallIcon,
    CrossIcon,
} from '@nimiq/vue-components';
import Config from 'config';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Modal from './Modal.vue';
import UnclaimedCashlinkIcon from '../icons/UnclaimedCashlinkIcon.vue';
// import HistoricValueIcon from '../icons/HistoricValueIcon.vue';
import BlueLink from '../BlueLink.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import GroundedArrowUpIcon from '../icons/GroundedArrowUpIcon.vue';
import GroundedArrowDownIcon from '../icons/GroundedArrowDownIcon.vue';
import SwapMediumIcon from '../icons/SwapMediumIcon.vue';
import FastspotIcon from '../icons/FastspotIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import { useTransactionsStore, TransactionState } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { useContactsStore } from '../../stores/Contacts';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useNetworkStore } from '../../stores/Network';
import { twoDigit } from '../../lib/NumberFormatting';
import { parseData } from '../../lib/DataFormatting';
import { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS, ENV_MAIN } from '../../lib/Constants';
import { isCashlinkData } from '../../lib/CashlinkDetection';
import { useCashlinkStore } from '../../stores/Cashlink';
import { manageCashlink } from '../../hub';
import { useSwapsStore } from '../../stores/Swaps';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { SwapAsset } from '../../lib/FastSpotApi';

export default defineComponent({
    name: 'transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props, context) {
        const constants = { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS };
        const transaction = computed(() => useTransactionsStore().state.transactions[props.hash]);

        const { activeAddressInfo, state: addresses$ } = useAddressStore();
        const { getLabel, setContact } = useContactsStore();

        const state = computed(() => transaction.value.state);

        const isIncoming = computed(() => transaction.value.recipient === activeAddressInfo.value!.address);

        // Data & Cashlink Data
        const isCashlink = computed(() => isCashlinkData(transaction.value.data.raw));
        const hubCashlink = computed(() => {
            if (!isCashlink.value) return null;

            const { state: cashlinks$ } = useCashlinkStore();
            const cashlinkAddress = isIncoming.value ? transaction.value.sender : transaction.value.recipient;
            const cashlink = cashlinks$.hubCashlinks[cashlinkAddress];

            if (cashlink) return cashlink;

            /**
             * In all browsers in iOS and also in Safari for Mac, we are unable to access
             * stored cashlinks from the Hub, because those browsers deny access to
             * IndexedDB in iframes (and we can't store the cashlinks in cookies like we
             * do for accounts & addresses, as that would occupy valuable cookie space,
             * which is limited to 4kb).
             * What we do instead in those browsers is to always show the "Show Link" button
             * as long as we are uncertain if the Hub has this cashlink or not. Because
             * when the user clicks the button and opens the Hub, we get one of three results:
             * 1. The Hub errors, and we know that the Hub DOES NOT have the cashlink.
             *    This is handled in the hub interface (/hub.ts) in the manageCashlink() method,
             *    by storing a dummy cashlink object with a value of 0 (explained below).
             * 2. The Hub returns a cashlink object, which we can store and now know that the
             *    Hub DOES have the cashlink data.
             * 3. The user closes the popup with the window controls instead of with the "Done"
             *    button in the Hub, which gives us no info and does not change anything.
             *
             * # Why set the value to 0?
             * To identify which cashlinks are stored in the Hub and which aren't, we are
             * using the cashlink value, since for real cashlinks this cannot be 0. So when
             * the cashlink's value is 0, we know this is a not-stored cashlink.
             */
            if (BrowserDetection.isIOS() || BrowserDetection.isSafari()) {
                return {
                    address: cashlinkAddress,
                    message: '',
                    value: 1,
                };
            }

            return null;
        });

        const swapInfo = computed(() => {
            if (!transaction.value.swapHash) return null;
            return useSwapsStore().state.swaps[transaction.value.swapHash] || null;
        });

        const swapTransaction = computed(() => {
            if (!swapInfo.value) return null;

            const swapData = isIncoming.value ? swapInfo.value.in : swapInfo.value.out;
            if (!swapData) return null;

            if (swapData.asset === SwapAsset.BTC) {
                const btcTx = useBtcTransactionsStore().state.transactions[swapData.transactionHash] || null;
                if (!btcTx) return null;
                return {
                    ...btcTx,
                    outputs: [btcTx.outputs[swapData.outputIndex]],
                };
            }

            return null;
        });

        const data = computed(() => {
            if (isCashlink.value) return hubCashlink.value ? hubCashlink.value.message : '';
            if (swapTransaction.value) return '';

            return parseData(transaction.value.data.raw);
        });

        // Related Transaction
        const { state: transactions$ } = useTransactionsStore();
        const relatedTx = computed(() => {
            if (!transaction.value.relatedTransactionHash) return null;
            return transactions$.transactions[transaction.value.relatedTransactionHash] || null;
        });

        // Peer
        const peerAddress = computed(() => {
            if (swapTransaction.value) {
                return isIncoming.value
                    ? swapTransaction.value.inputs[0].address!
                    : swapTransaction.value.outputs[0].address!;
            }

            if (isCashlink.value) {
                if (relatedTx.value) {
                    return isIncoming.value
                        ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
                        : relatedTx.value.recipient; // This is a funding tx, so the related tx is the claiming one
                }
                return constants.CASHLINK_ADDRESS; // No related tx yet, show placeholder
            }

            return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
        });
        const peerLabel = computed(() => {
            if (swapTransaction.value) {
                return context.root.$t('Bitcoin');
            }

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
        const peerIsContact = computed(() => !!getLabel.value(peerAddress.value));

        // Date
        const date = computed(() => transaction.value.timestamp && new Date(transaction.value.timestamp * 1000));
        const datum = computed(() => date.value && date.value.toLocaleDateString());
        const time = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Fiat currency
        const { currency: fiatCurrency } = useFiatStore();
        const fiatValue = computed(() => transaction.value.fiatValue
            ? transaction.value.fiatValue[fiatCurrency.value]
            : undefined,
        );

        const { state: network$ } = useNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight ? network$.height - transaction.value.blockHeight + 1 : 0);

        const { amountsHidden } = useSettingsStore();

        return {
            ENV_MAIN,
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
            peerAddress,
            peerLabel,
            activeAddressInfo,
            confirmations,
            peerIsContact,
            setContact,
            hubCashlink,
            manageCashlink,
            env: Config.environment,
            amountsHidden,
            swapInfo,
            swapTransaction,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        ArrowRightIcon,
        Identicon,
        PageBody,
        PageHeader,
        Modal,
        Copyable,
        AddressDisplay,
        FiatAmount,
        Tooltip,
        InfoCircleSmallIcon,
        CircleSpinner,
        CrossIcon,
        LabelInput,
        CashlinkSmallIcon,
        UnclaimedCashlinkIcon,
        // HistoricValueIcon,
        BlueLink,
        BitcoinIcon,
        GroundedArrowUpIcon,
        GroundedArrowDownIcon,
        FastspotIcon,
        SwapMediumIcon,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
.page-header {
    /deep/ .nq-h1 {
        margin-left: 2rem;
        margin-right: 2rem;
        max-width: calc(100% - 4rem);
        white-space: nowrap;
        overflow: hidden;
        margin-bottom: 1rem;
        mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
    }

    span {
        font-size: var(--body-size);
        font-weight: 600;
        align-items: center;
        justify-content: center;

        &.date {
            display: block;
        }

        /deep/ .circle-spinner,
        &.failed svg {
            margin-right: 1rem;
        }
    }

    &.inline-header {
        display: flex;
        flex-direction: column;

        /deep/ .nq-h1 {
            align-self: center;
        }
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    padding-bottom: 3rem;

    &.expired,
    &.invalidated {
        .identicon {
            filter: saturate(0);
            opacity: 0.5;
        }

        .label {
            opacity: 0.5;
        }

        .address-display {
            opacity: 0.3;
        }

        .amount-and-message {
            opacity: 0.4;
        }
    }
}

.opacity-60 {
    opacity: 0.6;
}

.sender-recipient {
    justify-content: space-between;
    width: 100%;
    padding: 0 1rem;

    .arrow {
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
    position: relative;
    width: 9rem;
    height: 9rem;
    margin: -0.5rem 0; // Identicon should be 72x63

    > .identicon {
        margin: 0;
    }

    svg {
        width: 100%;
        height: 100%;
    }

    > svg {
        width: 8rem;
        height: 8rem;
        margin: 0.5rem;
        color: #F7931A; // Bitcoin orange
    }

    img {
        display: block;
        height: 100%
    }

    .cashlink {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        bottom: -0.675rem;
        right: -0.25rem;
        color: white;
        background: var(--nimiq-blue-bg);
        border: 0.375rem solid white;
        border-radius: 3rem;
        height: 3.75rem;
        width: 3.75rem;
    }
}

.label,
.nq-input-s {
    font-size: var(--body-size);
    font-weight: 600;
    text-align: center;
}

.label {
    margin: 2rem 0 1rem;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
}

.nq-input-s {
    margin: 1.25rem 0 0.375rem;
    max-width: 100%;
}

.nq-input-s:not(:focus):not(:hover) {
    mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0) calc(100% - 1rem));
}

.copyable {
    padding: 0rem;

    &:hover .address-display,
    &:focus .address-display,
    &.copied .address-display {
        opacity: 1;
        font-weight: 500;
    }
}

.address-display {
    font-size: var(--body-size);
    transition: opacity .3s var(--nimiq-ease);
}

.address-display /deep/ .chunk {
    margin: 0.5rem 0;
}

.manage-cashlink {
    margin-top: 3rem;
}

.amount-and-message {
    align-items: center;

    .amount {
        --size: 5rem;
        font-size: var(--size);
        line-height: 1;
        margin-bottom: 0.5rem;

        /deep/ .currency {
            font-size: 0.5em;
            font-weight: bold;
            margin-right: -1.9em;
        }

        &:not(.isIncoming)::before {
            content: '-';
            margin-right: -0.1em;
            margin-left: -0.4em;
        }

        &.isIncoming::before {
            content: '+';
            margin-right: -0.1em;
            margin-left: -0.6em;
        }

        @media (max-width: 700px) { // Full Mobile Breakpoint
            font-size: 4.75rem;
        }
    }

    > .fiat-amount {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: 600;
        color: var(--text-50);
        align-items: center;

        svg {
            opacity: 0.8;
            margin-right: 0.5rem;
        }

        .dot {
            opacity: 0.6;
            margin: 0 1rem;
        }

        .tooltip {
            /deep/ .trigger {
                display: flex;
                flex-direction: row;
                align-items: center;

                transition: color 0.2s var(--nimiq-ease);

                &:hover,
                &:focus {
                    color: var(--text-60);
                }

                &::after {
                    top: -1.5rem;
                    background: #211B43;
                }
            }

            /deep/ .tooltip-box {
                white-space: nowrap;
                line-height: 1;
                padding: 1rem;
                transform: translateY(-1.5rem);
            }
        }
    }
}

.message {
    margin: 1rem 0;
    text-align: center;
    font-size: var(--body-size);
    line-height: 1.375;
    word-break: break-word;
}

.info-tooltip {
    position: absolute;
    left: 2rem;
    top: 2rem;

    /deep/ .trigger {
        color: rgba(31, 35, 72, 0.25);

        transition: color 0.3s var(--nimiq-ease);

        &::before {
            content: '';
            display: block;
            position: absolute;
            left: -1.5rem;
            top: -1.5rem;
            right: -1.5rem;
            bottom: -1.5rem;
            border-radius: 50%;
        }

        &:hover,
        &:focus {
            color: rgba(31, 35, 72, 0.6);
        }
    }

    /deep/ .tooltip-box {
        font-size: var(--small-size);
        white-space: nowrap;
        line-height: 1.3;
        font-weight: 600;
        transform: translate(-1rem, 2rem);
    }

    .confirmations {
        display: block;
        font-size: var(--small-label-size);
        opacity: 0.6;
    }

    .fee {
        display: inline-block;
        margin-top: 1.25rem;
    }

    .blue-link {
        color: var(--nimiq-light-blue-on-dark);
        margin-top: 1.25rem;
    }
}

.address-info .tooltip /deep/,
.swap-info .tooltip /deep/ {
    .tooltip-box {
        padding: 1rem;
        font-size: var(--small-size);
        line-height: 1;
        font-family: 'Fira Mono', monospace;
        font-weight: normal;
        letter-spacing: -0.02em;
        white-space:nowrap;
        word-spacing: -0.2em;
    }

    .trigger {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        transition: background 300ms var(--nimiq-ease);
        margin-bottom: .5rem;

        &:hover,
        &:focus,
        &:focus-within {
            background: var(--text-6);

            .short-address {
                opacity: .6;
            }
        }
    }
}

.tooltip.left-aligned /deep/ .tooltip-box {
    transform: translate(-9.25rem, 2rem);
}

.tooltip.right-aligned /deep/ .tooltip-box {
    transform: translate(9.25rem, 2rem);
}

.short-address {
    font-size: var(--body-size);
    opacity: 0.5;
    transition: opacity .3s var(--nimiq-ease);
}

.swap-transaction {
    padding: 3rem 2rem 0;
    align-items: center;
    align-self: stretch;
    margin: 0 -2rem;
    box-shadow: inset 0 1.5px var(--text-16);

    .icon {
        margin-right: 2.25rem;
        color: var(--text-40);

        &.incoming {
            color: var(--nimiq-green);
        }
    }

    .amount,
    .fiat-amount {
        display: block;
        --size: var(--body-size);
        font-size: var(--size);
        font-weight: 600;
    }

    .fiat-amount {
        --size: var(--small-size);
        font-size: var(--size);
        opacity: 0.5;
    }

    .swap-info {
        font-size: var(--small-size);
        font-weight: 600;

        .provider,
        .id {
            justify-content: flex-end;
            align-items: center;
        }

        .provider {
            opacity: 0.5;

            svg {
                opacity: calc(0.35 / 0.5);
                margin-top: 0.125rem;
                margin-right: 0.625rem;
            }
        }

        .id {
            .ID {
                opacity: 0.5;
                margin-right: 0.25rem;
            }

            .short-address {
                font-size: inherit;

                /deep/ .address {
                    font-family: inherit;
                }
            }

            .tooltip /deep/ .trigger {
                padding-left: 0.75rem;
                padding-right: 0.75rem;
                margin-bottom: 0;
                margin-right: -0.75rem;
            }
        }
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .page-header {
        /deep/ .nq-h1 {
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }

        &.inline-header /deep/ .nq-h1 {
            align-self: unset;
        }

        &:not(.inline-header) {
            /deep/ .nq-h1 {
                white-space: normal;
            }

            label {
                white-space: nowrap;
            }
        }
    }

    .address-info {
        flex-shrink: 0;
    }

    .tooltip.left-aligned /deep/ .tooltip-box {
        transform: translate(-7.75rem, 2rem);
    }

    .tooltip.right-aligned /deep/ .tooltip-box {
        transform: translate(7.75rem, 2rem);
    }

    .tooltip {
        /deep/ .tooltip-box {
            transform: translate(1rem, 2rem);
        }
    }

    .swap-transaction {
        margin: 0 -1rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }
}

@media (max-width: 450px) { // Nimiq Style breakpoint for smaller .nq-card-header padding
    .page-header {
        /deep/ .nq-h1 {
            margin-left: 3rem;
            margin-right: 3rem;
            // max-width: calc(100% - 6rem);
        }
    }
}

@media (max-width: 400px) {
    .sender-recipient {
        padding: 0;
    }
}

@media (max-width: 374px) {
    .page-body {
        padding-left: 2rem;
        padding-right: 2rem;
    }
}
</style>

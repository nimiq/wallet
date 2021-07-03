<template>
    <Modal class="transaction-modal" :class="{'value-masked': amountsHidden}">
        <PageHeader :class="{'inline-header': !peerLabel && !(isSwapProxy && !swapData)}">

            <template v-if="isCancelledSwap">{{ $t('Cancelled Swap') }}</template>

            <template v-else-if="isSwapProxy && !swapData">{{ $t('Swap') }}</template>

            <i18n v-else-if="swapData && isIncoming" path="Swap from {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.BTC" v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>{{ swapData.asset.toUpperCase() }}</template>
            </i18n>

            <i18n v-else-if="swapData" path="Swap to {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.BTC" v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>{{ swapData.asset.toUpperCase() }}</template>
            </i18n>

            <template v-else-if="peerAddress === constants.CASHLINK_ADDRESS">
                <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
            </template>

            <i18n v-else-if="isCashlink && isIncoming" path="Cashlink from {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>

            <i18n v-else-if="isCashlink && !isIncoming" path="Cashlink to {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>

            <i18n v-else-if="!isCashlink && isIncoming" path="Transaction from {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>

            <i18n v-else-if="!isCashlink && !isIncoming" path="Transaction to {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>
            <!-- TODO: find a way to avoid the template#address repetition -->

            <TransactionDetailOasisPayoutStatus
                v-if="swapData && swapData.asset === SwapAsset.EUR
                    && swapData.htlc && swapData.htlc.settlement
                    && swapData.htlc.settlement !== SettlementStatus.CONFIRMED"
                slot="more"
                :data="swapData"
            />
            <span
                v-else-if="state === TransactionState.NEW || state === TransactionState.PENDING"
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
                <i18n v-if="isIncoming" path="Received at {dateAndTime}" :tag="false">
                    <template v-slot:dateAndTime>
                        {{ datum }} <strong>&middot;</strong> {{ time }}
                    </template>
                </i18n>
                <i18n v-else path="Sent at {dateAndTime}" :tag="false">
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
                        <BitcoinIcon v-if="swapData && swapData.asset === SwapAsset.BTC"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <Identicon v-else :address="peerAddress"/>
                        <div v-if="isCashlink" class="cashlink-or-swap"><CashlinkSmallIcon/></div>
                        <div v-if="swapInfo || isSwapProxy" class="cashlink-or-swap"><SwapMediumIcon/></div>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerAddress && (peerIsContact || !peerLabel)"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <InteractiveShortAddress v-if="swapData && peerAddress"
                        :address="peerAddress" tooltipPosition="right"/>
                    <Copyable v-else-if="peerAddress && peerAddress !== constants.CASHLINK_ADDRESS" :text="peerAddress">
                        <AddressDisplay :address="peerAddress"/>
                    </Copyable>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <Identicon :address="transaction.recipient"/>
                    <span class="label">{{ myLabel }}</span>
                    <InteractiveShortAddress v-if="swapData"
                        :address="transaction.recipient" tooltipPosition="left"/>
                    <Copyable v-else :text="transaction.recipient">
                        <AddressDisplay :address="transaction.recipient"/>
                    </Copyable>
                </div>
            </div>

            <div v-else class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <Identicon :address="transaction.sender"/>
                    <span class="label">{{ myLabel }}</span>
                    <InteractiveShortAddress v-if="swapData"
                        :address="transaction.sender" tooltipPosition="right"/>
                    <Copyable v-else :text="transaction.sender">
                        <AddressDisplay :address="transaction.sender"/>
                    </Copyable>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div class="identicon">
                        <UnclaimedCashlinkIcon v-if="peerAddress === constants.CASHLINK_ADDRESS" />
                        <BitcoinIcon v-else-if="swapData && swapData.asset === SwapAsset.BTC"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <Identicon v-else :address="peerAddress"/>
                        <div v-if="isCashlink" class="cashlink-or-swap"><CashlinkSmallIcon/></div>
                        <div v-if="swapInfo || isSwapProxy" class="cashlink-or-swap"><SwapMediumIcon/></div>
                    </div>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerAddress && (peerIsContact || !peerLabel)"
                        :placeholder="$t('Add contact')"
                        :value="peerLabel || ''"
                        @input="setContact(peerAddress, $event.target.value)"
                    />
                    <span v-else class="label">{{ peerLabel }}</span>
                    <InteractiveShortAddress v-if="swapData && peerAddress"
                        :address="peerAddress" tooltipPosition="left"/>
                    <Copyable v-else-if="peerAddress && peerAddress !== constants.CASHLINK_ADDRESS" :text="peerAddress">
                        <AddressDisplay :address="peerAddress"/>
                    </Copyable>
                    <button
                        v-else-if="hubCashlink && hubCashlink.value"
                        class="nq-button-s manage-cashlink"
                        @click="manageCashlink(hubCashlink.address)"
                        @mousedown.prevent>{{ $t('Show Link') }}</button>
                    <small v-else-if="isCashlink" class="cashlink-not-available flex-column">
                        {{ $t('Link not available in this browser') }}
                    </small>
                </div>
            </div>

            <div class="amount-and-message flex-column">
                <Amount :amount="transaction.value" class="transaction-value" :class="{
                    isIncoming,
                    'nq-light-blue': state === TransactionState.NEW || state === TransactionState.PENDING,
                    'nq-green': (state === TransactionState.MINED || state === TransactionState.CONFIRMED)
                        && isIncoming,
                }" value-mask/>

                <div class="flex-row">
                    <transition name="fade">
                        <FiatConvertedAmount
                            v-if="state === TransactionState.PENDING"
                            :amount="transaction.value"
                            value-mask/>
                        <div v-else-if="fiatValue === undefined" class="fiat-amount">&nbsp;</div>
                        <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                            {{ $t('Fiat value unavailable') }}
                        </div>
                        <div v-else class="fiat-amount">
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
                        </div>
                    </transition>
                    <template v-if="swapData && (swapTransaction || swapData.asset === SwapAsset.EUR)">
                        <svg viewBox="0 0 3 3" width="3" height="3" xmlns="http://www.w3.org/2000/svg" class="dot">
                            <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor"/>
                        </svg>
                        <button v-if="swapData.asset === SwapAsset.BTC && swapTransaction"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace(`/btc-transaction/${swapTransaction.transactionHash}`)"
                        >
                            <div class="icon">
                                <GroundedArrowUpIcon v-if="isIncoming"/>
                                <GroundedArrowDownIcon v-else/>
                            </div>
                            <Amount
                                :amount="swapTransaction.outputs[0].value"
                                :currency="swapData.asset.toLowerCase()"
                                class="swapped-amount"
                                value-mask/>
                        </button>
                        <div v-else-if="swapData.asset === SwapAsset.EUR"
                            class="swap-other-side flex-row" :class="{'incoming': !isIncoming}"
                        >
                            <div class="icon">
                                <GroundedArrowUpIcon v-if="isIncoming"/>
                                <GroundedArrowDownIcon v-else/>
                            </div>
                            <FiatAmount
                                :amount="swapData.amount / 100"
                                :currency="swapData.asset.toLowerCase()"
                                class="swapped-amount"
                                value-mask/>
                        </div>
                    </template>
                </div>

                <div v-if="data" class="message">{{ data }}</div>
            </div>

            <!-- <button class="nq-button-s">Send more</button> -->
            <button v-if="showRefundButton" class="nq-button-s" @click="refundHtlc" @mousedown.prevent>
                {{ $t('Refund') }}
            </button>
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

                <BlueLink :href="explorerTxLink('NIM', transaction.transactionHash)" target="_blank" rel="noopener">
                    {{ $t('Block explorer') }}
                </BlueLink>
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
import { RefundSwapRequest, SignedTransaction } from '@nimiq/hub-api';
import { SwapAsset, getAssets } from '@nimiq/fastspot-api';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Modal from './Modal.vue';
import UnclaimedCashlinkIcon from '../icons/UnclaimedCashlinkIcon.vue';
// import HistoricValueIcon from '../icons/HistoricValueIcon.vue';
import BlueLink from '../BlueLink.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import BankIcon from '../icons/BankIcon.vue';
import GroundedArrowUpIcon from '../icons/GroundedArrowUpIcon.vue';
import GroundedArrowDownIcon from '../icons/GroundedArrowDownIcon.vue';
import SwapMediumIcon from '../icons/SwapMediumIcon.vue';
import FastspotIcon from '../icons/FastspotIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import { useTransactionsStore, TransactionState } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { useContactsStore } from '../../stores/Contacts';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useNetworkStore } from '../../stores/Network';
import { twoDigit } from '../../lib/NumberFormatting';
import { parseData } from '../../lib/DataFormatting';
import { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS } from '../../lib/Constants';
import { isProxyData, ProxyType } from '../../lib/ProxyDetection';
import { useProxyStore } from '../../stores/Proxy';
import { manageCashlink, refundSwap } from '../../hub';
import { useSwapsStore, SwapNimData } from '../../stores/Swaps';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { sendTransaction } from '../../network';
import { useAccountStore, AccountType } from '../../stores/Account';
import { explorerTxLink } from '../../lib/ExplorerUtils';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import { SettlementStatus } from '../../lib/OasisApi';
import TransactionDetailOasisPayoutStatus from '../TransactionDetailOasisPayoutStatus.vue';

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

        const isIncoming = computed(() => {
            const haveSender = !!addresses$.addressInfos[transaction.value.sender];
            const haveRecipient = !!addresses$.addressInfos[transaction.value.recipient];

            if (haveSender && !haveRecipient) return false;
            if (!haveSender && haveRecipient) return true;

            // Fall back to comparing with active address
            return transaction.value.recipient === activeAddressInfo.value!.address;
        });
        const myLabel = computed(() => addresses$.addressInfos[
            isIncoming.value
                ? transaction.value.recipient
                : transaction.value.sender
        ].label);

        // Data & Cashlink Data
        const isCashlink = computed(() => isProxyData(transaction.value.data.raw, ProxyType.CASHLINK));
        const hubCashlink = computed(() => {
            if (!isCashlink.value) return null;

            const { state: proxies$ } = useProxyStore();
            const cashlinkAddress = isIncoming.value ? transaction.value.sender : transaction.value.recipient;
            const cashlink = proxies$.hubCashlinks[cashlinkAddress];

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

        // Related Transaction
        const { state: transactions$ } = useTransactionsStore();
        const relatedTx = computed(() => {
            if (!transaction.value.relatedTransactionHash) return null;
            return transactions$.transactions[transaction.value.relatedTransactionHash] || null;
        });

        const { getSwapByTransactionHash } = useSwapsStore();
        const swapInfo = computed(() => getSwapByTransactionHash.value(transaction.value.transactionHash)
            || (transaction.value.relatedTransactionHash
                ? getSwapByTransactionHash.value(transaction.value.relatedTransactionHash)
                : null));
        const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
        // Note: the htlc proxy tx that is not funding or redeeming the htlc itself, i.e. the one we are displaying here
        // related to our address, always holds the proxy data.
        const isSwapProxy = computed(() => isProxyData(transaction.value.data.raw, ProxyType.HTLC_PROXY));
        const isCancelledSwap = computed(() =>
            (swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset)
            // Funded proxy and then refunded without creating an actual htlc?
            || (isSwapProxy.value && (isIncoming.value
                ? transaction.value.recipient === relatedTx.value?.sender
                : transaction.value.sender === relatedTx.value?.recipient)));

        const swapTransaction = computed(() => {
            if (!swapData.value) return null;

            if (swapData.value.asset === SwapAsset.BTC) {
                const btcTx = useBtcTransactionsStore().state.transactions[swapData.value.transactionHash];
                if (!btcTx) return null;
                return {
                    ...btcTx,
                    outputs: [btcTx.outputs[swapData.value.outputIndex]],
                };
            }

            return null;
        });

        const data = computed(() => {
            if (isCashlink.value) return hubCashlink.value ? hubCashlink.value.message : '';

            if (swapData.value && !isCancelledSwap.value) return '';

            if ('hashRoot' in transaction.value.data
                || (relatedTx.value && 'hashRoot' in relatedTx.value.data)) {
                return context.root.$t('HTLC Creation');
            }
            if ('hashRoot' in transaction.value.proof
                || (relatedTx.value && 'hashRoot' in relatedTx.value.proof)) {
                return context.root.$t('HTLC Settlement');
            }
            if ('creator' in transaction.value.proof
                || (relatedTx.value && 'creator' in relatedTx.value.proof)
                // if we have an incoming tx from a HTLC proxy but none of the above conditions met, the tx and related
                // tx are regular transactions and we regard the tx from the proxy as refund
                || (relatedTx.value && isSwapProxy.value && isIncoming.value)) {
                return context.root.$t('HTLC Refund');
            }

            return parseData(transaction.value.data.raw);
        });

        // Peer
        const peerAddress = computed(() => {
            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.BTC) {
                    return swapTransaction.value
                        ? isIncoming.value
                            ? swapTransaction.value.inputs[0].address!
                            : swapTransaction.value.outputs[0].address!
                        : ''; // we don't know the peer address
                }

                if (swapData.value.asset === SwapAsset.EUR) {
                    return swapData.value.iban || '';
                }
            }

            // For Cashlinks and swap proxies
            if (relatedTx.value) {
                return isIncoming.value
                    ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
                    : relatedTx.value.recipient; // This is a funding tx, so the related tx is the claiming one
            }

            if (isSwapProxy.value) return ''; // avoid displaying proxy address identicon until we know related address

            if (isCashlink.value) return constants.CASHLINK_ADDRESS; // No related tx yet, show placeholder

            return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
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
                    return context.root.$t('Bitcoin');
                }

                if (swapData.value.asset === SwapAsset.EUR) {
                    return swapData.value.bankLabel || context.root.$t('Bank Account');
                }

                return swapData.value.asset.toUpperCase();
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
        const peerIsContact = computed(() => !!peerAddress.value && !!getLabel.value(peerAddress.value));

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

        const { height: blockHeight } = useNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight ? blockHeight.value - transaction.value.blockHeight + 1 : 0);

        const { amountsHidden } = useSettingsStore();

        const showRefundButton = computed(() => !isIncoming.value
            && (
                // funded but not redeemed htlc which is now expired
                (swapInfo.value?.in?.asset === SwapAsset.NIM
                && (swapInfo.value.in.htlc?.timeoutBlockHeight || Number.POSITIVE_INFINITY) <= blockHeight.value
                && !swapInfo.value.out)
                // funded but not redeemed htlc proxy (no actual htlc had been created)
                || (isSwapProxy.value
                && !relatedTx.value
                && transaction.value.state === TransactionState.CONFIRMED
                && transaction.value.blockHeight! <= blockHeight.value - 15) // consider proxy "expired" after 15 blocks
            )
            // Only display the refund button for Ledger accounts as the Keyguard signs automatic refund transaction.
            // Note that we only check the active account here to save us scanning through all our accounts as typically
            // the transaction modal is opened from our current account's transaction history.
            && useAccountStore().activeAccountInfo.value?.type === AccountType.LEDGER,
        );

        async function refundHtlc() {
            const htlcDetails = (swapInfo.value?.in as SwapNimData | undefined)?.htlc;
            if (!htlcDetails && !isSwapProxy.value) throw new Error('Unexpected: unknown HTLC refund details');

            // eslint-disable-next-line no-async-promise-executor
            const requestPromise = new Promise<Omit<RefundSwapRequest, 'appName'>>(async (resolve) => {
                const assets = await getAssets();
                const { feePerUnit } = assets[SwapAsset.NIM];
                const fee = feePerUnit * 167; // 167 = NIM HTLC refunding tx size

                const request: Omit<RefundSwapRequest, 'appName'> = {
                    accountId: useAccountStore().activeAccountId.value!,
                    refund: {
                        type: SwapAsset.NIM,
                        sender: relatedTx.value?.recipient || transaction.value.recipient, // HTLC or proxy address
                        recipient: htlcDetails && !isSwapProxy.value
                            ? htlcDetails.refundAddress // My address, must be refund address of HTLC
                            : transaction.value.sender, // refund proxy or htlc to initial sender
                        value: transaction.value.value - fee,
                        fee,
                        validityStartHeight: blockHeight.value,
                    },
                };

                resolve(request);
            });

            const tx = await refundSwap(requestPromise);
            if (!tx) return;
            const plainTx = await sendTransaction(tx as SignedTransaction);
            await context.root.$nextTick();
            context.root.$router.replace(`/transaction/${plainTx.transactionHash}`);
        }

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
            isCancelledSwap,
            isSwapProxy,
            peerAddress,
            peerLabel,
            myLabel,
            confirmations,
            peerIsContact,
            setContact,
            hubCashlink,
            manageCashlink,
            amountsHidden,
            swapInfo,
            swapData,
            swapTransaction,
            SwapAsset,
            showRefundButton,
            refundHtlc,
            explorerTxLink,
            SettlementStatus,
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
        BankIcon,
        GroundedArrowUpIcon,
        GroundedArrowDownIcon,
        FastspotIcon,
        SwapMediumIcon,
        ShortAddress,
        SwapFeesTooltip,
        InteractiveShortAddress,
        TransactionDetailOasisPayoutStatus,
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

    button.swap-other-side {
        border-radius: 8rem;
        padding: 0.25rem 1.5rem;
        margin: -0.25rem -1.5rem;
        transition: background-color var(--transition-time) var(--nimiq-ease);

        &:hover,
        &:focus{
            background-color: #F2F2F4;
        }

        &.incoming:hover,
        &.incoming:focus{
            background-color: #EDFAF8;
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

        &.bitcoin {
            color: var(--bitcoin-orange);
        }
    }

    img {
        display: block;
        height: 100%
    }

    .cashlink-or-swap {
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

.cashlink-not-available {
    justify-content: center;
    font-size: var(--small-size);
    font-weight: 600;
    opacity: 0.5;
    text-align: center;
    height: 9rem;
}

.amount-and-message {
    align-items: center;
    margin: 4rem 0 1rem;

    .amount.transaction-value {
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

    .flex-row {
        align-items: center;
    }

    .fiat-amount {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;

        .tooltip {
            /deep/ .trigger {
                .fiat-amount {
                    transition: color 0.2s var(--nimiq-ease);
                }

                &:hover .fiat-amount,
                &:focus .fiat-amount {
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

            /deep/ [value-mask]::after{
                margin-right: 0;
            }
        }
    }

    .dot {
        margin: 0 1rem;
        color: var(--text-30);
    }

    button {
        line-height: 1;
    }

    .icon,
    .swapped-amount {
        color: var(--text-50);
    }

    .icon {
        margin-right: 0.375rem;
    }

    .swapped-amount {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: bold;
    }

    .swap-other-side.incoming {
        .icon,
        .swapped-amount {
            color: var(--nimiq-green);
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
    z-index: 3; // To be above .swipe-handle

    /deep/ .trigger {
        color: rgba(31, 35, 72, 0.25);
        font-size: 2.25rem;

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

.address-info .tooltip /deep/ {
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

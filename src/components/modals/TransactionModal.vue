<template>
    <Modal class="transaction-modal" :class="{'not-executed': transaction.executionResult === false}">
        <PageHeader :class="{'inline-header': !peerLabel && !(isSwapProxy && !swapData)}">

            <template v-if="isCancelledSwap">{{ $t('Cancelled Swap') }}</template>

            <template v-else-if="isSwapProxy && !swapData">{{ $t('Swap') }}</template>

            <i18n v-else-if="swapData && isIncoming" path="Swap from {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.BTC
                    || swapData.asset === SwapAsset.USDC
                    || swapData.asset === SwapAsset.USDC_MATIC
                    || swapData.asset === SwapAsset.USDT_MATIC" v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>{{ swapData.asset.toUpperCase() }}</template>
            </i18n>

            <i18n v-else-if="swapData" path="Swap to {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.BTC
                    || swapData.asset === SwapAsset.USDC
                    || swapData.asset === SwapAsset.USDC_MATIC
                    || swapData.asset === SwapAsset.USDT_MATIC" v-slot:address>
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
                    && swapData.htlc.settlement.status !== SettlementStatus.CONFIRMED"
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
                        <UsdcIcon v-else-if="swapData
                            && (swapData.asset === SwapAsset.USDC || swapData.asset === SwapAsset.USDC_MATIC)"/>
                        <UsdtIcon v-else-if="swapData && swapData.asset === SwapAsset.USDT_MATIC"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <HeroIcon v-else-if="peerAddress === constants.STAKING_CONTRACT_ADDRESS" full-size/>
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
                        :address="peerAddress" copyable tooltipPosition="bottom right"/>
                    <AddressDisplay v-else-if="peerAddress && peerAddress !== constants.CASHLINK_ADDRESS"
                        :address="peerAddress" copyable/>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <Identicon :address="transaction.recipient"/>
                    <span class="label">{{ myLabel }}</span>
                    <InteractiveShortAddress v-if="swapData"
                        :address="transaction.recipient" copyable tooltipPosition="bottom left"/>
                    <AddressDisplay v-else :address="transaction.recipient" copyable/>
                </div>
            </div>

            <div v-else class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <Identicon :address="transaction.sender"/>
                    <span class="label">{{ myLabel }}</span>
                    <InteractiveShortAddress v-if="swapData"
                        :address="transaction.sender" copyable tooltipPosition="bottom right"/>
                    <AddressDisplay v-else :address="transaction.sender" copyable/>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div class="identicon">
                        <UnclaimedCashlinkIcon v-if="peerAddress === constants.CASHLINK_ADDRESS" />
                        <BitcoinIcon v-else-if="swapData && swapData.asset === SwapAsset.BTC"/>
                        <UsdcIcon v-else-if="swapData
                            && (swapData.asset === SwapAsset.USDC || swapData.asset === SwapAsset.USDC_MATIC)"/>
                        <UsdtIcon v-else-if="swapData && swapData.asset === SwapAsset.USDT_MATIC"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <HeroIcon v-else-if="peerAddress === constants.STAKING_CONTRACT_ADDRESS" full-size/>
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
                        :address="peerAddress" copyable tooltipPosition="bottom left"/>
                    <AddressDisplay v-else-if="peerAddress && peerAddress !== constants.CASHLINK_ADDRESS"
                        :address="peerAddress" copyable/>
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
                    'nq-green': (
                        state === TransactionState.INCLUDED
                        || state === TransactionState.CONFIRMED
                        || state === TransactionState.MINED
                    ) && isIncoming,
                }" value-mask/>

                <div class="flex-row">
                    <div v-if="
                        swapData && swapData.asset === SwapAsset.EUR
                        && swapInfo && swapInfo.fees && swapInfo.fees.totalFee
                    " class="fiat-amount">
                        <Tooltip>
                            <template slot="trigger">
                                <FiatAmount :amount="(swapData.amount / 100)
                                    - ((swapInfo && swapInfo.fees && swapInfo.fees.totalFee) || 0)
                                    * (isIncoming ? 1 : -1)" :currency="assetToCurrency(swapData.asset)"
                                />
                            </template>
                            <span>{{ $t('Historic value') }}</span>
                            <p class="explainer">
                                {{ $t('This historic value is based on an average of cross-exchange prices.'
                                    + ' It might vary due to market volatility and liquidity.') }}
                            </p>
                        </Tooltip>
                    </div>
                    <transition v-else-if="!swapData || swapData.asset !== SwapAsset.EUR" name="fade">
                        <FiatConvertedAmount
                            v-if="state === TransactionState.PENDING"
                            :amount="transaction.value"
                            value-mask/>
                        <div v-else-if="fiat.value === undefined" class="fiat-amount">&nbsp;</div>
                        <div v-else-if="fiat.value === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                            {{ $t('Fiat value unavailable') }}
                        </div>
                        <div v-else class="fiat-amount">
                            <Tooltip>
                                <template slot="trigger">
                                    <!-- <HistoricValueIcon/> -->
                                    <FiatAmount
                                        :amount="fiat.value"
                                        :currency="fiat.currency"
                                        value-mask/>
                                </template>
                                <span>{{ $t('Historic value') }}</span>
                                <p class="explainer">
                                    {{ $t('This historic value is based on an average of cross-exchange prices.'
                                        + ' It might vary due to market volatility and liquidity.') }}
                                </p>
                            </Tooltip>
                        </div>
                    </transition>
                    <template v-if="swapData && (swapTransaction || swapData.asset === SwapAsset.EUR)">
                        <svg v-if="
                            swapData.asset !== SwapAsset.EUR
                            || (swapInfo && swapInfo.fees && swapInfo.fees.totalFee)"
                            viewBox="0 0 3 3" width="3" height="3" xmlns="http://www.w3.org/2000/svg" class="dot"
                        >
                            <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor"/>
                        </svg>
                        <button v-if="swapData.asset === SwapAsset.BTC && swapTransaction"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace({
                                name: RouteName.BtcTransaction,
                                params: { hash: swapTransaction.transactionHash } },
                            )"
                        >
                            <div class="icon">
                                <GroundedArrowUpIcon v-if="isIncoming"/>
                                <GroundedArrowDownIcon v-else/>
                            </div>
                            <Amount
                                :amount="swapTransaction.outputs[0].value"
                                :currency="assetToCurrency(swapData.asset)"
                                class="swapped-amount"
                                value-mask/>
                        </button>
                        <button v-if="(swapData.asset === SwapAsset.USDC || swapData.asset === SwapAsset.USDC_MATIC)
                            && swapTransaction"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace({
                                name: RouteName.UsdcTransaction,
                                params: { hash: swapTransaction.transactionHash }
                            })"
                        >
                            <div class="icon">
                                <GroundedArrowUpIcon v-if="isIncoming"/>
                                <GroundedArrowDownIcon v-else/>
                            </div>
                            <Amount
                                :amount="swapTransaction.value"
                                :currency="assetToCurrency(swapData.asset)"
                                class="swapped-amount"
                                value-mask/>
                        </button>
                        <button v-if="swapData.asset === SwapAsset.USDT_MATIC && swapTransaction"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace({
                                name: RouteName.UsdtTransaction,
                                params: { hash: swapTransaction.transactionHash }
                            })"
                        >
                            <div class="icon">
                                <GroundedArrowUpIcon v-if="isIncoming"/>
                                <GroundedArrowDownIcon v-else/>
                            </div>
                            <Amount
                                :amount="swapTransaction.value"
                                :currency="assetToCurrency(swapData.asset)"
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
                                :currency="assetToCurrency(swapData.asset)"
                                class="swapped-amount"
                                value-mask/>
                        </div>
                    </template>
                </div>

                <div v-if="data && peerAddress !== constants.STAKING_CONTRACT_ADDRESS" class="message">
                    {{ data }}
                </div>
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
                <span v-if="confirmations > -1" class="confirmations">
                    {{ $tc('{count} Confirmation | {count} Confirmations', confirmations) }}
                </span>
                <div v-else class="confirmations-skeleton"></div>
                <i18n v-if="transaction.fee" class="fee" tag="span" path="{fee} fee">
                    <template #fee>
                        <Amount :amount="transaction.fee"/>
                    </template>
                </i18n>

                <BlueLink :href="blockExplorerLink" target="_blank" rel="noopener">
                    {{ $t('Block explorer') }}
                </BlueLink>
            </Tooltip>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import {
    PageHeader,
    PageBody,
    Identicon,
    ArrowRightIcon,
    AddressDisplay,
    FiatAmount,
    Tooltip,
    InfoCircleSmallIcon,
    CircleSpinner,
    CashlinkSmallIcon,
    CrossIcon,
} from '@nimiq/vue-components';
import { BrowserDetection } from '@nimiq/utils';
import { RefundSwapRequest, SignedTransaction } from '@nimiq/hub-api';
import { SwapAsset, getAssets } from '@nimiq/fastspot-api';
import { SettlementStatus } from '@nimiq/oasis-api';
import { useRouter, RouteName } from '@/router';
import Config from 'config';
import { useI18n } from '@/lib/useI18n';
import { nextTick } from '@/lib/nextTick';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Modal from './Modal.vue';
import UnclaimedCashlinkIcon from '../icons/UnclaimedCashlinkIcon.vue';
// import HistoricValueIcon from '../icons/HistoricValueIcon.vue';
import BlueLink from '../BlueLink.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import UsdtIcon from '../icons/UsdtIcon.vue';
import BankIcon from '../icons/BankIcon.vue';
import GroundedArrowUpIcon from '../icons/GroundedArrowUpIcon.vue';
import GroundedArrowDownIcon from '../icons/GroundedArrowDownIcon.vue';
import SwapMediumIcon from '../icons/SwapMediumIcon.vue';
import { useTransactionsStore, TransactionState, toMs } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { useContactsStore } from '../../stores/Contacts';
import { useNetworkStore } from '../../stores/Network';
import { twoDigit } from '../../lib/NumberFormatting';
import { parseData } from '../../lib/DataFormatting';
import {
    CryptoCurrency,
    FIAT_PRICE_UNAVAILABLE,
    CASHLINK_ADDRESS,
    STAKING_CONTRACT_ADDRESS,
} from '../../lib/Constants';
import { useProxyStore } from '../../stores/Proxy';
import { manageCashlink, refundSwap } from '../../hub';
import { SwapNimData } from '../../stores/Swaps';
import { useBtcTransactionsStore, Transaction as BtcTransaction } from '../../stores/BtcTransactions';
import { useUsdcTransactionsStore, Transaction as UsdcTransaction } from '../../stores/UsdcTransactions';
import { useUsdtTransactionsStore, Transaction as UsdtTransaction } from '../../stores/UsdtTransactions';
import { sendTransaction } from '../../network';
import { useAccountStore } from '../../stores/Account';
import { explorerTxLink } from '../../lib/ExplorerUtils';
import { assetToCurrency } from '../../lib/swap/utils/Assets';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import TransactionDetailOasisPayoutStatus from '../TransactionDetailOasisPayoutStatus.vue';
import { getStakingTransactionMeaning } from '../../lib/StakingUtils';
import { useTransactionInfo } from '../../composables/useTransactionInfo';
import HeroIcon from '../icons/Staking/HeroIcon.vue';

export default defineComponent({
    name: 'transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const router = useRouter();
        const { $t } = useI18n();

        const constants = {
            FIAT_PRICE_UNAVAILABLE,
            CASHLINK_ADDRESS,
            STAKING_CONTRACT_ADDRESS,
        };
        const transaction = computed(() => useTransactionsStore().state.transactions[props.hash]);

        const { activeAddressInfo, state: addresses$ } = useAddressStore();
        const { getLabel, setContact } = useContactsStore();

        const state = computed(() => transaction.value.state);

        const {
            isCashlink,
            isSwapProxy,
            isCancelledSwap,
            peerLabel,
            relatedTx,
            swapData,
            swapInfo,
            fiat,
        } = useTransactionInfo(transaction);

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

        const swapTransaction = computed(() => {
            if (!swapData.value) return null;

            if (swapData.value.asset === SwapAsset.BTC) {
                const btcTx = useBtcTransactionsStore().state.transactions[swapData.value.transactionHash];
                if (!btcTx) return null;
                return {
                    ...btcTx,
                    outputs: [btcTx.outputs[swapData.value.outputIndex]],
                } as BtcTransaction;
            }

            if (swapData.value.asset === SwapAsset.USDC || swapData.value.asset === SwapAsset.USDC_MATIC) {
                const usdcTx = useUsdcTransactionsStore().state.transactions[swapData.value.transactionHash];
                if (!usdcTx) return null;
                return usdcTx;
            }

            if (swapData.value.asset === SwapAsset.USDT_MATIC) {
                const usdtTx = useUsdtTransactionsStore().state.transactions[swapData.value.transactionHash];
                if (!usdtTx) return null;
                return usdtTx;
            }

            return null;
        });

        const data = computed(() => {
            if (hubCashlink.value && hubCashlink.value.message) return hubCashlink.value.message;

            if (swapData.value && !isCancelledSwap.value) return '';

            if ('hashRoot' in transaction.value.data
                || (relatedTx.value && 'hashRoot' in relatedTx.value.data)) {
                return $t('HTLC Creation');
            }
            if ('hashRoot' in transaction.value.proof
                || (relatedTx.value && 'hashRoot' in relatedTx.value.proof)) {
                return $t('HTLC Settlement');
            }
            if ('creator' in transaction.value.proof) {
                // Detect Nimiq Pay transactions
                if (
                    'signer' in transaction.value.proof
                    && Config.nimiqPay.cosignerPublicKeys.includes(transaction.value.proof.publicKey!)
                ) {
                    return '';
                }

                return $t('HTLC Refund');
            }
            if ((relatedTx.value && 'creator' in relatedTx.value.proof)
                // if we have an incoming tx from a HTLC proxy but none of the above conditions met, the tx and related
                // tx are regular transactions and we regard the tx from the proxy as refund
                || (relatedTx.value && isSwapProxy.value && isIncoming.value)) {
                return $t('HTLC Refund');
            }

            const stakingData = getStakingTransactionMeaning(transaction.value, false);
            if (stakingData) return stakingData;

            return parseData(transaction.value.data.raw);
        });

        // Peer
        const peerAddress = computed(() => {
            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.BTC) {
                    const swapTx = swapTransaction.value as BtcTransaction | null;
                    return swapTx
                        ? isIncoming.value
                            ? swapTx.inputs[0].address!
                            : swapTx.outputs[0].address!
                        : ''; // we don't know the peer address
                }

                if (swapData.value.asset === SwapAsset.USDC || swapData.value.asset === SwapAsset.USDC_MATIC) {
                    const swapTx = swapTransaction.value as UsdcTransaction | null;
                    return swapTx
                        ? isIncoming.value ? swapTx.sender : swapTx.recipient
                        : ''; // we don't know the peer address
                }

                if (swapData.value.asset === SwapAsset.USDT_MATIC) {
                    const swapTx = swapTransaction.value as UsdtTransaction | null;
                    return swapTx
                        ? isIncoming.value ? swapTx.sender : swapTx.recipient
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

            if (
                'creator' in transaction.value.proof
                && 'signer' in transaction.value.proof
                && Config.nimiqPay.cosignerPublicKeys.includes(transaction.value.proof.publicKey!)
            ) {
                return transaction.value.proof.creator as string;
            }

            return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
        });

        const peerIsContact = computed(() => !!peerAddress.value && !!getLabel.value(peerAddress.value));

        // Date
        const date = computed(() => transaction.value.timestamp && new Date(toMs(transaction.value.timestamp)));
        const datum = computed(() => date.value && date.value.toLocaleDateString());
        const time = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        const { height: blockHeight } = useNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight ? blockHeight.value - transaction.value.blockHeight + 1 : 0);

        const showRefundButton = computed(() => !isIncoming.value
            && (
                ( // funded but not redeemed htlc which is now expired
                    swapInfo.value?.in?.asset === SwapAsset.NIM
                    && swapInfo.value.in.htlc && (
                        ('timeoutMs' in swapInfo.value.in.htlc && swapInfo.value.in.htlc.timeoutMs <= Date.now())
                        || (
                            'timeoutBlockHeight' in swapInfo.value.in.htlc
                            // @ts-expect-error PoW field
                            && swapInfo.value.in.htlc.timeoutBlockHeight <= blockHeight.value
                        )
                    )
                    && !swapInfo.value.out
                ) || ( // funded but not redeemed htlc proxy (no actual htlc had been created)
                    isSwapProxy.value
                    && !relatedTx.value
                    && transaction.value.state === TransactionState.CONFIRMED
                    // consider proxy "expired" after 15 blocks
                    && transaction.value.blockHeight! <= blockHeight.value - 15
                )
            ),
        );

        const blockExplorerLink = computed(() =>
            explorerTxLink(CryptoCurrency.NIM, transaction.value.transactionHash));

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
            await nextTick();
            router.replace({
                name: RouteName.Transaction,
                params: { hash: plainTx.transactionHash },
            });
        }

        return {
            transaction,
            constants,
            state,
            TransactionState,
            datum,
            time,
            data,
            fiat,
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
            swapInfo,
            swapData,
            swapTransaction,
            SwapAsset,
            showRefundButton,
            blockExplorerLink,
            refundHtlc,
            SettlementStatus,
            assetToCurrency,
            RouteName,
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
        AddressDisplay,
        FiatAmount,
        Tooltip,
        InfoCircleSmallIcon,
        CircleSpinner,
        CrossIcon,
        CashlinkSmallIcon,
        UnclaimedCashlinkIcon,
        // HistoricValueIcon,
        BlueLink,
        BitcoinIcon,
        UsdcIcon,
        UsdtIcon,
        BankIcon,
        GroundedArrowUpIcon,
        GroundedArrowDownIcon,
        SwapMediumIcon,
        InteractiveShortAddress,
        TransactionDetailOasisPayoutStatus,
        HeroIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";
@import '../../scss/functions.scss';

.not-executed {
    text-decoration: line-through;
}

.page-header {
    ::v-deep .nq-h1 {
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

        ::v-deep .circle-spinner,
        &.failed svg {
            margin-right: 1rem;
        }
    }

    &.inline-header {
        display: flex;
        flex-direction: column;

        ::v-deep .nq-h1 {
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

        .nq-input-s:not(:hover,:focus,:focus-visible) {
            color: var(--text-50);
        }

        .address-display:not(:hover,:focus,:focus-visible,:focus-within,.copied) {
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

    svg:not(.hero-icon) {
        width: 100%;
        height: 100%;
    }

    > svg:not(.hero-icon) {
        width: 8rem;
        height: 8rem;
        margin: 0.5rem;

        &.bitcoin {
            color: var(--bitcoin-orange);
        }

        &.usdc {
            color: var(--usdc-blue);
        }

        &.usdt {
            color: var(--usdt-green);
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

.address-display {
    padding: 0;
    font-size: var(--body-size);
    transition: opacity .3s var(--nimiq-ease), // for expired and invalidated transactions
        color .3s var(--nimiq-ease); // preserve original transition

    ::v-deep .chunk {
        margin: 0.5rem 0;
    }
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

        ::v-deep .currency {
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

        @media (max-width: $mobileBreakpoint) { // Full Mobile Breakpoint
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
            ::v-deep .trigger {
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

            ::v-deep .tooltip-box {
                width: 28rem;
                transform: translate(-10rem, -1.5rem);
            }

            ::v-deep [value-mask]::after{
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
    margin: 4rem 0 1rem;
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

    ::v-deep .trigger {
        color: nimiq-blue(0.25);
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
            color: nimiq-blue(0.6);
        }
    }

    ::v-deep .tooltip-box {
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

    .confirmations-skeleton {
        height: 1.5rem;
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.25rem;
        margin-top: 0.5rem;
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

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .page-header {
        ::v-deep .nq-h1 {
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }

        &.inline-header ::v-deep .nq-h1 {
            align-self: unset;
        }

        &:not(.inline-header) {
            ::v-deep .nq-h1 {
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

    .tooltip {
        ::v-deep .tooltip-box {
            transform: translate(1rem, 2rem);
        }
    }
}

@media (max-width: 450px) { // Nimiq Style breakpoint for smaller .nq-card-header padding
    .page-header {
        ::v-deep .nq-h1 {
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

<template>
    <Modal class="transaction-modal" :class="{'value-masked': amountsHidden}">
        <PageHeader
            :class="{'inline-header': !peerLabel && !(usesNimSwapProxy && !swapTransaction.relatedTransactionHash)}">

            <template v-if="isCancelledSwap">{{ $t('Cancelled Swap') }}</template>

            <template v-else-if="usesNimSwapProxy && !swapTransaction.relatedTransactionHash">{{
                $t('Swap')
            }}</template>

            <i18n v-else-if="swapData && isIncoming" path="Swap from {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.NIM && swapTransaction" v-slot:address>
                    <label>{{ peerLabel || peerAddresses[0].substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>?</template>
            </i18n>

            <i18n v-else-if="swapData" path="Swap to {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.NIM && swapTransaction" v-slot:address>
                    <label>{{ peerLabel || peerAddresses[0].substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>?</template>
            </i18n>

            <i18n v-else-if="isIncoming" path="Transaction from {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddresses[0].substring(0, 6) }}</label>
                </template>
            </i18n>

            <i18n v-else path="Transaction to {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddresses[0].substring(0, 6) }}</label>
                </template>
            </i18n>

            <TransactionDetailOasisPayoutStatus
                v-if="swapData && swapData.asset === SwapAsset.EUR && swapData.htlc
                    && swapData.htlc.settlement && swapData.htlc.settlement !== SettlementStatus.CONFIRMED"
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
                    <div v-if="swapInfo" class="identicon-container">
                        <Identicon
                            v-if="swapData && swapData.asset === SwapAsset.NIM && swapTransaction"
                            :address="peerAddresses[0]"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <Avatar v-else :label="!isCancelledSwap ? peerLabel || '' : ''"/>
                        <SwapMediumIcon/>
                    </div>
                    <Avatar v-else :label="peerLabel || ''"/>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="senderLabelAddress || !peerLabel"
                        :placeholder="$t('Unknown')"
                        :value="peerLabel || ''"
                        @input="setSenderLabel(senderLabelAddress || ownAddresses[0], $event.target.value)"
                    />
                    <span v-else class="label" :class="{'unlabelled': !peerLabel}">
                        {{ peerLabel || $t('Unknown') }}
                    </span>
                    <template v-if="peerAddresses[0] && peerAddresses[0] !== constants.BANK_ADDRESS">
                        <Tooltip preferredPosition="bottom right" class="left-aligned"
                            v-for="address in peerAddresses.slice(0, 3)" :key="address"
                        >
                            <ShortAddress :address="address" slot="trigger"/>
                            {{ address }}
                        </Tooltip>
                    </template>

                    <a v-if="peerAddresses.length > 3" :href="blockExplorerLink"
                        target="_blank" rel="noopener" class="nq-link"
                    >{{ $t('+{n} more', {n: peerAddresses.length - 3}) }}</a>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <BitcoinIcon/>
                    <span class="label">{{ $t('Bitcoin') }}</span>
                    <Tooltip preferredPosition="bottom left" class="right-aligned"
                        v-for="address in ownAddresses.slice(0, 3)" :key="address"
                    >
                        <ShortAddress :address="address" slot="trigger"/>
                        {{ address }}
                    </Tooltip>

                    <a v-if="ownAddresses.length > 3" :href="blockExplorerLink"
                        target="_blank" rel="noopener" class="nq-link"
                    >{{ $t('+{n} more', {n: ownAddresses.length - 3}) }}</a>
                </div>
            </div>
            <div v-else class="flex-row sender-recipient">
                <div class="address-info flex-column">
                    <BitcoinIcon/>
                    <span class="label">{{ $t('Bitcoin') }}</span>
                    <Tooltip preferredPosition="bottom right" class="left-aligned"
                        v-for="address in ownAddresses.slice(0, 3)" :key="address"
                    >
                        <ShortAddress :address="address" slot="trigger"/>
                        {{ address }}
                    </Tooltip>
                    <a v-if="ownAddresses.length > 3" :href="blockExplorerLink"
                        target="_blank" rel="noopener" class="nq-link"
                    >{{ $t('+{n} more', {n: ownAddresses.length - 3}) }}</a>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div v-if="swapInfo" class="identicon-container">
                        <Identicon
                            v-if="swapData && swapData.asset === SwapAsset.NIM && swapTransaction"
                            :address="peerAddresses[0]"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <Avatar v-else :label="!isCancelledSwap ? peerLabel || '' : ''"/>
                        <SwapMediumIcon/>
                    </div>
                    <Avatar v-else :label="peerLabel || ''"/>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="peerAddresses[0] && (recipientLabelAddress || !peerLabel)"
                        :placeholder="$t('Unknown')"
                        :value="peerLabel || ''"
                        @input="setRecipientLabel(recipientLabelAddress || peerAddresses[0], $event.target.value)"
                    />
                    <span v-else class="label" :class="{'unlabelled': !peerLabel}">
                        {{ peerLabel || $t('Unknown') }}
                    </span>
                    <template v-if="peerAddresses[0]">
                        <Tooltip preferredPosition="bottom left" class="right-aligned"
                            v-for="address in peerAddresses.slice(0, 3)" :key="address"
                        >
                            <ShortAddress :address="address" slot="trigger"/>
                            {{ address }}
                        </Tooltip>
                    </template>
                    <a v-if="peerAddresses.length > 3" :href="blockExplorerLink"
                        target="_blank" rel="noopener" class="nq-link"
                    >{{ $t('+{n} more', {n: peerAddresses.length - 3}) }}</a>
                </div>
            </div>

            <div class="amount-block flex-column">
                <Amount :amount="isIncoming ? amountReceived : amountSent" class="transaction-value" :class="{
                    isIncoming,
                    'nq-light-blue': state === TransactionState.NEW || state === TransactionState.PENDING,
                    'nq-green': (state === TransactionState.MINED || state === TransactionState.CONFIRMED)
                        && isIncoming,
                }" currency="btc" value-mask/>

                <div class="flex-row">
                    <transition name="fade">
                        <FiatConvertedAmount
                            v-if="state === TransactionState.PENDING"
                            :amount="isIncoming ? amountReceived : amountSent"
                            currency="btc"
                            value-mask/>
                        <div v-else-if="fiatValue === undefined" class="fiat-amount">&nbsp;</div>
                        <div v-else-if="fiatValue === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                            Fiat value unavailable
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
                        <button v-if="swapData.asset === SwapAsset.NIM && swapTransaction
                            && (!usesNimSwapProxy || swapTransaction.relatedTransactionHash)"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace(`/transaction/${swapTransaction.transactionHash}`)"
                        >
                            <div class="icon">
                                <GroundedArrowUpIcon v-if="isIncoming"/>
                                <GroundedArrowDownIcon v-else/>
                            </div>
                            <Amount
                                :amount="swapTransaction.value"
                                :currency="swapData.asset.toLowerCase()"
                                class="swapped-amount"
                                value-mask/>
                        </button>
                        <div v-else-if="swapData.asset === SwapAsset.EUR"
                            class="swap-other-side flex-row" :class="{'incoming': !isIncoming}">
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
                <!-- <span v-if="transaction.fee" class="fee"><Amount :amount="transaction.fee"/> fee</span> -->

                <BlueLink
                    :href="blockExplorerLink"
                    target="_blank" rel="noopener"
                >{{ $t('Block explorer') }}</BlueLink>
            </Tooltip>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    ArrowRightIcon,
    FiatAmount,
    Tooltip,
    InfoCircleSmallIcon,
    CircleSpinner,
    LabelInput,
    CrossIcon,
    Identicon,
} from '@nimiq/vue-components';
import { TransactionState } from '@nimiq/electrum-client';
import { RefundSwapRequest } from '@nimiq/hub-api';
import { SwapAsset, getAssets } from '@nimiq/fastspot-api';
import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Modal from './Modal.vue';
// import HistoricValueIcon from '../icons/HistoricValueIcon.vue';
import BlueLink from '../BlueLink.vue';
import Avatar from '../Avatar.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import ShortAddress from '../ShortAddress.vue';
import GroundedArrowUpIcon from '../icons/GroundedArrowUpIcon.vue';
import GroundedArrowDownIcon from '../icons/GroundedArrowDownIcon.vue';
import SwapMediumIcon from '../icons/SwapMediumIcon.vue';
import FastspotIcon from '../icons/FastspotIcon.vue';
import BankIcon from '../icons/BankIcon.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { twoDigit } from '../../lib/NumberFormatting';
import { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS } from '../../lib/Constants';
import { isProxyData, ProxyType } from '../../lib/ProxyDetection';
import { useSwapsStore, SwapBtcData } from '../../stores/Swaps';
import { useTransactionsStore } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { estimateFees } from '../../lib/BitcoinTransactionUtils';
import { refundSwap } from '../../hub';
import { sendTransaction } from '../../electrum';
import { explorerTxLink } from '../../lib/ExplorerUtils';
import { SettlementStatus } from '../../lib/OasisApi';
import TransactionDetailOasisPayoutStatus from '../TransactionDetailOasisPayoutStatus.vue';

export default defineComponent({
    name: 'btc-transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props, context) {
        const constants = { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS };
        const transaction = computed(() => useBtcTransactionsStore().state.transactions[props.hash]);

        // Note that as the transaction modal is typically opened from the active account's transaction history, we base
        // our calculations here on the active account and its addresses. This yields wrong results if the opened
        // transaction modal (e.g. opened via url) does not belong to the active account but saves us scanning through
        // all accounts in the common case.
        const {
            state: btcAddresses$,
            activeInternalAddresses,
            activeExternalAddresses,
        } = useBtcAddressStore();

        const {
            setRecipientLabel,
            getRecipientLabel,
            setSenderLabel,
            getSenderLabel,
        } = useBtcLabelsStore();

        const state = computed(() => transaction.value.state);

        const inputsSent = computed(() => transaction.value.inputs.filter((input) =>
            input.address && (activeInternalAddresses.value.includes(input.address)
                || activeExternalAddresses.value.includes(input.address)
            ),
        ));

        const isIncoming = computed(() => inputsSent.value.length === 0);

        const outputsReceived = computed(() => {
            if (!isIncoming.value) return [];

            const receivedToExternal = transaction.value.outputs
                .filter((output) => output.address && activeExternalAddresses.value.includes(output.address));

            if (receivedToExternal.length > 0) return receivedToExternal;

            return transaction.value.outputs
                .filter((output) => output.address && activeInternalAddresses.value.includes(output.address));
        });
        const amountReceived = computed(() => outputsReceived.value.reduce((sum, output) => sum + output.value, 0));

        const outputsSent = computed(() => isIncoming.value
            ? []
            : transaction.value.outputs.filter((output) =>
                !output.address || !activeInternalAddresses.value.includes(output.address)),
        );
        const amountSent = computed(() => outputsSent.value.reduce((sum, output) => sum + output.value, 0));

        const ownAddresses = computed(() => (isIncoming.value
            ? outputsReceived.value.map((output) => output.address || output.script)
            : inputsSent.value.map((input) => input.address || input.script)
        ).filter((address, index, array) => array.indexOf(address) === index)); // dedupe

        const { getSwapByTransactionHash } = useSwapsStore();
        const swapInfo = computed(() => getSwapByTransactionHash.value(transaction.value.transactionHash));
        const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
        const isCancelledSwap = computed(() =>
            swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset);

        const swapTransaction = computed(() => {
            if (!swapData.value) return null;

            if (swapData.value.asset === SwapAsset.NIM) {
                let swapTx = useTransactionsStore().state.transactions[swapData.value.transactionHash];
                if (swapTx?.relatedTransactionHash) {
                    // Avoid showing the swap proxy, instead show our related address.
                    swapTx = useTransactionsStore().state.transactions[swapTx.relatedTransactionHash];
                }
                return swapTx || null;
            }

            return null;
        });

        const usesNimSwapProxy = computed(() => {
            if (!swapTransaction.value) return false;
            const swapPeerAddress = isIncoming.value
                ? swapTransaction.value.sender
                : swapTransaction.value.recipient;
            // Note that we don't only test for the swap proxy detection extra data here as the swap tx holds htlc data
            // instead. Only the related tx holds the proxy identifying extra data.
            return isProxyData(swapTransaction.value.data.raw, ProxyType.HTLC_PROXY)
                || swapTransaction.value.relatedTransactionHash
                || !useAddressStore().state.addressInfos[swapPeerAddress]; // not one of our addresses -> proxy
        });

        // Data
        const data = computed(() => {
            if (isCancelledSwap.value) {
                return isIncoming.value ? context.root.$t('HTLC Refund') : context.root.$t('HTLC Creation');
            }

            // if ('hashRoot' in props.transaction.data) {
            //     return context.root.$t('HTLC Creation');
            // }
            // if ('creator' in props.transaction.proof) {
            //     return context.root.$t('HTLC Refund');
            // }
            // if ('hashRoot' in props.transaction.proof) {
            //     return context.root.$t('HTLC Settlement');
            // }

            return '';
        });

        // Peer
        const peerAddresses = computed(() => {
            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                    if (usesNimSwapProxy.value && !swapTransaction.value.relatedTransactionHash) {
                        // Avoid displaying proxy address identicon until we know related address.
                        return [''];
                    }
                    return isIncoming.value ? [swapTransaction.value.sender] : [swapTransaction.value.recipient];
                }
                if (swapData.value.asset === SwapAsset.EUR) return [swapData.value.iban || ''];
            }

            return (isIncoming.value
                ? transaction.value.inputs.map((input) => input.address || input.script)
                : outputsSent.value.map((output) => output.address || output.script)
            ).filter((address, index, array) => array.indexOf(address) === index); // dedupe
        });
        const peerLabel = computed(() => {
            if (isCancelledSwap.value) {
                return context.root.$t('Cancelled Swap');
            }

            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                    return useAddressStore().state.addressInfos[peerAddresses.value[0]]?.label
                        || context.root.$t('Swap'); // avoid displaying proxy address until we know related peer address
                }

                if (swapData.value.asset === SwapAsset.EUR) {
                    return swapData.value.bankLabel || context.root.$t('Bank Account') as string;
                }

                return swapData.value.asset.toUpperCase();
            }

            if (isIncoming.value) {
                // Search sender labels
                for (const address of ownAddresses.value) {
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
        const senderLabelAddress = computed(() => isIncoming.value
            && (ownAddresses.value.find((address) => !!getSenderLabel.value(address)) || false));
        const recipientLabelAddress = computed(() => !isIncoming.value
            && (peerAddresses.value.find((address) => !!getRecipientLabel.value(address)) || false));

        // Date
        const date = computed(() => transaction.value.timestamp && new Date(transaction.value.timestamp * 1000));
        const datum = computed(() => date.value && date.value.toLocaleDateString());
        const time = computed(() => date.value
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

        const { height: blockHeight, timestamp: blockTimestamp } = useBtcNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight ? blockHeight.value - transaction.value.blockHeight + 1 : 0);

        const { amountsHidden } = useSettingsStore();

        const showRefundButton = computed(() => !isIncoming.value
            && swapInfo.value?.in?.asset === SwapAsset.BTC
            && (swapInfo.value.in.htlc?.timeoutTimestamp || Number.POSITIVE_INFINITY) <= blockTimestamp.value
            && !swapInfo.value.out
            // Only display the refund button for Ledger accounts as the Keyguard signs automatic refund transaction.
            && useAccountStore().activeAccountInfo.value?.type === AccountType.LEDGER,
        );

        const blockExplorerLink = computed(() => explorerTxLink(SwapAsset.BTC, transaction.value.transactionHash));

        async function refundHtlc() {
            const swapIn = swapInfo.value!.in as SwapBtcData;
            const htlcDetails = swapIn.htlc!;
            const htlcOutput = outputsSent.value[0];

            // eslint-disable-next-line no-async-promise-executor
            const requestPromise = new Promise<Omit<RefundSwapRequest, 'appName'>>(async (resolve) => {
                const assets = await getAssets();
                const { feePerUnit } = assets[SwapAsset.BTC];
                // 102 extra weight units for BTC HTLC refund tx
                const fee = estimateFees(1, 1, feePerUnit, 102);

                const request: Omit<RefundSwapRequest, 'appName'> = {
                    accountId: useAccountStore().activeAccountId.value!,
                    refund: {
                        type: SwapAsset.BTC,
                        input: {
                            transactionHash: transaction.value.transactionHash,
                            outputIndex: htlcOutput.index,
                            outputScript: htlcOutput.script,
                            value: htlcOutput.value,
                            witnessScript: htlcDetails.script,
                        },
                        output: {
                            address: useBtcAddressStore().availableExternalAddresses.value[0],
                            value: htlcOutput.value - fee,
                        },
                        refundAddress: htlcDetails.refundAddress, // My address, must be refund address of HTLC
                    },
                };

                resolve(request);
            });

            const tx = await refundSwap(requestPromise);
            if (!tx) return;
            const plainTx = await sendTransaction(tx);
            await context.root.$nextTick();
            context.root.$router.replace(`/btc-transaction/${plainTx.transactionHash}`);
        }

        return {
            transaction,
            constants,
            state,
            TransactionState,
            datum,
            time,
            data,
            outputsReceived,
            amountReceived,
            inputsSent,
            amountSent,
            fiatCurrency,
            fiatValue,
            isIncoming,
            peerAddresses,
            peerLabel,
            ownAddresses,
            confirmations,
            // peerIsContact,
            // setContact,
            amountsHidden,
            blockExplorerLink,
            senderLabelAddress,
            recipientLabelAddress,
            setSenderLabel,
            setRecipientLabel,
            swapInfo,
            swapData,
            swapTransaction,
            SwapAsset,
            usesNimSwapProxy,
            isCancelledSwap,
            showRefundButton,
            refundHtlc,
            SettlementStatus,
        };
    },
    components: {
        Amount,
        FiatConvertedAmount,
        ArrowRightIcon,
        Avatar,
        BitcoinIcon,
        PageBody,
        PageHeader,
        Modal,
        ShortAddress,
        FiatAmount,
        Tooltip,
        InfoCircleSmallIcon,
        CircleSpinner,
        CrossIcon,
        LabelInput,
        // HistoricValueIcon,
        BlueLink,
        GroundedArrowUpIcon,
        GroundedArrowDownIcon,
        FastspotIcon,
        BankIcon,
        Identicon,
        SwapMediumIcon,
        SwapFeesTooltip,
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
    overflow-y: initial;

    &.expired,
    &.invalidated {
        .avatar {
            filter: saturate(0);
            opacity: 0.5;
        }

        .label {
            opacity: 0.5;
        }

        .address-display {
            opacity: 0.3;
        }

        .amount-block {
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

    .nq-link {
        font-size: var(--small-size);
        color: inherit;
        opacity: 0.5;
    }
}

.avatar,
.bank-icon,
.address-info > svg {
    position: relative;
    width: 8rem;
    height: 8rem;
    font-size: 3.75rem;
    display: block;
}

.address-info > svg {
    color: var(--bitcoin-orange);
}

.address-info .identicon-container {
    position: relative;

    > svg:last-child {
        position: absolute;
        right: 0;
        bottom: -1.125rem;

        width: 3.75rem; // 3rem + border
        height: 3.75rem;
        color: white;
        background: var(--nimiq-blue-bg);
        border-radius: 50%;
        border: 0.375rem solid white;
    }

    .identicon {
        width: 9rem;
        height: 9rem;
        margin: -0.5rem 0; // Identicon should be 72x63
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

    &.unlabelled {
        font-style: italic;
    }
}

.nq-input-s {
    margin: 1.25rem 0 0.375rem;
    max-width: 100%;
}

.nq-input-s:not(:focus):not(:hover) {
    mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0) calc(100% - 1rem));
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

.amount-block {
    align-items: center;
    margin: 4rem 0 2rem;

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

    .message {
        margin: 1rem 0;
        text-align: center;
        font-size: var(--body-size);
        line-height: 1.375;
        word-break: break-word;
    }
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

    // .fee {
    //     display: inline-block;
    //     margin-top: 1.25rem;
    // }

    .blue-link {
        color: var(--nimiq-light-blue-on-dark);
        margin-top: 1.25rem;
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

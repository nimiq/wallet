<template>
    <Modal class="transaction-modal">
        <PageHeader
            :class="{'inline-header': !peerLabel && !(usesNimSwapProxy && !swapTransaction.relatedTransactionHash)}"
        >
            <template v-if="isCancelledSwap">{{ $t('Cancelled Swap') }}</template>

            <template v-else-if="usesNimSwapProxy && !swapTransaction.relatedTransactionHash">{{
                $t('Swap')
            }}</template>

            <i18n v-else-if="swapData && isIncoming" path="Swap from {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.NIM || swapData.asset === SwapAsset.BTC" v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>{{ swapData.asset.toUpperCase() }}</template>
            </i18n>

            <i18n v-else-if="swapData" path="Swap to {address}" :tag="false">
                <template v-if="swapData.asset === SwapAsset.NIM || swapData.asset === SwapAsset.BTC" v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>

                <template v-else-if="swapData.asset === SwapAsset.EUR" v-slot:address>
                    <label>{{ $t('Euro') }}</label>
                </template>

                <template v-else v-slot:address>{{ swapData.asset.toUpperCase() }}</template>
            </i18n>

            <i18n v-else-if="isIncoming" path="Transaction from {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>

            <i18n v-else-if="!isIncoming" path="Transaction to {address}" :tag="false">
                <template v-slot:address>
                    <label>{{ peerLabel || peerAddress.substring(0, 9) }}</label>
                </template>
            </i18n>

            <TransactionDetailOasisPayoutStatus
                v-if="swapData && swapData.asset === SwapAsset.EUR
                    && swapData.htlc && swapData.htlc.settlement
                    && swapData.htlc.settlement.status !== SettlementStatus.CONFIRMED"
                slot="more"
                :data="swapData"
            />
            <span
                v-else-if="transaction.state === TransactionState.FAILED"
                slot="more"
                class="nq-red failed flex-row"
            >
                <CrossIcon/>
                {{ $t('Partially reverted') }}
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
        <PageBody class="flex-column" :class="transaction.state">
            <div class="flex-row sender-recipient">
                <div v-if="isIncoming && swapInfo" class="swap-peer flex-column">
                    <div class="identicon-container">
                        <Identicon
                            v-if="swapData && swapData.asset === SwapAsset.NIM && swapTransaction"
                            :address="peerAddress"/>
                        <BitcoinIcon v-else-if="swapData && swapData.asset === SwapAsset.BTC"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <Avatar v-else :label="!isCancelledSwap ? peerLabel || '' : ''"/>
                        <SwapMediumIcon/>
                    </div>
                    <span class="label">{{ peerLabel }}</span>
                    <InteractiveShortAddress v-if="swapData && peerAddress"
                        :address="peerAddress" copyable tooltipPosition="bottom right"/>
                </div>
                <UsdcAddressInfo v-else
                    :address="transaction.sender"
                    :label="isIncoming ? peerLabel : undefined"
                    copyable
                    :editable="isIncoming ? (peerIsContact || !peerLabel) : false"
                    tooltipPosition="bottom right"
                />
                <ArrowRightIcon class="arrow"/>
                <div v-if="!isIncoming && swapInfo" class="swap-peer flex-column">
                    <div class="identicon-container">
                        <Identicon
                            v-if="swapData && swapData.asset === SwapAsset.NIM && swapTransaction"
                            :address="peerAddress"/>
                        <BitcoinIcon v-else-if="swapData && swapData.asset === SwapAsset.BTC"/>
                        <BankIcon v-else-if="swapData && swapData.asset === SwapAsset.EUR"/>
                        <Avatar v-else :label="!isCancelledSwap ? peerLabel || '' : ''"/>
                        <SwapMediumIcon/>
                    </div>
                    <span class="label">{{ peerLabel || (showRefundButton ? $t('Expired HTLC') : '&nbsp;') }}</span>
                    <InteractiveShortAddress :address="peerAddress" copyable tooltipPosition="bottom left"/>
                </div>
                <UsdcAddressInfo v-else
                    :address="transaction.recipient"
                    :label="!isIncoming ? peerLabel : undefined"
                    copyable
                    :editable="!isIncoming ? (peerIsContact || !peerLabel) : false"
                    tooltipPosition="bottom left"
                />
            </div>

            <div class="amount-block flex-column">
                <Amount :amount="txValue" :currency="ticker" value-mask
                    class="transaction-value" :class="{
                    isIncoming,
                    'nq-green': isIncoming,
                }" />

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
                                {{ $t('This value is based on the historic exchange rate of the USD and your ' +
                                    'reference currency.') }}
                            </p>
                        </Tooltip>
                    </div>
                    <transition v-else-if="!swapData || swapData.asset !== SwapAsset.EUR" name="fade">
                        <FiatConvertedAmount
                            v-if="transaction.state === TransactionState.PENDING"
                            :amount="txValue"
                            currency="usdt"
                            value-mask/>
                        <div v-else-if="fiat.value === undefined" class="fiat-amount">&nbsp;</div>
                        <div v-else-if="fiat.value === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                            Fiat value unavailable
                        </div>
                        <div v-else class="fiat-amount">
                            <Tooltip>
                                <template slot="trigger">
                                    <!-- <HistoricValueIcon/> -->
                                    <FiatAmount
                                        :amount="fiat.value / transaction.value * txValue"
                                        :currency="fiat.currency"
                                        value-mask/>
                                </template>
                                <span>{{ $t('Historic value') }}</span>
                                <p class="explainer">
                                    {{ $t('This value is based on the historic exchange rate of the USD and your ' +
                                        'reference currency.') }}
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
                        <button v-if="swapData.asset === SwapAsset.NIM && swapTransaction
                            && (!usesNimSwapProxy || swapTransaction.relatedTransactionHash)"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace({
                                name: RouteName.Transaction,
                                params: { transactionHash: swapTransaction.transactionHash }
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
                        <button v-if="swapData.asset === SwapAsset.BTC && swapTransaction"
                            class="swap-other-side reset flex-row" :class="{'incoming': !isIncoming}"
                            @click="$router.replace({
                                name: RouteName.BtcTransaction,
                                params: { transactionHash: swapTransaction.transactionHash }
                            })"
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
                        <div v-else-if="swapData.asset === SwapAsset.EUR"
                            class="swap-other-side flex-row" :class="{'incoming': !isIncoming}">
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

                <div v-if="data" class="message">{{ data }}</div>
            </div>

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
                <span v-if="transaction.fee" class="fee">
                    <Amount :amount="transaction.fee" :currency="ticker" /> fee
                </span>

                <BlueLink
                    :href="blockExplorerLink"
                    target="_blank" rel="noopener"
                >{{ $t('Block explorer') }}</BlueLink>
            </Tooltip>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import {
    ArrowRightIcon,
    FiatAmount,
    InfoCircleSmallIcon,
    PageBody,
    PageHeader,
    Tooltip,
    Identicon,
    CrossIcon,
} from '@nimiq/vue-components';
import { SwapAsset } from '@nimiq/fastspot-api';
import { SettlementStatus } from '@nimiq/oasis-api';
import { RefundSwapRequest, SignedPolygonTransaction } from '@nimiq/hub-api';
import type { BigNumber } from 'ethers';
import { RelayRequest } from '@opengsn/common/dist/EIP712/RelayRequest';
import { ForwardRequest } from '@opengsn/common/dist/EIP712/ForwardRequest';
import { explorerTxLink } from '@/lib/ExplorerUtils';
import { twoDigit } from '@/lib/NumberFormatting';
import { CryptoCurrency, FIAT_PRICE_UNAVAILABLE } from '@/lib/Constants';
import { useAccountStore } from '@/stores/Account';
import { useUsdtTransactionsStore, TransactionState } from '@/stores/UsdtTransactions';
import { useUsdtContactsStore } from '@/stores/UsdtContacts';
import { usePolygonNetworkStore } from '@/stores/PolygonNetwork';
import { useRouter, RouteName } from '@/router';
import { useI18n } from '@/lib/useI18n';
import { nextTick } from '@/lib/nextTick';
import Amount from '../Amount.vue';
import BlueLink from '../BlueLink.vue';
import Modal from './Modal.vue';
import UsdcAddressInfo from '../UsdcAddressInfo.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SwapMediumIcon from '../icons/SwapMediumIcon.vue';
import BankIcon from '../icons/BankIcon.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import GroundedArrowUpIcon from '../icons/GroundedArrowUpIcon.vue';
import GroundedArrowDownIcon from '../icons/GroundedArrowDownIcon.vue';
import Avatar from '../Avatar.vue';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import TransactionDetailOasisPayoutStatus from '../TransactionDetailOasisPayoutStatus.vue';
import { SwapErc20Data } from '../../stores/Swaps';
import { useTransactionsStore, Transaction as NimTransaction } from '../../stores/Transactions';
import { useBtcTransactionsStore, Transaction as BtcTransaction } from '../../stores/BtcTransactions';
import { isProxyData, ProxyType } from '../../lib/ProxyDetection';
import { useAddressStore } from '../../stores/Address';
import {
    calculateFee,
    getUsdtBridgedHtlcContract,
    getPolygonBlockNumber,
    sendTransaction,
} from '../../ethers';
import { useConfig } from '../../composables/useConfig';
import { useUsdtTransactionInfo } from '../../composables/useUsdtTransactionInfo';
import { POLYGON_BLOCKS_PER_MINUTE } from '../../lib/usdc/OpenGSN';
import { assetToCurrency } from '../../lib/swap/utils/Assets';

import { refundSwap } from '../../hub';

export default defineComponent({
    name: 'usdt-transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const constants = { FIAT_PRICE_UNAVAILABLE };
        const router = useRouter();
        const { $t } = useI18n();

        const transaction = computed(() => useUsdtTransactionsStore().state.transactions[props.hash]);

        const {
            txValue,
            isIncoming,
            isCancelledSwap,
            peerLabel,
            swapData,
            swapInfo,
            fiat,
        } = useUsdtTransactionInfo(transaction);

        const { config } = useConfig();

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

            if (swapData.value.asset === SwapAsset.BTC) {
                const btcTx = useBtcTransactionsStore().state.transactions[swapData.value.transactionHash];
                if (!btcTx) return null;
                return {
                    ...btcTx,
                    outputs: [btcTx.outputs[swapData.value.outputIndex]],
                } as BtcTransaction;
            }

            return null;
        });

        const usesNimSwapProxy = computed(() => {
            if (!swapTransaction.value || !('validityStartHeight' in swapTransaction.value)) return false;
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
                return isIncoming.value ? $t('HTLC Refund') : $t('HTLC Creation');
            }

            return '';
        });

        // Peer
        const { getLabel, setContact } = useUsdtContactsStore();

        const peerAddress = computed(() => {
            if (swapData.value) {
                if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                    const swapTx = swapTransaction.value as NimTransaction;
                    if (usesNimSwapProxy.value && !swapTx.relatedTransactionHash) {
                        // Avoid displaying proxy address identicon until we know related address.
                        return '';
                    }
                    return isIncoming.value ? swapTx.sender : swapTx.recipient;
                }

                if (swapData.value.asset === SwapAsset.BTC) {
                    const swapTx = swapTransaction.value as BtcTransaction | null;
                    return swapTx
                        ? isIncoming.value
                            ? swapTx.inputs[0].address!
                            : swapTx.outputs[0].address!
                        : ''; // we don't know the peer address
                }

                if (swapData.value.asset === SwapAsset.EUR) {
                    return swapData.value.iban || '';
                }
            }

            return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
        });

        const peerIsContact = computed(() => !!peerAddress.value && !!getLabel.value(peerAddress.value));

        // Date
        const date = computed(() => transaction.value.timestamp && new Date(transaction.value.timestamp * 1000));
        const datum = computed(() => date.value && date.value.toLocaleDateString());
        const time = computed(() => date.value
            && `${twoDigit(date.value.getHours())}:${twoDigit(date.value.getMinutes())}`);

        // Top left tooltip
        const { outdatedHeight: outdatedBlockHeight } = usePolygonNetworkStore();
        getPolygonBlockNumber(); // Trigger blockHeight update

        const confirmations = computed(() =>
            transaction.value.blockHeight ? outdatedBlockHeight.value - transaction.value.blockHeight + 1 : 0);
        const blockExplorerLink = computed(() =>
            explorerTxLink(CryptoCurrency.USDT, transaction.value.transactionHash));

        const showRefundButton = computed(() => !isIncoming.value
            // funded but not redeemed htlc which is now expired
            && (swapInfo.value?.in?.asset === SwapAsset.USDT_MATIC)
            && (swapInfo.value.in.htlc?.timeoutTimestamp || Number.POSITIVE_INFINITY) <= Date.now() / 1e3
            && !swapInfo.value.out,
            // // Only display the refund button for Ledger accounts as the Keyguard signs automatic refund transaction.
            // && useAccountStore().activeAccountInfo.value?.type === AccountType.LEDGER,
        );

        async function refundHtlc() {
            const htlcDetails = (swapInfo.value?.in as SwapErc20Data | undefined)?.htlc;
            if (!htlcDetails) {
                alert('Unexpected: unknown HTLC refund details'); // eslint-disable-line no-alert
                return;
            }

            let relayUrl: string;

            // eslint-disable-next-line no-async-promise-executor
            const requestPromise = new Promise<Omit<RefundSwapRequest, 'appName'>>(async (resolve, reject) => {
                try {
                    const myAddress = transaction.value.sender;

                    const method = 'refund';

                    const htlcContract = await getUsdtBridgedHtlcContract();

                    const [
                        forwarderNonce,
                        { fee, gasPrice, gasLimit, relay },
                    ] = await Promise.all([
                        htlcContract.getNonce(myAddress) as Promise<BigNumber>,
                        calculateFee(
                            transaction.value.token || config.polygon.usdt_bridged.tokenContract,
                            method,
                            undefined,
                            htlcContract,
                        ),
                    ]);

                    relayUrl = relay.url;

                    const functionData = htlcContract.interface.encodeFunctionData(method, [
                        /** bytes32 id */ htlcDetails.address,
                        /** address target */ myAddress,
                        /** uint256 fee */ fee,
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: myAddress,
                            to: htlcContract.address,
                            data: functionData,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (await getPolygonBlockNumber() + 2 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10),
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: htlcContract.address,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: htlcContract.address,
                        },
                    };

                    const request: Omit<RefundSwapRequest, 'appName'> = {
                        accountId: useAccountStore().activeAccountId.value!,
                        refund: {
                            type: SwapAsset.USDT_MATIC,
                            ...relayRequest,
                            amount: transaction.value.value - fee.toNumber(),
                            token: config.polygon.usdt_bridged.tokenContract,
                        },
                    };

                    resolve(request);
                } catch (e) {
                    reject(e);
                }
            });

            try {
                const tx = await refundSwap(requestPromise);
                if (!tx) return;
                const { relayData, ...relayRequest } = (tx as SignedPolygonTransaction).message;
                const plainTx = await sendTransaction(
                    config.polygon.usdt_bridged.tokenContract,
                    { request: relayRequest as ForwardRequest, relayData },
                    (tx as SignedPolygonTransaction).signature,
                    relayUrl!,
                );
                await nextTick();
                router.replace({
                    name: RouteName.UsdtTransaction,
                    params: { transactionHash: plainTx.transactionHash },
                });
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                alert($t('Refund failed: ') + errorMessage); // eslint-disable-line no-alert
            }
        }

        const ticker = CryptoCurrency.USDT;

        return {
            isIncoming,
            blockExplorerLink,
            confirmations,
            datum,
            txValue,
            fiat,
            peerAddress,
            peerLabel,
            peerIsContact,
            getLabel,
            setContact,
            time,
            transaction,
            TransactionState,
            SwapAsset,
            swapInfo,
            swapData,
            isCancelledSwap,
            swapTransaction,
            usesNimSwapProxy,
            data,
            SettlementStatus,
            constants,
            showRefundButton,
            refundHtlc,
            ticker,
            assetToCurrency,
            RouteName,
        };
    },
    components: {
        Amount,
        ArrowRightIcon,
        BlueLink,
        FiatAmount,
        InfoCircleSmallIcon,
        Modal,
        PageBody,
        PageHeader,
        Tooltip,
        UsdcAddressInfo,
        FiatConvertedAmount,
        SwapMediumIcon,
        Identicon,
        BankIcon,
        BitcoinIcon,
        GroundedArrowUpIcon,
        GroundedArrowDownIcon,
        Avatar,
        InteractiveShortAddress,
        TransactionDetailOasisPayoutStatus,
        CrossIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

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
    overflow-y: initial;

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

    .usdc-address-info {
        width: 19rem;
    }

    .arrow {
        font-size: 3rem;
        margin-top: 2.5rem;
        opacity: 0.4;
        flex-shrink: 0;
    }

    .swap-peer {
        align-items: center;
        width: 19rem;

        .identicon-container {
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

            svg,
            .avatar {
                width: 8rem;
                height: 8rem;
                display: block;
            }

            svg.bitcoin {
                color: var(--bitcoin-orange);
            }
        }

        .label {
            font-size: var(--body-size);
            font-weight: 600;
            text-align: center;
            margin: 2rem 0 1rem;
            white-space: nowrap;
            overflow: hidden;
            width: 100%;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }
    }
}

.amount-block {
    align-items: center;
    margin: 4rem 0 2rem;

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

    .message {
        margin: 4rem 0 1rem;
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

    ::v-deep .trigger {
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

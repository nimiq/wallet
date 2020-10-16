<template>
    <Modal class="transaction-modal" :class="{'value-masked': amountsHidden}">
        <PageHeader :class="{'inline-header': !peerLabel}">

            <i18n v-if="swapTransaction && isIncoming" path="Swap from {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddresses[0].substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else-if="swapTransaction" path="Swap to {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddresses[0].substring(0, 9)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else-if="isIncoming" path="Transaction from {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddresses[0].substring(0, 6)
                    }}</label>
                </template>
            </i18n>

            <i18n v-else path="Transaction to {address}" :tag="false">
                <template v-slot:address>
                    <label><i>&nbsp;</i>{{
                        peerLabel || peerAddresses[0].substring(0, 6)
                    }}</label>
                </template>
            </i18n>

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
                    <div v-if="swapTransaction" class="identicon-container">
                        <Identicon :address="peerAddresses[0]"/>
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
                    <Tooltip preferredPosition="bottom right" class="left-aligned"
                        v-for="address in peerAddresses.slice(0, 3)" :key="address"
                    >
                        <ShortAddress :address="address" slot="trigger"/>
                        {{ address }}
                    </Tooltip>

                    <a v-if="peerAddresses.length > 3" :href="blockExplorerLink" target="_blank" class="nq-link">
                        {{ $t('+{n} more', {n: peerAddresses.length - 3}) }}
                    </a>
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

                    <a v-if="ownAddresses.length > 3" :href="blockExplorerLink" target="_blank" class="nq-link">
                        {{ $t('+{n} more', {n: ownAddresses.length - 3}) }}
                    </a>
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
                    <a v-if="ownAddresses.length > 3" :href="blockExplorerLink" target="_blank" class="nq-link">
                        {{ $t('+{n} more', {n: ownAddresses.length - 3}) }}
                    </a>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <div v-if="swapTransaction" class="identicon-container">
                        <Identicon :address="peerAddresses[0]"/>
                        <SwapMediumIcon/>
                    </div>
                    <Avatar v-else :label="peerLabel || ''"/>
                    <input type="text" class="nq-input-s vanishing"
                        v-if="recipientLabelAddress || !peerLabel"
                        :placeholder="$t('Unknown')"
                        :value="peerLabel || ''"
                        @input="setRecipientLabel(recipientLabelAddress || peerAddresses[0], $event.target.value)"
                    />
                    <span v-else class="label" :class="{'unlabelled': !peerLabel}">
                        {{ peerLabel || $t('Unknown') }}
                    </span>
                    <Tooltip preferredPosition="bottom left" class="right-aligned"
                        v-for="address in peerAddresses.slice(0, 3)" :key="address"
                    >
                        <ShortAddress :address="address" slot="trigger"/>
                        {{ address }}
                    </Tooltip>
                    <a v-if="peerAddresses.length > 3" :href="blockExplorerLink" target="_blank" class="nq-link">
                        {{ $t('+{n} more', {n: peerAddresses.length - 3}) }}
                    </a>
                </div>
            </div>

            <div class="amount-block flex-column">
                <Amount :amount="isIncoming ? amountReceived : amountSent" :class="{
                    isIncoming,
                    'nq-light-blue': state === TransactionState.NEW || state === TransactionState.PENDING,
                    'nq-green': (state === TransactionState.MINED || state === TransactionState.CONFIRMED)
                        && isIncoming,
                }" currency="btc" value-mask/>
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
                            <FiatConvertedAmount slot="trigger"
                                :amount="isIncoming ? amountReceived : amountSent" currency="btc" value-mask/>
                            {{ $t('Current value') }}
                        </Tooltip> -->
                    </div>
                </transition>
            </div>

            <!-- <button class="nq-button-s">Send more</button> -->
            <div v-if="swapTransaction" class="swap-transaction flex-row">
                <div class="icon" :class="{'incoming': !isIncoming}">
                    <GroundedArrowUpIcon v-if="isIncoming"/>
                    <GroundedArrowDownIcon v-else/>
                </div>
                <div class="values">
                    <Amount :amount="swapTransaction.value" currency="nim" value-mask/>

                    <div class="flex-row">
                        <FiatConvertedAmount v-if="swapTransaction.state === TransactionState.PENDING"
                            :amount="swapTransaction.value" currency="nim" value-mask/>
                        <div v-else-if="!swapTransaction.fiatValue || swapTransaction.fiatValue[fiatCurrency] === undefined"
                            class="fiat-amount">&nbsp;</div>
                        <div v-else-if="swapTransaction.fiatValue[fiatCurrency] === constants.FIAT_PRICE_UNAVAILABLE"
                            class="fiat-amount">Fiat value unavailable</div>
                        <FiatAmount v-else
                            :amount="swapTransaction.fiatValue[fiatCurrency]" :currency="fiatCurrency" value-mask/>
                        <SwapFeesTooltip v-if="swapInfo.fees" v-bind="swapInfo.fees" preferredPosition="top right"/>
                    </div>
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
                <!-- <span v-if="transaction.fee" class="fee"><Amount :amount="transaction.fee"/> fee</span> -->

                <BlueLink
                    :href="blockExplorerLink"
                    target="_blank"
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
import Config from 'config';
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
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { useAccountStore } from '../../stores/Account';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { twoDigit } from '../../lib/NumberFormatting';
import { FIAT_PRICE_UNAVAILABLE, ENV_MAIN } from '../../lib/Constants';
import { useSwapsStore } from '../../stores/Swaps';
import { useTransactionsStore } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { SwapAsset } from '../../lib/FastSpotApi';

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
        const transaction = computed(() => useBtcTransactionsStore().state.transactions[props.hash]);

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

        const swapInfo = computed(() => {
            if (!transaction.value.swapHash) return null;
            return useSwapsStore().state.swaps[transaction.value.swapHash] || null;
        });

        const swapTransaction = computed(() => {
            if (!swapInfo.value) return null;

            const swapData = isIncoming.value ? swapInfo.value.in : swapInfo.value.out;
            if (!swapData) return null;

            if (swapData.asset === SwapAsset.NIM) {
                return useTransactionsStore().state.transactions[swapData.transactionHash] || null;
            }

            return null;
        });

        // Peer
        const peerAddresses = computed(() => {
            if (swapTransaction.value) {
                return isIncoming.value ? [swapTransaction.value.sender] : [swapTransaction.value.recipient];
            }
            return (isIncoming.value
                ? transaction.value.inputs.map((input) => input.address || input.script)
                : outputsSent.value.map((output) => output.address || output.script)
            ).filter((address, index, array) => array.indexOf(address) === index); // dedupe
        });
        const peerLabel = computed(() => {
            if (swapTransaction.value) {
                return useAddressStore().state.addressInfos[peerAddresses.value[0]].label;
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

        const { state: network$ } = useBtcNetworkStore();
        const confirmations = computed(() =>
            transaction.value.blockHeight ? network$.height - transaction.value.blockHeight + 1 : 0);

        const { amountsHidden } = useSettingsStore();

        const blockExplorerLink = computed(() =>
            `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}`
            + `/tx/${transaction.value.transactionHash}`);

        return {
            transaction,
            constants,
            state,
            TransactionState,
            datum,
            time,
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
            swapTransaction,
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
        Identicon,
        SwapMediumIcon,
        SwapFeesTooltip,
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
.address-info > svg {
    position: relative;
    width: 8rem;
    height: 8rem;
    font-size: 3.75rem;
}

.address-info > svg {
    color: #F7931A; // Bitcoin orange
}

.address-info .identicon-container {
    position: relative;

    > svg {
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

.amount-block {
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

    // .fee {
    //     display: inline-block;
    //     margin-top: 1.25rem;
    // }

    .blue-link {
        color: var(--nimiq-light-blue-on-dark);
        margin-top: 1.25rem;
    }
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

    .values .flex-row {
        align-items: center;

        .tooltip /deep/ .trigger {
            font-size: var(--small-size);
            display: block;
            margin-left: 0.5rem;
            color: var(--text-50);

            &::after {
                background: #201F45;
            }
        }
    }

    .amount,
    .fiat-amount {
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

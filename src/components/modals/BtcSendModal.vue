<template>
    <Modal :showOverlay="statusScreenOpened">
        <div class="page flex-column" @click="amountMenuOpened = false">
            <PageHeader>{{ $t('Send Transaction') }}</PageHeader>
            <PageBody class="flex-column">
                <DoubleInput :extended="!!recipientWithLabel">
                    <template #second v-if="recipientWithLabel">
                        <BtcLabelInput
                            v-model="recipientWithLabel.label"
                            :placeholder="$t('Name this recipient...')"
                            :disabled="recipientWithLabel.type === RecipientType.KNOWN_CONTACT"/>
                    </template>

                    <template #main>
                        <BtcAddressInput
                            :placeholder="$t('Enter recipient address...')"
                            v-model="addressInputValue"
                            @paste="(event, text) => parseRequestUri(text, event)"
                            @input="resetAddress"
                            @address="onAddressEntered"
                            @scan="goToScanner"/>
                    </template>

                    <template #message
                        v-if="recipientWithLabel && recipientWithLabel.type === RecipientType.KNOWN_CONTACT">
                        <span class="nq-orange reused-address flex-row">
                            <AlertTriangleIcon/>
                            {{ $t('This address has already been used') }}
                            <Tooltip preferredPosition="bottom left" :styles="{width: '205px', 'text-align': 'left'}">
                                <InfoCircleSmallIcon slot="trigger"/>
                                <span class="header">
                                    {{ $t('Use a new Bitcoin address for every transaction to improve privacy.') }}
                                </span>
                                <p>
                                    {{ $t('Although reusing addresses won’t result in a loss of funds, '
                                        + 'it is highly recommended not to do so.') }}
                                </p>
                            </Tooltip>
                        </span>
                    </template>
                </DoubleInput>

                <div class="flex-grow"></div>

                <section class="amount-section" :class="{'insufficient-balance': maxSendableAmount < amount}">
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== 'btc'}">
                        <AmountInput v-if="activeCurrency === 'btc'"
                            v-model="amount" :decimals="btcUnit.decimals" ref="amountInputRef"
                        >
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                currency="btc"
                                :activeCurrency="btcUnit.ticker.toLowerCase()"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                :feeOption="false"
                                @send-max="sendMax"
                                @currency="(currency) => activeCurrency = currency"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                        <AmountInput v-else v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals">
                            <span slot="prefix" class="tilde">~</span>
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                currency="btc"
                                :activeCurrency="activeCurrency"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                :feeOption="false"
                                @send-max="sendMax"
                                @currency="(currency) => activeCurrency = currency"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                    </div>

                    <span v-if="maxSendableAmount >= amount" class="secondary-amount" key="fiat+fee">
                        <span v-if="activeCurrency === 'btc'" key="fiat-amount">
                            {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="amount" currency="btc"/>
                        </span>
                        <span v-else key="btc-amount">
                            {{ $t(
                                'You will send {amount}',
                                { amount: `${amount / btcUnit.unitToCoins} ${btcUnit.ticker}` },
                            ) }}
                        </span>
                    </span>
                    <span v-else class="insufficient-balance-warning nq-orange" key="insufficient">
                        {{ $t('Insufficient balance.') }}
                        <a class="send-all" @click="sendMax">
                            {{ $t('Send all') }}
                        </a>
                    </span>
                </section>

                <div class="flex-grow"></div>

                <section class="fee-section flex-row">
                    <FeeSelector :fees="feeOptions" @fee="updateFee"/>
                    <span class="secondary-amount">~<FiatConvertedAmount :amount="fee" currency="btc"/></span>
                    <Tooltip preferredPosition="top left" :styles="{width: '222px'}">
                        <InfoCircleSmallIcon slot="trigger"/>
                        <span class="header">
                            {{ $t('Network fee: {sats} sat/vByte', { sats: feePerByte }) }}
                        </span>
                        <p>
                            {{ $t('Increase the speed of your transaction by paying a higher network fee. '
                                + 'The fees go directly to the miners.') }}
                        </p>
                        <p>
                            {{ $t('Duration and fees are estimates.') }}
                        </p>
                    </Tooltip>
                </section>

                <button
                    class="nq-button light-blue send-button"
                    :disabled="!canSend"
                    @click="sign"
                    @mousedown.prevent
                >{{ $t('Send Transaction') }}</button>

                <Tooltip class="info-tooltip" preferredPosition="bottom right">
                    <InfoCircleSmallIcon slot="trigger"/>
                    <p>{{ $t('Bitcoin addresses are used only once, so there are no contacts. '
                        + 'Use labels instead to find transactions in your history easily.') }}</p>
                    <p>{{ $t('Nimiq wallet does not support transaction messages for Bitcoin.') }}</p>
                    <p>{{ $t('Transactions take >10 min. due to Bitcoin’s block time.') }}</p>
                </Tooltip>
            </PageBody>
        </div>

        <div v-if="statusScreenOpened" slot="overlay" class="page">
            <StatusScreen
                :title="statusTitle"
                :state="statusState"
                :message="statusMessage"
                :mainAction="statusMainActionText"
                :alternativeAction="statusAlternativeActionText"
                @main-action="onStatusMainAction"
                @alternative-action="onStatusAlternativeAction"
                :lightBlue="true"
            />
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, Ref, onMounted, onBeforeUnmount } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    AlertTriangleIcon,
    ScanQrCodeIcon,
    LabelInput,
    Tooltip,
    InfoCircleSmallIcon,
} from '@nimiq/vue-components';
import { /* parseRequestLink, */ CurrencyInfo } from '@nimiq/utils';
import Modal from './Modal.vue';
import BtcAddressInput from '../BtcAddressInput.vue';
import BtcLabelInput from '../BtcLabelInput.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import FeeSelector from '../FeeSelector.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useAccountStore } from '../../stores/Account';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { FiatCurrency, FIAT_CURRENCY_DENYLIST } from '../../lib/Constants';
import { sendBtcTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import { selectOutputs, estimateFees, parseBitcoinUrl } from '../../lib/BitcoinTransactionUtils';
import { getElectrumClient } from '../../electrum';
import DoubleInput from '../DoubleInput.vue';

export enum RecipientType {
    NEW_CONTACT,
    KNOWN_CONTACT,
    GLOBAL_ADDRESS,
}

export default defineComponent({
    name: 'btc-send-modal',
    props: {
        requestUri: {
            type: String,
            required: false,
        },
    },
    setup(props, context) {
        const {
            state: addresses$,
            accountUtxos,
            accountBalance,
        } = useBtcAddressStore();
        const {
            setRecipientLabel,
            getRecipientLabel,
        } = useBtcLabelsStore();
        const { state: network$, isFetchingTxHistory } = useBtcNetworkStore();

        const recipientWithLabel = ref<{address: string, label: string, type: RecipientType} | null>(null);

        function saveRecipientLabel() {
            if (recipientWithLabel.value === null) return;
            if (recipientWithLabel.value.type !== RecipientType.NEW_CONTACT) return;
            setRecipientLabel(recipientWithLabel.value.address, recipientWithLabel.value.label);
        }

        function resetAddress() {
            recipientWithLabel.value = null;
        }

        function onAddressEntered(address: string) {
            // Find label across recipient labels, own addresses
            let label = '';
            let type = RecipientType.NEW_CONTACT; // Can be stored as a new contact by default
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[address];
            if (ownedAddressInfo) {
                // Find account label
                const { accountInfos } = useAccountStore();
                label = Object.values(accountInfos.value)
                    .find((accountInfo) => accountInfo.btcAddresses.external.includes(address))?.label
                    || Object.values(accountInfos.value)
                        .find((accountInfo) => accountInfo.btcAddresses.internal.includes(address))!.label;
                type = RecipientType.NEW_CONTACT; // Allow overwriting suggested account label
            }
            // Search recipient labels
            if (getRecipientLabel.value(address)) {
                label = getRecipientLabel.value(address)!;
                type = RecipientType.KNOWN_CONTACT; // Show warning and disable input
            }
            // // Search global address book
            // const globalLabel = AddressBook.getLabel(address);
            // if (globalLabel) {
            //     label = globalLabel;
            //     type = RecipientType.GLOBAL_ADDRESS;
            // }

            recipientWithLabel.value = { address, label, type };
        }

        const amount = ref(0);
        const feePerByte = ref(1);

        const requiredInputs = computed(() => selectOutputs(accountUtxos.value, amount.value, feePerByte.value));

        const fee = computed(() => estimateFees(
            requiredInputs.value.utxos.length || 1,
            requiredInputs.value.changeAmount > 0 ? 2 : 1,
            feePerByte.value,
        ));

        const feeForSendingAll = computed(() => estimateFees(accountUtxos.value.length, 1, feePerByte.value));

        const maxSendableAmount = computed(() => Math.max((accountBalance.value || 0) - feeForSendingAll.value, 0));

        const amountMenuOpened = ref(false);

        const feeOptions = ref([] as number[]);

        let isFetchingFeeEstimates = false;
        async function fetchFeeEstimates() {
            if (isFetchingFeeEstimates) return;
            isFetchingFeeEstimates = true;

            const client = await getElectrumClient();
            await client.waitForConsensusEstablished();

            // 25 blocks is the maximum that some ElectrumX servers estimate for
            const fees = await client.estimateFees([25, 12, 1]);
            console.debug('Fee Estimates:', fees); // eslint-disable-line no-console

            const feesByTarget: number[] = [];
            feesByTarget[1] = fees[1] || 3;
            feesByTarget[12] = fees[12] || 2;
            feesByTarget[25] = fees[25] || 1;

            feeOptions.value = feesByTarget;
            isFetchingFeeEstimates = false;
        }
        fetchFeeEstimates();

        const feeEstimatesInterval = setInterval(fetchFeeEstimates, 60 * 1000); // Update every 60 seconds
        let sucessCloseTimeout = 0;

        onBeforeUnmount(() => {
            clearInterval(feeEstimatesInterval);
            window.clearTimeout(sucessCloseTimeout);
        });

        const activeCurrency = ref('btc');
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency
                && !FIAT_CURRENCY_DENYLIST.includes(fiat.toUpperCase())));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === 'btc') {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToBtcDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals / 1e8);

        watch(activeCurrency, (currency) => {
            if (currency === 'btc') {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.btc[currency]! * fiatToBtcDecimalRatio.value;
        });

        watch(() => {
            if (activeCurrency.value === 'btc') return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.btc[activeCurrency.value]!
                / fiatToBtcDecimalRatio.value);
        });

        async function sendMax() {
            if (activeCurrency.value !== 'btc') {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.btc[activeCurrency.value]!
                    * fiatToBtcDecimalRatio.value;
            }
            // Need to wait here for the next processing tick, as otherwise we would have a
            // race condition between the amount assignment and the fiatAmount watcher.
            await context.root.$nextTick();
            amount.value = maxSendableAmount.value;
        }

        function updateFee(newFeePerByte: number) {
            const isSendingMax = amount.value === maxSendableAmount.value;
            feePerByte.value = newFeePerByte;
            if (isSendingMax) sendMax();
        }

        const hasHeight = computed(() => !!network$.height);

        const canSend = computed(() =>
            recipientWithLabel.value
            && recipientWithLabel.value.address
            && hasHeight.value
            && !isFetchingTxHistory.value
            && amount.value
            && amount.value <= maxSendableAmount.value,
        );

        const addressInputValue = ref(''); // Used for setting the address from a request URI

        async function parseRequestUri(uri: string, event?: ClipboardEvent) {
            try {
                const parsedRequestLink = parseBitcoinUrl(uri);
                if (event) {
                    event.stopPropagation(); // Prevent pasting
                }

                if (parsedRequestLink.amount) {
                    amount.value = parsedRequestLink.amount;
                }

                if (parsedRequestLink.recipient) {
                    addressInputValue.value = parsedRequestLink.recipient;
                    // Wait for onAddressEntered to trigger
                    let i = 0;
                    while (!recipientWithLabel.value && i < 10) {
                        await context.root.$nextTick(); // eslint-disable-line no-await-in-loop
                        i += 1;
                    }
                    if (!recipientWithLabel.value!.label && parsedRequestLink.label) {
                        recipientWithLabel.value!.label = parsedRequestLink.label;
                    }
                }
            } catch (err) {
                // Ignore
            }
        }

        if (props.requestUri) {
            parseRequestUri(props.requestUri);
        }

        /**
         * Autofocus
         */

        // FIXME: This should optimally be automatic with Typescript
        interface BtcAddressInput {
            focus(): void;
        }
        interface AmountInput {
            focus(): void;
        }

        const addressInputRef = ref<BtcAddressInput>(null);
        const amountInputRef = ref<AmountInput>(null);

        const { width } = useWindowSize();

        async function focus(elementRef: Ref<LabelInput | AmountInput | null>) {
            // TODO: Detect onscreen keyboards instead?
            if (width.value <= 700) return; // Full mobile breakpoint

            await context.root.$nextTick();
            if (!elementRef.value) return;
            elementRef.value.focus();
        }

        onMounted(() => {
            focus(addressInputRef);
        });

        /**
         * Status Screen
         */
        const statusScreenOpened = ref(false);
        const statusTitle = ref(context.root.$t('Sending Transaction'));
        const statusState = ref(State.LOADING);
        const statusMessage = ref('');
        const statusMainActionText = ref(context.root.$t('Retry'));
        const statusAlternativeActionText = ref(context.root.$t('Edit transaction'));

        async function sign() {
            // Show loading screen
            statusScreenOpened.value = true;
            statusState.value = State.LOADING;

            let changeAddress: string;
            if (requiredInputs.value.changeAmount > 0) {
                const { nextChangeAddress } = useBtcAddressStore();
                if (!nextChangeAddress.value) {
                    // FIXME: If no unused change address is found, need to request new ones from Hub!
                    throw new Error('No more unused change addresses)');
                }
                changeAddress = nextChangeAddress.value;
            }

            try {
                const plainTx = await sendBtcTransaction({
                    accountId: useAccountStore().state.activeAccountId!,
                    inputs: requiredInputs.value.utxos.map((utxo) => ({
                        address: utxo.address,
                        transactionHash: utxo.transactionHash,
                        outputIndex: utxo.index,
                        outputScript: utxo.witness.script,
                        value: utxo.witness.value,
                    })),
                    output: {
                        address: recipientWithLabel.value!.address,
                        label: recipientWithLabel.value!.label,
                        value: amount.value,
                    },
                    ...(requiredInputs.value.changeAmount > 0 ? {
                        changeOutput: {
                            address: changeAddress!,
                            value: requiredInputs.value.changeAmount,
                        },
                    } : {}),
                });

                if (!plainTx) {
                    statusScreenOpened.value = false;
                    return;
                }

                saveRecipientLabel();

                // Show success screen
                statusState.value = State.SUCCESS;
                statusTitle.value = recipientWithLabel.value!.label
                    ? context.root.$t('Sent {btc} BTC to {name}', {
                        btc: amount.value / 1e8,
                        name: recipientWithLabel.value!.label,
                    })
                    : context.root.$t('Sent {btc} BTC', {
                        btc: amount.value / 1e8,
                    });

                // Close modal
                sucessCloseTimeout = window.setTimeout(async () => {
                    if (window.history.state.cameFromSend) {
                        // This is required when going to the QR scanner from within /btc-send, as a sucessful
                        // scan _replaces_ the /scan route with the result, meaning the original /btc-send is
                        // the previous history entry.
                        context.root.$router.go(-2);
                    } else {
                        context.root.$router.back();
                    }
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error) {
                // console.debug(error);

                // Show error screen
                statusState.value = State.WARNING;
                statusTitle.value = context.root.$t('Something went wrong');
                statusMessage.value = error.message;
            }
        }

        function onStatusMainAction() {
            sign();
        }

        function onStatusAlternativeAction() {
            statusScreenOpened.value = false;
        }

        const { btcUnit } = useSettingsStore();

        function goToScanner() {
            context.root.$router.push('/scan', () => {
                // Set a flag that we need to go back 2 history entries on success
                window.history.state.cameFromSend = true;
            });
        }

        return {
            // General
            RecipientType,

            // Recipient Input
            addressInputValue,
            resetAddress,
            onAddressEntered,
            recipientWithLabel,
            parseRequestUri,
            goToScanner,

            // Amount Input
            amount,
            feePerByte,
            fee,
            maxSendableAmount,
            amountMenuOpened,
            feeOptions,
            activeCurrency,
            btcUnit,
            fiatAmount,
            fiatCurrencyInfo,
            sendMax,
            updateFee,
            fiatCurrency: fiat$.currency,
            otherFiatCurrencies,
            canSend,
            sign,
            // onboard,

            // DOM refs for autofocus
            addressInputRef,
            amountInputRef,

            // Status Screen
            statusScreenOpened,
            statusTitle,
            statusState,
            statusMessage,
            statusMainActionText,
            statusAlternativeActionText,
            onStatusMainAction,
            onStatusAlternativeAction,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        BtcAddressInput,
        BtcLabelInput,
        AlertTriangleIcon,
        ScanQrCodeIcon,
        LabelInput,
        AmountInput,
        AmountMenu,
        FeeSelector,
        FiatConvertedAmount,
        Tooltip,
        InfoCircleSmallIcon,
        StatusScreen,
        DoubleInput,
    },
});
</script>

<style lang="scss" scoped>
    .page {
        flex-grow: 1;
        font-size: var(--body-size);
        height: 100%;

        .nq-button {
            margin: 0 1rem;
            flex-shrink: 0;
        }
    }

    .page-body {
        --short-transition-duration: 300ms;

        justify-content: space-between;
        flex-grow: 1;
        overflow: inherit;
    }

    .reused-address {
        align-items: center;
        font-weight: 600;
        margin-top: -2.5rem; // TODO: check others

        > .nq-icon {
            margin-right: 0.5rem;
        }

        .tooltip {
            margin-left: 0.5rem;
            font-size: var(--small-size);
        }
    }

    .scan-qr-button {
        position: absolute;
        right: 3rem;
        bottom: 3rem;
        font-size: 4rem;
        opacity: 0.4;

        transition: opacity var(--attr-duration) var(--nimiq-ease);

        &:hover,
        &:focus {
            opacity: 0.6;
        }
    }

    .amount-section {
        text-align: center;
        align-self: stretch;
        margin: 4rem 0;

        .amount-row {
            align-self: stretch;
            justify-content: center;
            align-items: flex-end;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;
        }

        .tilde {
            font-size: 8rem;
            font-weight: bold;
            line-height: 10rem;
            margin-right: 0.75rem;
        }

        .amount-input {
            width: auto;
            max-width: 100%;
            min-height: 5rem;
            z-index: 5;

            .ticker {
                &:hover,
                &:focus-within {
                    color: var(--nimiq-light-blue);
                }
            }
        }

        .amount-menu /deep/ .button {
            margin-left: 1rem;
            margin-bottom: 1rem;
        }

        .amount-menu /deep/ .menu {
            position: absolute;
            right: 3rem;
            bottom: 3rem;
            z-index: 1;
            max-height: calc(100% - 6rem);
        }

        .insufficient-balance-warning {
            font-weight: 600;

            .send-all {
                text-decoration: underline;
                cursor: pointer;
            }
        }

        &.insufficient-balance {
            .amount-input /deep/,
            .amount-input /deep/ .ticker {
                color: var(--nimiq-orange);
            }

            .amount-input /deep/ .nq-input {
                color: var(--nimiq-orange);
                --border-color: rgba(252, 135, 2, 0.3); // Based on Nimiq Orange
            }
        }
    }

    .secondary-amount {
        font-weight: 600;
        opacity: 0.5;

        .fiat-amount,
        .amount {
            margin-left: -0.2em;
        }
    }

    .fee-section {
        padding: 0 1.5rem;
        align-items: center;
        margin-bottom: 2rem;

        .fee-selector {
            flex-grow: 1;
        }

        .secondary-amount {
            margin-right: 1rem;
        }

        /deep/ .trigger .nq-icon {
            opacity: 0.4;
        }

        /deep/ .tooltip-box {
            transform: translate(4rem, -2rem);
        }
    }

    .tooltip:not(.info-tooltip) {
        .header {
            font-size: var(--small-size);
        }

        p {
            margin-top: 0.75rem;
            margin-bottom: 0;
            opacity: 0.6;
            font-size: 1.625rem;
        }
    }

    .info-tooltip {
        position: absolute;
        top: 2rem;
        left: 2rem;

        /deep/ .trigger svg {
            height: 2rem;
            opacity: .3;

            transition: opacity var(--short-transition-duration) var(--nimiq-ease);
        }

        & /deep/ .trigger:hover svg,
        & /deep/ .trigger:focus svg,
        &.shown /deep/ .trigger svg {
            opacity: .6;
        }

        /deep/ .tooltip-box {
            width: 25.875rem;
            font-size: var(--small-size);
            font-weight: 600;
            line-height: 2.5rem;
            color: white;
            transform: translate(-2rem, 2rem);

            @media (max-width: 700px) { // Full mobile breakpoint
                transform: translate(0.5rem, 2rem);
            }

            p {
                margin: 1rem auto;
            }

            p:first-child {
                margin-top: 0;
            }

            p:last-child {
                margin-bottom: 0;
            }
        }
    }

    @media (max-width: 700px) { // Full Mobile Breakpoint
        .address-section {
            .btc-address-input {
                font-size: 14px;
            }
        }

        .status-screen {
            border-top-left-radius: 1.75rem;
            border-top-right-radius: 1.75rem;
        }
    }
</style>

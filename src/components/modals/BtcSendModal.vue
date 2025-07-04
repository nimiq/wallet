<template>
    <Modal :showOverlay="statusScreenOpened" ref="modal$" @close-overlay="onCloseOverlay">
        <div class="page flex-column" @click="amountMenuOpened = false">
            <PageHeader :backArrow="!!$route.params.canUserGoBack" @back="back">
                {{ $t('Send Transaction') }}
            </PageHeader>
            <PageBody class="flex-column">
                <DoubleInput :extended="!!recipientWithLabel">
                    <template #second v-if="recipientWithLabel">
                        <BtcLabelInput
                            v-model="recipientWithLabel.label"
                            :placeholder="$t('Name this recipient...')"
                            :disabled="recipientWithLabel.type === RecipientType.KNOWN_CONTACT"
                            ref="labelInput$"/>
                    </template>

                    <template #main>
                        <BtcAddressInput
                            v-model="addressInputValue"
                            :placeholder="$t('Enter recipient address...')"
                            :disabled="gotRequestUriRecipient"
                            @paste="(event, text) => parseRequestUri(text, event)"
                            @input="resetRecipient"
                            @address="onAddressEntered"
                            @domain-address="onDomainEntered"
                            @scan="$router.push({ name: RouteName.Scan })"
                            ref="addressInput$"/>
                    </template>
                </DoubleInput>

                <div class="flex-grow"></div>

                <section class="amount-section" :class="{'insufficient-balance': maxSendableAmount < amount}">
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== CryptoCurrency.BTC}">
                        <AmountInput v-if="activeCurrency === CryptoCurrency.BTC" v-model="amount"
                            :decimals="btcUnit.decimals" :disabled="gotRequestUriAmount">
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                :currency="CryptoCurrency.BTC"
                                :activeCurrency="btcUnit.ticker.toLowerCase()"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                :feeOption="false"
                                :sendAllOption="!gotRequestUriAmount"
                                @send-max="sendMax"
                                @currency="onCurrencySelected"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                        <AmountInput v-else v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals"
                            :disabled="gotRequestUriAmount">
                            <span slot="prefix" class="tilde">~</span>
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                :currency="CryptoCurrency.BTC"
                                :activeCurrency="activeCurrency"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                :feeOption="false"
                                :sendAllOption="!gotRequestUriAmount"
                                @send-max="sendMax"
                                @currency="onCurrencySelected"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                    </div>

                    <span v-if="maxSendableAmount >= amount" class="secondary-amount" key="fiat+fee">
                        <span v-if="activeCurrency === CryptoCurrency.BTC" key="fiat-amount">
                            {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount
                                :amount="amount" :currency="CryptoCurrency.BTC"/>
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
                        <a v-if="!gotRequestUriAmount" class="send-all" @click="sendMax">
                            {{ $t('Send all') }}
                        </a>
                    </span>
                </section>

                <div class="flex-grow"></div>

                <section class="fee-section flex-row">
                    <FeeSelector :fees="feeOptions" @fee="updateFee"/>
                    <span class="secondary-amount">~<FiatConvertedAmount
                        :amount="fee" :currency="CryptoCurrency.BTC"/></span>
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

                <Tooltip class="info-tooltip" preferredPosition="bottom right">
                    <InfoCircleSmallIcon slot="trigger"/>
                    <p>{{ $t('Bitcoin addresses are used only once, so there are no contacts. '
                        + 'Use labels instead to find transactions in your history easily.') }}</p>
                    <p>{{ $t('Nimiq wallet does not support transaction messages for Bitcoin.') }}</p>
                    <p>{{ $t('Transactions take >10 min. due to Bitcoin’s block time.') }}</p>
                </Tooltip>
            </PageBody>
            <SendModalFooter
                :assets="[CryptoCurrency.BTC]"
                :disabled="!canSend"
                @click="sign"
            ><template #cta>{{ $t('Send {currency}', { currency: 'BTC' }) }}</template></SendModalFooter>
        </div>

        <div v-if="statusScreenOpened" slot="overlay" class="page">
            <StatusScreen
                :title="statusTitle"
                :state="statusState"
                :message="statusMessage"
                :mainAction="$t('Retry')"
                :alternativeAction="$t('Edit transaction')"
                @main-action="onStatusMainAction"
                @alternative-action="onStatusAlternativeAction"
                :lightBlue="true"
            />
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, Ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import {
    PageHeader,
    PageBody,
    Tooltip,
    InfoCircleSmallIcon,
} from '@nimiq/vue-components';
import { parseRequestLink, Currency, CurrencyInfo } from '@nimiq/utils';
import { useRouter, RouteName } from '@/router';
import { useI18n } from '@/lib/useI18n';
import Modal, { disableNextModalTransition } from './Modal.vue';
import BtcAddressInput from '../BtcAddressInput.vue';
import BtcLabelInput from '../BtcLabelInput.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import FeeSelector from '../FeeSelector.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SendModalFooter from '../SendModalFooter.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useAccountStore } from '../../stores/Account';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCIES_OFFERED } from '../../lib/Constants';
import { sendBtcTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import { loadBitcoinJS } from '../../lib/BitcoinJSLoader';
import { selectOutputs, estimateFees, normalizeAddress, validateAddress } from '../../lib/BitcoinTransactionUtils';
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
    setup(props) {
        const { $t } = useI18n();
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
            if (!recipientWithLabel.value || recipientWithLabel.value.type !== RecipientType.NEW_CONTACT) return;
            setRecipientLabel(recipientWithLabel.value.address, recipientWithLabel.value.label);
        }

        function resetRecipient() {
            if (gotRequestUriRecipient.value) return;
            recipientWithLabel.value = null;
        }

        function onAddressEntered(address: string) {
            if (recipientWithLabel.value && recipientWithLabel.value.address === address) return;

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

        function onDomainEntered(domain: string, address: string) {
            recipientWithLabel.value = {
                address,
                label: domain,
                type: RecipientType.NEW_CONTACT,
            };
            addressInputValue.value = address;
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
        let successCloseTimeout = 0;

        onBeforeUnmount(() => {
            clearInterval(feeEstimatesInterval);
            window.clearTimeout(successCloseTimeout);
        });

        const activeCurrency = ref<CryptoCurrency | FiatCurrency>(CryptoCurrency.BTC);
        const fiatAmount = ref(0);

        function onCurrencySelected(currency: CryptoCurrency | FiatCurrency) {
            activeCurrency.value = currency;
        }

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() => FIAT_CURRENCIES_OFFERED.filter((fiat) => fiat !== fiat$.currency));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === CryptoCurrency.BTC) {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToBtcDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals / 1e8);

        watch(activeCurrency, (currency) => {
            if (currency === CryptoCurrency.BTC) {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.btc[currency]! * fiatToBtcDecimalRatio.value;
        });

        watch([activeCurrency, fiatAmount, exchangeRates, fiatToBtcDecimalRatio], () => {
            if (activeCurrency.value === CryptoCurrency.BTC || gotRequestUriAmount.value) return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.btc[activeCurrency.value]!
                / fiatToBtcDecimalRatio.value);
        });

        async function sendMax() {
            if (gotRequestUriAmount.value) return;
            if (activeCurrency.value !== CryptoCurrency.BTC) {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.btc[activeCurrency.value]!
                    * fiatToBtcDecimalRatio.value;
            }
            // Need to wait here for the next processing tick, as otherwise we would have a
            // race condition between the amount assignment and the fiatAmount watcher.
            await nextTick();
            amount.value = maxSendableAmount.value;
        }

        function updateFee(newFeePerByte: number) {
            const isSendingMax = amount.value === maxSendableAmount.value;
            feePerByte.value = newFeePerByte;
            if (isSendingMax) sendMax();
        }

        const canSend = computed(() =>
            network$.consensus === 'established'
            && !!network$.height
            && !!recipientWithLabel.value
            && !!recipientWithLabel.value.address
            && !isFetchingTxHistory.value
            && !!amount.value
            && amount.value <= maxSendableAmount.value,
        );

        const addressInputValue = ref(''); // Used for setting the address from a request URI or unstoppable domain

        const gotRequestUriRecipient = ref(false);
        const gotRequestUriAmount = ref(false);
        async function parseRequestUri(uri: string, event?: ClipboardEvent) {
            // We don't validate addresses here yet because it requires asynchronously loading BitcoinJS, and
            // event.preventDefault() needs to be called synchronously below. Instead, the validation happens afterward.
            // The normalization does not require BitcoinJS to be loaded.
            const parsedRequestLink = parseRequestLink(uri, {
                currencies: [Currency.BTC],
                normalizeAddress: {
                    [Currency.BTC]: normalizeAddress,
                },
            });
            if (!parsedRequestLink) return;

            if (event) {
                event.stopPropagation(); // Prevent pasting
            }

            await loadBitcoinJS();
            if (!validateAddress(parsedRequestLink.recipient)) return;

            if (parsedRequestLink.amount) {
                gotRequestUriAmount.value = true;
                amount.value = parsedRequestLink.amount;
            }

            gotRequestUriRecipient.value = true;
            addressInputValue.value = parsedRequestLink.recipient;
            // Wait for BtcAddressInput to trigger onAddressEntered which sets recipientWithLabel.
            await new Promise<void>((resolve) => {
                const unwatch = watch(recipientWithLabel, () => {
                    if (recipientWithLabel.value?.address !== parsedRequestLink.recipient) return;
                    resolve();
                    unwatch();
                }, { immediate: true });
            });

            if (!recipientWithLabel.value!.label && parsedRequestLink.label) {
                recipientWithLabel.value!.label = parsedRequestLink.label;
            }
        }

        if (props.requestUri) {
            parseRequestUri(props.requestUri);
        }

        /**
         * Autofocus
         */

        const addressInput$ = ref<BtcAddressInput | null>(null);
        const labelInput$ = ref<BtcLabelInput | null>(null);

        const { isMobile } = useWindowSize();

        async function focus(element$: Ref<BtcAddressInput | BtcLabelInput | null>) {
            // TODO: Detect onscreen keyboards instead?
            if (isMobile.value) return;

            await nextTick();
            if (!element$.value) return;
            element$.value.focus();
        }

        onMounted(async () => {
            if (addressInputValue.value) {
                // If an initial address was set via request link, focus the label input instead of the address input,
                // once the request link populated and the label input showed up.
                await new Promise<void>((resolve) => {
                    const unwatch = watch(labelInput$, () => {
                        if (!labelInput$.value) return;
                        resolve();
                        unwatch();
                    }, { immediate: true });
                });
                focus(labelInput$ as Ref<BtcLabelInput>);
            } else {
                focus(addressInput$ as Ref<BtcAddressInput>);
            }
        });

        /**
         * Status Screen
         */
        const statusScreenOpened = ref(false);
        const statusState = ref<State>(State.LOADING);
        const statusTitle = ref('');
        const statusMessage = ref('');
        const modal$ = ref<Modal | null>(null);

        async function sign() {
            if (!canSend.value) return;

            // Show loading screen
            statusScreenOpened.value = true;
            statusState.value = State.LOADING;
            statusTitle.value = $t('Sending Transaction') as string;
            statusMessage.value = '';

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
                    ? $t('Sent {btc} BTC to {name}', {
                        btc: amount.value / 1e8,
                        name: recipientWithLabel.value!.label,
                    }) as string
                    : $t('Sent {btc} BTC', {
                        btc: amount.value / 1e8,
                    }) as string;

                // Close modal
                successCloseTimeout = window.setTimeout(() => {
                    if (statusState.value !== State.SUCCESS) return;
                    modal$.value!.forceClose();
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error) {
                // console.debug(error);

                // Show error screen
                statusState.value = State.WARNING;
                statusTitle.value = $t('Something went wrong') as string;
                statusMessage.value = (error as Error).message;
            }
        }

        function onStatusMainAction() {
            sign();
        }

        function onStatusAlternativeAction() {
            statusScreenOpened.value = false;
        }

        function onCloseOverlay() {
            if (statusState.value !== State.WARNING) {
                // Do nothing when the loading or success status overlays are shown as they will be auto-closed.
                return;
            }
            statusScreenOpened.value = false;
        }

        const { btcUnit } = useSettingsStore();
        const router = useRouter();

        function back() {
            disableNextModalTransition();
            router.back();
        }

        return {
            // General
            RecipientType,
            CryptoCurrency,
            FiatCurrency,
            modal$,

            // Recipient Input
            addressInputValue,
            resetRecipient,
            onAddressEntered,
            onDomainEntered,
            recipientWithLabel,
            gotRequestUriRecipient,
            gotRequestUriAmount,
            parseRequestUri,

            // Amount Input
            amount,
            feePerByte,
            fee,
            maxSendableAmount,
            amountMenuOpened,
            feeOptions,
            activeCurrency,
            onCurrencySelected,
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
            addressInput$,
            labelInput$,

            // Status Screen
            statusScreenOpened,
            statusTitle,
            statusState,
            statusMessage,
            onStatusMainAction,
            onStatusAlternativeAction,
            onCloseOverlay,

            back,
            RouteName,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        BtcAddressInput,
        BtcLabelInput,
        AmountInput,
        AmountMenu,
        FeeSelector,
        FiatConvertedAmount,
        Tooltip,
        InfoCircleSmallIcon,
        SendModalFooter,
        StatusScreen,
        DoubleInput,
    },
});
</script>

<style lang="scss" scoped>
    @import "../../scss/variables.scss";

    .page {
        flex-grow: 1;
        font-size: var(--body-size);
        height: 100%;
    }

    .page-body {
        --short-transition-duration: 300ms;

        padding-bottom: 0;
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

        .amount-menu ::v-deep .button {
            margin-left: 1rem;
            margin-bottom: 1rem;
        }

        .amount-menu ::v-deep .menu {
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
            .amount-input ::v-deep,
            .amount-input ::v-deep .ticker {
                color: var(--nimiq-orange);
            }

            .amount-input ::v-deep .nq-input {
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

        ::v-deep .trigger .nq-icon {
            opacity: 0.4;
        }

        ::v-deep .tooltip-box {
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

        ::v-deep .trigger svg {
            height: 2rem;
            opacity: .3;

            transition: opacity var(--short-transition-duration) var(--nimiq-ease);
        }

        & ::v-deep .trigger:hover svg,
        & ::v-deep .trigger:focus svg,
        &.shown ::v-deep .trigger svg {
            opacity: .6;
        }

        ::v-deep .tooltip-box {
            width: 25.875rem;
            font-size: var(--small-size);
            font-weight: 600;
            line-height: 2.5rem;
            color: white;
            transform: translate(-2rem, 2rem);

            @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
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

    .send-modal-footer {
        padding-bottom: 2rem;

        @media (max-width: 450px) { // Breakpoint of .page-body padding
            padding: 0 0 1rem;
        }

        ::v-deep .footer-notice {
            margin-bottom: -1rem;
        }
    }

    @media (max-width: $mobileBreakpoint) { // Full Mobile Breakpoint
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

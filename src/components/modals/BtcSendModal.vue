<template>
    <Modal :showOverlay="statusScreenOpened">
        <div class="page flex-column">
            <PageHeader>{{ $t('Send Transaction') }}</PageHeader>
            <PageBody class="flex-column">
                <section class="address-section" :class="{'extended': recipientWithLabel}">
                    <BtcLabelInput v-if="recipientWithLabel"
                        v-model="recipientWithLabel.label"
                        :placeholder="$t('Name this recipient...')"
                        :disabled="recipientWithLabel.type === RecipientType.KNOWN_CONTACT"/>
                    <BtcAddressInput
                        :placeholder="$t('Enter recipient address...')"
                        @paste="/* (event, text) => parseRequestUri(text, event) */"
                        @input="resetAddress"
                        @address="onAddressEntered"
                        ref="addressInputRef"/>
                    <span
                        v-if="recipientWithLabel && recipientWithLabel.type === RecipientType.KNOWN_CONTACT"
                        class="reused-address nq-orange flex-row"
                    >
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
                </section>

                <section class="amount-section" :class="{'insufficient-balance': maxSendableAmount < amount}">
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== 'btc'}">
                        <AmountInput v-if="activeCurrency === 'btc'"
                            v-model="amount" :decimals="8" ref="amountInputRef"
                        >
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                currency="btc"
                                :activeCurrency="activeCurrency"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                @fee-selection="feeSelectionOpened = true"
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
                                @fee-selection="feeSelectionOpened = true"
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
                            {{ $t('You will send {amount} BTC', { amount: amount / 1e8 }) }}
                        </span>
                    </span>
                    <span v-else class="insufficient-balance-warning nq-orange" key="insufficient">
                        {{ $t('Insufficient balance.') }}
                        <a class="send-all" @click="sendMax">
                            {{ $t('Send all') }}
                        </a>
                    </span>
                </section>

                <section class="fee-section flex-row">
                    <FeeSelector :fees="feeOptions" @fee="(fee) => feePerByte = fee"/>
                    <div class="flex-grow"></div>
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
            </PageBody>

            <PageFooter class="flex-row">
                <button
                    class="nq-button light-blue"
                    :disabled="!canSend"
                    @click="sign"
                    @mousedown.prevent
                >{{ $t('Send Transaction') }}</button>

                <!-- <button class="reset scan-qr-button" @click="$router.push('/scan').catch((err)=>{})">
                    <ScanQrCodeIcon/>
                </button> -->
            </PageFooter>
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
}

<script lang="ts">
import { defineComponent, ref, watch, computed, Ref, onMounted, onUnmounted } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    PageFooter,
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
import { useBtcAddressStore, UTXO } from '../../stores/BtcAddress';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useFiatStore } from '../../stores/Fiat';
// import { useSettingsStore } from '../../stores/Settings';
import { FiatCurrency } from '../../lib/Constants';
import { sendBtcTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import { selectOutputs, estimateFees } from '../../lib/BitcoinTransactionUtils';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { getElectrumClient } from '../../electrum';

export enum RecipientType {
    NEW_CONTACT,
    KNOWN_CONTACT,
    GLOBAL_ADDRESS,
}

export default defineComponent({
    name: 'send-btc-modal',
    // props: {
    //     requestUri: {
    //         type: String,
    //         required: false,
    //     },
    // },
    setup(props, context) {
        const {
            state: addresses$,
            addressSet,
            accountBalance,
            setRecipientLabel,
            getRecipientLabel,
        } = useBtcAddressStore();
        const { state: network$ } = useBtcNetworkStore();

        const recipientWithLabel = ref<{address: string, label: string, type: RecipientType} | null>(null);

        watch(recipientWithLabel, (newVal, oldVal) => {
            if (newVal === null || oldVal === null) return;
            if (newVal.type !== RecipientType.NEW_CONTACT) return;
            setRecipientLabel(newVal.address, newVal.label);
        }, { deep: true });

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

        const availableUtxos = computed(() => {
            const utxos = [] as Array<UTXO & { address: string }>;
            for (const addressInfo of addressSet.value.internal) {
                utxos.push(...addressInfo.utxos.map((utxo) => ({
                    ...utxo,
                    address: addressInfo.address,
                })));
            }
            for (const addressInfo of addressSet.value.external) {
                utxos.push(...addressInfo.utxos.map((utxo) => ({
                    ...utxo,
                    address: addressInfo.address,
                })));
            }
            return utxos;
        });

        const requiredInputs = computed(() => selectOutputs(availableUtxos.value, amount.value, feePerByte.value));

        const fee = computed(() => estimateFees(
            requiredInputs.value.utxos.length || 1,
            requiredInputs.value.changeAmount > 0 ? 2 : 1,
            feePerByte.value,
        ));

        const maxSendableAmount = computed(() => Math.max((accountBalance.value || 0) - fee.value, 0));

        const amountMenuOpened = ref(false);

        const feeHistogram = ref([] as Array<[number, number]>);

        let isFetchingHistogram = false;
        async function fetchFeeHistogram() {
            if (isFetchingHistogram) return;
            isFetchingHistogram = true;

            const histogram = await (await getElectrumClient()).getFeeHistogram();
            feeHistogram.value = histogram;

            isFetchingHistogram = false;
        }
        fetchFeeHistogram();

        const histogramInterval = setInterval(async () => {
            fetchFeeHistogram();
        }, 30 * 1000); // Update every 30 seconds

        onUnmounted(() => {
            clearInterval(histogramInterval);
        });

        const feeOptions = computed(() => {
            // Estimate the fees for the next 24 hours = 144 blocks max

            // Actual size is 1mil, but we calculate with 2/5 to simulate continously incoming txs.
            const BLOCK_SIZE = 400000; // vsize = vbytes

            let bracketIndex = 0;
            let delay = 1;
            let blockSize = BLOCK_SIZE;
            const blocks: number[] = [];

            let runningSize = 0;
            while (bracketIndex <= feeHistogram.value.length && delay <= 144) { // 144 = 24h
                const bracket = feeHistogram.value[bracketIndex];
                if (!bracket) {
                    // Set fee for block as the start fee of the last bracket
                    blocks[delay] = Math.floor(feeHistogram.value[bracketIndex - 1]?.[0] || 1);
                    break;
                }

                runningSize += bracket[1]; // Summarize bracket vsize

                if (runningSize > blockSize) {
                    // Set fee for block as the start fee of the oversized bracket
                    blocks[delay] = Math.floor(bracket[0]);
                    runningSize = bracket[1]; // eslint-disable-line prefer-destructuring
                    delay += 1; // Go to next block
                    // Reduce blockSize the higher the delay to simulate incoming txs until inclusion
                    blockSize = BLOCK_SIZE / (delay * 0.5);
                }

                bracketIndex += 1;
            }

            return blocks;
        });

        const activeCurrency = ref('btc');
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency));

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

        const hasHeight = computed(() => !!network$.height);

        const canSend = computed(() =>
            recipientWithLabel.value
            && recipientWithLabel.value.address
            && hasHeight.value
            && amount.value
            && amount.value <= maxSendableAmount.value,
        );

        // function parseRequestUri(uri: string, event?: ClipboardEvent) {
        //     uri = uri.replace(`${window.location.origin}/`, '');
        //     const parsedRequestLink = parseRequestLink(uri, window.location.origin, true);
        //     if (parsedRequestLink) {
        //         if (event) {
        //             // Prevent paste event being applied to the recipient label field, that now became focussed.
        //             event.preventDefault();
        //         }

        //         if (parsedRequestLink.recipient) {
        //             onAddressEntered(parsedRequestLink.recipient);
        //             if (!recipientWithLabel.value!.label && parsedRequestLink.label) {
        //                 recipientWithLabel.value!.label = parsedRequestLink.label;
        //             }
        //         }
        //         if (parsedRequestLink.amount) {
        //             amount.value = parsedRequestLink.amount;
        //         }
        //     }
        // }

        // if (props.requestUri) {
        //     parseRequestUri(props.requestUri);
        // }

        /**
         * Autofocus
         */

        // FIXME: This should optimally be automatic with Typescript
        interface AmountInput {
            focus(): void;
        }

        const addressInputRef: Ref<LabelInput | null> = ref(null);
        const labelInputRef: Ref<LabelInput | null> = ref(null);
        const amountInputRef: Ref<AmountInput | null> = ref(null);

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

            try {
                const plainTx = await sendBtcTransaction({
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
                            // FIXME: If no unused change address is found, need to request new ones from Hub!
                            address: addressSet.value.internal.find((addressInfo) => !addressInfo.used)!.address,
                            value: requiredInputs.value.changeAmount,
                        },
                    } : {}),
                });

                if (!plainTx) {
                    statusScreenOpened.value = false;
                    return;
                }

                const { addTransactions } = useBtcTransactionsStore();
                addTransactions([plainTx]);

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
                setTimeout(() => context.root.$router.back(), SUCCESS_REDIRECT_DELAY);
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

        return {
            // General
            RecipientType,

            // Recipient Input
            resetAddress,
            onAddressEntered,
            recipientWithLabel,
            // parseRequestUri,

            // Amount Input
            amount,
            feePerByte,
            fee,
            maxSendableAmount,
            amountMenuOpened,
            feeOptions,
            activeCurrency,
            fiatAmount,
            fiatCurrencyInfo,
            sendMax,
            fiatCurrency: fiat$.currency,
            otherFiatCurrencies,
            canSend,
            sign,
            // onboard,

            // DOM refs for autofocus
            addressInputRef,
            labelInputRef,
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
        PageFooter,
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
    },
});
</script>

<style lang="scss" scoped>
    .page {
        flex-grow: 1;
        font-size: var(--body-size);
        height: 100%;

        .nq-button {
            margin: 0 4rem 3rem;
        }
    }

    .page-body {
        justify-content: space-between;
        flex-grow: 1;
        padding-bottom: 2rem;
    }

    .address-section {
        text-align: center;

        .btc-address-input {
            width: 100%;
            font-size: 15px;
            position: relative; // For correct z-index positioning
        }

        .btc-label-input {
            margin-bottom: -0.25rem;
        }

        .reused-address {
            justify-content: center;
            align-items: center;
            font-weight: 600;
            margin-top: -2.5rem;

            > .nq-icon {
                margin-right: 0.5rem;
            }

            .tooltip {
                margin-left: 0.5rem;
                font-size: var(--small-size);
            }
        }

        &.extended {
            .btc-address-input /deep/ input {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
                background: white;
            }

            .btc-label-input /deep/ input {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                background: white;
            }

            .btc-address-input:focus-within {
                z-index: 2;
            }

            .btc-label-input:hover,
            .btc-label-input:focus-within {
                z-index: 1;
            }
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
        }

        .insufficient-balance-warning {
            font-weight: 600;

            .send-all {
                text-decoration: underline;
                cursor: pointer;
            }
        }

        &.insufficient-balance {
            .amount-input {
                color: var(--nimiq-orange);
            }

            .amount-input /deep/ input {
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
        padding: 0 1rem;
        align-items: center;

        .secondary-amount {
            margin-right: 1rem;
        }

        /deep/ .trigger .nq-icon {
            opacity: 0.4;
        }
    }

    .tooltip {
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

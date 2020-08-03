<template>
    <Modal :showOverlay="statusScreenOpened">
        <div class="page flex-column">
            <PageHeader>{{ $t('Send Transaction') }}</PageHeader>
            <PageBody class="flex-column">
                <section class="address-section">
                    <BtcAddressInput
                        :placeholder="$t('Enter recipient address...')"
                        @paste="/* (event, text) => parseRequestUri(text, event) */"
                        @input="resetAddress"
                        @address="onAddressEntered"
                        ref="addressInputRef"/>
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
                            <span v-if="fee">
                                +<Amount :amount="fee" :minDecimals="0" :maxDecimals="8" :currencyDecimals="8"/>
                                {{ $t('fee') }}
                            </span>
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

                <div class="flex-row">
                    <button
                        class="nq-button light-blue"
                        :disabled="!canSend"
                        @click="sign"
                        @mousedown.prevent
                    >{{ $t('Send Transaction') }}</button>

                    <button class="reset scan-qr-button" @click="$router.push('/scan').catch((err)=>{})">
                        <ScanQrCodeIcon/>
                    </button>
                </div>
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
}

<script lang="ts">
import { defineComponent, ref, watch, computed, Ref, onMounted } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    ScanQrCodeIcon,
    LabelInput,
    Amount,
} from '@nimiq/vue-components';
import { /* parseRequestLink, */ CurrencyInfo } from '@nimiq/utils';
import Modal from './Modal.vue';
import BtcAddressInput from '../BtcAddressInput.vue';
import Avatar from '../Avatar.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useAccountStore } from '../../stores/Account';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useFiatStore } from '../../stores/Fiat';
// import { useSettingsStore } from '../../stores/Settings';
import { FiatCurrency } from '../../lib/Constants';
import { sendBtcTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';

export enum RecipientType {
    CONTACT,
    OWN_ADDRESS,
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
        const { state: addresses$, addressSet, accountBalance } = useBtcAddressStore();
        const { state: network$ } = useBtcNetworkStore();

        const recipientWithLabel = ref<{address: string, label: string, type: RecipientType} | null>(null);

        // watch(recipientWithLabel, (newVal, oldVal) => {
        //     if (newVal === null || oldVal === null) return;
        //     if (newVal.type !== RecipientType.CONTACT) return;
        //     // setContact(newVal.address, newVal.label);
        // }, { deep: true });

        function resetAddress() {
            recipientWithLabel.value = null;
        }

        function onAddressEntered(address: string) {
            // Find label across contacts, own addresses
            let label = '';
            let type = RecipientType.CONTACT; // Can be stored as a new contact by default
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[address];
            if (ownedAddressInfo) {
                const { accountInfos } = useAccountStore();
                label = Object.values(accountInfos.value)
                    .find((accountInfo) => accountInfo.btcAddresses.external.includes(address))!.label;
                type = RecipientType.OWN_ADDRESS;
            }
            // // Search contacts
            // if (getLabel.value(address)) {
            //     label = getLabel.value(address)!;
            //     type = RecipientType.CONTACT;
            // }
            // // Search global address book
            // const globalLabel = AddressBook.getLabel(address);
            // if (globalLabel) {
            //     label = globalLabel;
            //     type = RecipientType.GLOBAL_ADDRESS;
            // }

            recipientWithLabel.value = { address, label, type };
        }

        const amount = ref(0);
        const feePerByte = ref(0);

        const fee = computed(() => feePerByte.value * 138);

        const maxSendableAmount = computed(() => Math.max((accountBalance.value || 0) - fee.value, 0));

        const amountMenuOpened = ref(false);

        const feeOptions = computed(() => []);

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
                    inputs: [],
                    output: {
                        address: recipientWithLabel.value!.address,
                        label: recipientWithLabel.value!.label,
                        value: amount.value,
                    },
                });

                if (!plainTx) {
                    statusScreenOpened.value = false;
                    return;
                }

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
        BtcAddressInput,
        ScanQrCodeIcon,
        Avatar,
        LabelInput,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
        Amount,
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
            margin-top: 0;
            width: calc(100% - 4rem);
        }
    }

    .page-body {
        justify-content: space-between;
        flex-grow: 1;
    }

    .address-section {
        text-align: center;

        .btc-address-input {
            width: 100%;
            font-size: 15px;
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

        .secondary-amount {
            font-weight: 600;
            opacity: 0.5;

            .fiat-amount,
            .amount {
                margin-left: -0.2em;
            }
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

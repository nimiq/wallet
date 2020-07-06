<template>
    <Modal :showOverlay="contactListOpened
        || recipientDetailsOpened
        || addressListOpened
        || feeSelectionOpened
        || statusScreenOpened"
        @close-overlay="onCloseOverlay"
    >
        <div v-if="page === Pages.RECIPIENT_INPUT" class="page flex-column" :key="Pages.RECIPIENT_INPUT">
            <PageHeader>{{ $t('Send Transaction') }}</PageHeader>
            <PageBody class="page__recipient-input flex-column">
                <ContactShortcuts
                    :contacts="recentContacts"
                    @contact-list-opened="contactListOpened = true"
                    @contact-selected="onContactSelected"
                />
                <section class="address-section">
                    <label class="nq-label">{{ $t('Enter Address') }}</label>
                    <AddressInput
                        v-model="addressInputValue"
                        @paste="(event, text) => parseRequestUri(text, event)"
                        @address="onAddressEntered"
                        ref="addressInputRef"/>
                </section>
                <section class="cashlink-section">
                    <span>{{ $t('Address unavailable?') }}</span>
                    <button class="nq-button-s" @click="onCreateCashlink">{{ $t('Create a Cashlink') }}</button>
                </section>
                <button class="reset scan-qr-button" @click="$router.push('/scan').catch((err)=>{})">
                    <ScanQrCodeIcon/>
                </button>
            </PageBody>
        </div>

        <div v-if="contactListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__contact-list">{{ $t('Choose a Recipient') }}</PageHeader>
            <PageBody class="page__contact-list">
                <ContactBook @contact-selected="onContactSelected"/>
            </PageBody>
        </div>

        <div v-if="recipientDetailsOpened" slot="overlay" class="page flex-column">
            <PageBody class="page__recipient-overlay recipient-overlay flex-column">
                <div class="spacing-top"></div>
                <Identicon :address="recipientWithLabel.address"/>
                <LabelInput
                    v-if="recipientWithLabel.type === RecipientType.CONTACT"
                    v-model="recipientWithLabel.label"
                    :placeholder="$t('Name this contact...')"
                     ref="labelInputRef"/>
                <label v-else>{{ recipientWithLabel.label }}</label>
                <Copyable :text="recipientWithLabel.address">
                    <AddressDisplay :address="recipientWithLabel.address"/>
                </Copyable>
                <button
                    class="nq-button light-blue"
                    @click="recipientDetailsOpened = false; page = Pages.AMOUNT_INPUT;"
                >{{ $t('Set Amount') }}</button>
            </PageBody>
        </div>

        <div
            v-if="page === Pages.AMOUNT_INPUT" class="page flex-column"
            :key="Pages.AMOUNT_INPUT" @click="amountMenuOpened = false"
        >
            <PageHeader
                :backArrow="true"
                @back="page = Pages.RECIPIENT_INPUT; resetRecipient();"
            >{{ $t('Set Amount') }}</PageHeader>
            <PageBody class="page__amount-input flex-column">
                <section class="identicon-section flex-row">
                    <button class="reset identicon-stack flex-column" @click="addressListOpened = true">
                        <Identicon class="secondary" v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>
                        <Identicon class="secondary" v-if="backgroundAddresses[1]" :address="backgroundAddresses[1]"/>
                        <Identicon class="primary" :address="activeAddressInfo.address"/>
                        <label>{{ activeAddressInfo.label }}</label>
                    </button>
                    <div class="separator"></div>
                    <IdenticonButton
                        :address="recipientWithLabel.address"
                        :label="recipientWithLabel.label"
                        @click="recipientDetailsOpened = true"/>
                </section>

                <section class="amount-section" :class="{'insufficient-balance': maxSendableAmount < amount}">
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== 'nim'}">
                        <AmountInput v-if="activeCurrency === 'nim'" v-model="amount" ref="amountInputRef">
                            <span v-if="activeCurrency !== 'nim'" slot="prefix" class="tilde">~</span>
                            <AmountMenu slot="suffix" class="nim"
                                :open="amountMenuOpened"
                                :activeCurrency="activeCurrency"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                @fee-selection="feeSelectionOpened = true"
                                @send-max="sendMax"
                                @currency="(currency) => activeCurrency = currency"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                        <AmountInput v-else v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals">
                            <span v-if="activeCurrency !== 'nim'" slot="prefix" class="tilde">~</span>
                            <AmountMenu slot="suffix" class="nim"
                                :open="amountMenuOpened"
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
                        <span v-if="activeCurrency === 'nim'" key="fiat-amount">
                            {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="amount"/>
                            <span v-if="fee">
                                +<Amount :amount="fee" :minDecimals="0" :maxDecimals="5"/> {{ $t('fee') }}
                            </span>
                        </span>
                        <span v-else key="nim-amount">
                            {{ $t('You will send {amount} NIM', { amount: amount / 1e5 }) }}
                        </span>
                    </span>
                    <span v-else class="insufficient-balance-warning nq-orange" key="insufficient">
                        {{ $t('Insufficient balance.') }}
                        <a class="send-all" @click="sendMax">
                            {{ $t('Send all') }}
                        </a>
                    </span>
                </section>

                <section class="message-section">
                    <LabelInput
                        v-model="message"
                        :placeholder="$t('Add a public message...')"
                        :maxBytes="64"
                        vanishing
                        ref="messageInputRef"/>
                </section>

                <button
                    class="nq-button light-blue"
                    :disabled="!canSend"
                    @click="sign"
                >{{ $t('Send Transaction') }}</button>
            </PageBody>
        </div>

        <div v-if="addressListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__address-list">{{ $t('Choose an Address') }}</PageHeader>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false"/>
            </PageBody>
        </div>

        <div v-if="feeSelectionOpened" slot="overlay" class="page flex-column">
            <PageBody class="page__fee-selection fee-selection flex-column">
                <h1 class="nq-h1">{{ $t('Speed up your transaction') }}</h1>
                <p class="nq-text">
                    {{ $t('By adding a transaction fee, you can influence ' +
                    'how fast your transaction will be processed.') }}
                </p>
                <SelectBar
                    :options="feeOptions"
                    :selectedValue="feePerByte"
                    @changed="(value) => feePerByte = value"
                />
                <Amount :amount="fee" :minDecimals="0" :maxDecimals="5"/>
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
import { defineComponent, ref, watch, computed, Ref } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    AddressInput,
    ScanQrCodeIcon,
    Identicon,
    LabelInput,
    Copyable,
    AddressDisplay,
    SelectBar,
    Amount,
} from '@nimiq/vue-components';
import { parseRequestLink, AddressBook, Utf8Tools, CurrencyInfo } from '@nimiq/utils';
import Modal from './Modal.vue';
import ContactShortcuts from '../ContactShortcuts.vue';
import ContactBook from '../ContactBook.vue';
import IdenticonButton from '../IdenticonButton.vue';
import AddressList from '../AddressList.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useContactsStore } from '../../stores/Contacts';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { useFiatStore } from '../../stores/Fiat';
import { FiatCurrency } from '../../lib/Constants';
import { createCashlink, sendTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';

export enum RecipientType {
    CONTACT,
    OWN_ADDRESS,
    GLOBAL_ADDRESS,
}

export default defineComponent({
    name: 'send-modal',
    props: {
        requestUri: {
            type: String,
            required: false,
        },
    },
    setup(props, context) {
        enum Pages {
            RECIPIENT_INPUT,
            AMOUNT_INPUT,
        }
        const page = ref(Pages.RECIPIENT_INPUT);

        const { state: addresses$, activeAddressInfo, addressInfos } = useAddressStore();
        const { contactsArray: contacts, setContact, getLabel } = useContactsStore();
        const { state: network$ } = useNetworkStore();

        const recipientDetailsOpened = ref(false);
        const recipientWithLabel = ref<{address: string, label: string, type: RecipientType} | null>(null);

        watch(recipientWithLabel, (newVal, oldVal) => {
            if (newVal === null || oldVal === null) return;
            if (newVal.type !== RecipientType.CONTACT) return;
            setContact(newVal.address, newVal.label);
        }, { deep: true });

        const recentContacts = computed(() => contacts.value.slice(0, 3));

        const contactListOpened = ref(false);
        function onContactSelected(contact: {address: string, label: string}, type = RecipientType.CONTACT) {
            recipientWithLabel.value = {
                ...contact,
                type,
            };
            contactListOpened.value = false;
            page.value = Pages.AMOUNT_INPUT;
        }

        const addressInputValue = ref(''); // Used for resetting the address input
        function onAddressEntered(address: string) {
            // Find label across contacts, own addresses
            let label = '';
            let type = RecipientType.CONTACT; // Can be stored as a new contact by default
            // Search other stored addresses
            const ownedAddressInfo = addresses$.addressInfos[address];
            if (ownedAddressInfo) {
                label = ownedAddressInfo.label;
                type = RecipientType.OWN_ADDRESS;
            }
            // Search contacts
            if (getLabel.value(address)) {
                label = getLabel.value(address)!;
                type = RecipientType.CONTACT;
            }
            // Search global address book
            const globalLabel = AddressBook.getLabel(address);
            if (globalLabel) {
                label = globalLabel;
                type = RecipientType.GLOBAL_ADDRESS;
            }

            recipientWithLabel.value = { address, label, type };
            if (!label) {
                recipientDetailsOpened.value = true;
            } else {
                page.value = Pages.AMOUNT_INPUT;
            }
        }

        function resetRecipient() {
            addressInputValue.value = '';
            recipientWithLabel.value = null;
        }

        function closeRecipientDetails() {
            recipientDetailsOpened.value = false;
            if (page.value === Pages.RECIPIENT_INPUT) {
                resetRecipient();
            }
        }

        function onCreateCashlink() {
            createCashlink(activeAddressInfo.value!.address, activeAddressInfo.value!.balance || undefined);
        }

        const backgroundAddresses = computed(() => { // eslint-disable-line arrow-body-style
            // TODO: Order by last used?
            return addressInfos.value
                .slice(0, 3)
                .filter((addressInfo) => addressInfo.address !== activeAddressInfo.value!.address)
                .slice(0, 2)
                .map((addressInfo) => addressInfo.address);
        });

        const addressListOpened = ref(false);

        const amount = ref(0);
        const feePerByte = ref(0);
        const message = ref('');

        const fee = computed(() => message.value
            ? feePerByte.value * (166 + Utf8Tools.stringToUtf8ByteArray(message.value).byteLength)
            : feePerByte.value * 138);

        const maxSendableAmount = computed(() => Math.max((activeAddressInfo.value!.balance || 0) - fee.value, 0));

        const amountMenuOpened = ref(false);
        const feeSelectionOpened = ref(false);

        const feeOptions: SelectBar.SelectBarOption[] = [
            { color: 'nq-light-blue-bg', text: 'free', value: 0, index: 0 },
            { color: 'nq-green-bg', text: 'standard', value: 1, index: 1 },
            { color: 'nq-gold-bg', text: 'express', value: 2, index: 2 },
        ];

        const activeCurrency = ref('nim');
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === 'nim') {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToNimDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals / 1e5);

        watch(activeCurrency, (currency) => {
            if (currency === 'nim') {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.nim[currency]! * fiatToNimDecimalRatio.value;
        });

        watch(() => {
            if (activeCurrency.value === 'nim') return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.nim[activeCurrency.value]!
                / fiatToNimDecimalRatio.value);
        });

        async function sendMax() {
            if (activeCurrency.value !== 'nim') {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.nim[activeCurrency.value]!
                    * fiatToNimDecimalRatio.value;
            }
            // Need to wait here for the next processing tick, as otherwise we would have a
            // race condition between the amount assignment and the fiatAmount watcher.
            await context.root.$nextTick();
            amount.value = maxSendableAmount.value;
        }

        const hasHeight = computed(() => !!network$.height);

        const canSend = computed(() => hasHeight.value && amount.value && amount.value <= maxSendableAmount.value);

        function parseRequestUri(uri: string, event?: ClipboardEvent) {
            uri = uri.replace(`${window.location.origin}/`, '');
            const parsedRequestLink = parseRequestLink(uri, window.location.origin, true);
            if (parsedRequestLink) {
                if (event) {
                    // Prevent paste event being applied to the recipient label field, that now became focussed.
                    event.preventDefault();
                }

                if (parsedRequestLink.recipient) {
                    onAddressEntered(parsedRequestLink.recipient);
                    if (!recipientWithLabel.value!.label && parsedRequestLink.label) {
                        recipientWithLabel.value!.label = parsedRequestLink.label;
                    }
                }
                if (parsedRequestLink.amount) {
                    amount.value = parsedRequestLink.amount;
                }
                if (parsedRequestLink.message) {
                    message.value = parsedRequestLink.message;
                }
            }
        }

        if (props.requestUri) {
            parseRequestUri(props.requestUri);
        }

        /**
         * Autofocus
         */

        // FIXME: This should optimally be automatic with Typescript
        interface AmountInput {
            focus(): void;
        }

        const addressInputRef: Ref<AddressInput | null> = ref(null);
        const labelInputRef: Ref<LabelInput | null> = ref(null);
        const amountInputRef: Ref<AmountInput | null> = ref(null);
        const messageInputRef: Ref<LabelInput | null> = ref(null);

        const { width } = useWindowSize();

        async function focus(elementRef: Ref<AddressInput | LabelInput | AmountInput | null>) {
            // TODO: Detect onscreen keyboards instead?
            if (width.value <= 700) return; // Full mobile breakpoint

            await context.root.$nextTick();
            if (!elementRef.value) return;
            elementRef.value.focus();
        }

        watch(page, (currentPage) => {
            if (currentPage === Pages.RECIPIENT_INPUT) {
                focus(addressInputRef);
            } else if (currentPage === Pages.AMOUNT_INPUT) {
                focus(amountInputRef);
            }
        });

        watch(recipientDetailsOpened, (isOpened) => {
            if (isOpened) {
                focus(labelInputRef);
            } else if (page.value === Pages.RECIPIENT_INPUT) {
                focus(addressInputRef);
            } else {
                focus(amountInputRef);
            }
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
                const plainTx = await sendTransaction({
                    sender: activeAddressInfo.value!.address,
                    recipient: recipientWithLabel.value!.address,
                    // recipientType: 0 | 1 | 2 | undefined,
                    recipientLabel: recipientWithLabel.value!.label,
                    value: amount.value,
                    fee: fee.value,
                    extraData: message.value || undefined,
                    validityStartHeight: network$.height,
                });

                if (!plainTx) {
                    statusScreenOpened.value = false;
                    return;
                }

                // Show success screen
                statusState.value = State.SUCCESS;
                statusTitle.value = recipientWithLabel.value!.label
                    ? context.root.$t('Sent {nim} NIM to {name}', {
                        nim: amount.value / 1e5,
                        name: recipientWithLabel.value!.label,
                    })
                    : context.root.$t('Sent {nim} NIM', {
                        nim: amount.value / 1e5,
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

        function onCloseOverlay() {
            contactListOpened.value = false;
            if (recipientDetailsOpened.value) {
                closeRecipientDetails();
            }
            addressListOpened.value = false;
            feeSelectionOpened.value = false;
        }

        return {
            // General
            Pages,
            RecipientType,
            page,

            // Recipient Input
            recentContacts,
            contactListOpened,
            onContactSelected,
            addressInputValue,
            onAddressEntered,
            onCreateCashlink,
            recipientDetailsOpened,
            recipientWithLabel,
            closeRecipientDetails,
            parseRequestUri,

            // Amount Input
            resetRecipient,
            activeAddressInfo,
            backgroundAddresses,
            addressListOpened,
            amount,
            feePerByte,
            fee,
            maxSendableAmount,
            amountMenuOpened,
            feeSelectionOpened,
            feeOptions,
            activeCurrency,
            fiatAmount,
            fiatCurrencyInfo,
            sendMax,
            fiatCurrency: fiat$.currency,
            otherFiatCurrencies,
            message,
            canSend,
            sign,
            // onboard,

            // DOM refs for autofocus
            addressInputRef,
            labelInputRef,
            amountInputRef,
            messageInputRef,

            // Status Screen
            statusScreenOpened,
            statusTitle,
            statusState,
            statusMessage,
            statusMainActionText,
            statusAlternativeActionText,
            onStatusMainAction,
            onStatusAlternativeAction,

            onCloseOverlay,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        ContactShortcuts,
        ContactBook,
        AddressInput,
        ScanQrCodeIcon,
        Identicon,
        LabelInput,
        Copyable,
        AddressDisplay,
        IdenticonButton,
        AddressList,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
        SelectBar,
        Amount,
        StatusScreen,
    },
});

/*
    TODO:
    * Styling of SendTx
    * properly implementy the change Sender functionality (design pending)
    * close button and Scan QR Code collide.
 */
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
        align-items: center;
        flex-grow: 1;
    }

    .page__recipient-input,
    .page__contact-list,
    .page__amount-input {
        // 0.375rem to get the distance between the heading and .contact-selection to exact 40px
        padding: 0.375rem 3rem 3rem;
    }

    .header__contact-list,
    .header__address-list {
        padding-bottom: 1.5rem;
    }

    .page__contact-list {
        padding-right: 0;
        padding-left: 0;
    }

    .page__address-list {
        --padding-sides: 2rem;
        padding: 0.375rem var(--padding-sides) 1.5rem;
    }

    .page__amount-input {
        padding-bottom: 4rem;
    }

    .page__fee-selection {
        justify-content: center;
    }

    .contact-book {
        height: 100%;
    }

    .address-section {
        text-align: center;

        .address-input {
            margin-top: 2.25rem;
        }
    }

    .cashlink-section {
        text-align: center;

        span {
            display: block;
            opacity: 0.7;
            margin-bottom: 1.75rem;
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

    .recipient-overlay {
        .spacing-top {
            height: 1.5rem;
        }

        .identicon {
            width: 18rem;
            margin: -1rem 0;
        }

        .label-input,
        label {
            font-size: var(--h1-size);
            font-weight: 600;
        }

        label {
            line-height: 6.25rem; // Same height as the LabelInput
        }

        .copyable {
            padding: 0.5rem;

            /deep/ .background {
                border-radius: 0.625rem;
            }

            .address-display {
                transition: opacity 0.3s var(--nimiq-ease);
            }

            &:hover,
            &:focus,
            &.copied {
                .address-display {
                    opacity: 1;
                    font-weight: 500;
                }
            }
        }
    }

    .identicon-section {
        justify-content: center;
        align-self: stretch;
        margin-bottom: 3.5rem;

        .identicon-button {
            width: 14rem;

            /deep/ .identicon {
                width: 9rem;
                height: 9rem;
            }
        }

        .separator {
            height: 0.25rem;
            background: var(--text-14);
            border-radius: 500px;
            flex-grow: 1;
            margin: 5rem 2rem 0;
            max-width: 8rem;
        }
    }

    .identicon-stack {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem;
        position: relative;
        width: 14rem;

        .primary {
            position: relative;
            width: 9rem;
            height: 9rem;
            margin: -0.5rem auto 1rem;
        }

        .secondary {
            width: 7.5rem;
            position: absolute;
            top: 1.375rem;
            opacity: 0.4;

            transition:
                transform var(--movement-duration) var(--nimiq-ease),
                opacity var(--movement-duration) var(--nimiq-ease);

            &:first-child {
                left: 1rem;
            }

            &:nth-child(2) {
                right: 1rem;
            }
        }

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);

            .secondary:first-child {
                transform: translateX(-0.375rem) scale(1.05);
                opacity: 0.5;
            }

            .secondary:nth-child(2) {
                transform: translateX(0.375rem) scale(1.05);
                opacity: 0.5;
            }
        }

        label {
            cursor: pointer;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }
    }

    .address-list {
        height: 100%;
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

    .message-section {
        align-self: stretch;
        text-align: center;

        .label-input {
            font-size: var(--h2-size);
        }
    }

    .fee-selection {
        .nq-h1 {
            text-align: center;
        }

        p {
            text-align: center;
            margin-top: 0.5rem;
            margin-bottom: 4rem;
        }

        .amount {
            margin-top: 3rem;
        }
    }

    @media (max-width: 700px) { // Full Mobile Breakpoint
        .status-screen {
            border-top-left-radius: 1.75rem;
            border-top-right-radius: 1.75rem;
        }
    }
</style>

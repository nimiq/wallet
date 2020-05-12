<template>
    <Modal :showOverlay="contactListOpened || recipientDetailsOpened || addressListOpened || feeSelectionOpened">
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
                    <AddressInput v-model="addressInputValue" @address="onAddressEntered"/>
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
            <PageHeader>{{ $t('Contacts') }}</PageHeader>
            <CloseButton class="top-right" @click="contactListOpened = false"/>
            <PageBody class="page__contact-list contact-list">
                <button
                    v-for="contact in contacts"
                    :key="contact.address"
                    class="reset contact-button flex-row"
                    @click="onContactSelected(contact)"
                >
                    <Identicon :address="contact.address"/>
                    <label>{{ contact.label }}</label>
                </button>
            </PageBody>
        </div>

        <div v-if="recipientDetailsOpened" slot="overlay" class="page flex-column">
            <CloseButton class="top-right" @click="closeRecipientDetails"/>
            <PageBody class="page__recipient-overlay recipient-overlay flex-column">
                <div class="spacing-top"></div>
                <Identicon :address="recipientWithLabel.address"/>
                <LabelInput
                    v-if="recipientWithLabel.type === RecipientType.CONTACT"
                    v-model="recipientWithLabel.label"
                    :placeholder="$t('Name this contact...')"/>
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
                        <span v-if="activeCurrency !== 'nim'" class="tilde">~</span>
                        <AmountInput v-if="activeCurrency === 'nim'" v-model="amount"/>
                        <AmountInput v-else v-model="fiatAmount"/>
                        <button
                            class="reset amount-menu-button flex-row"
                            @click.stop="amountMenuOpened = !amountMenuOpened"
                        >{{ activeCurrency.toUpperCase() }}</button>
                        <div v-if="amountMenuOpened" class="amount-menu">
                            <button class="reset flex-row" @click="feeSelectionOpened = true">
                                <!-- eslint-disable-next-line max-len -->
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><line class="cls-1" x1="15.25" y1="3.25" x2="7.75" y2="3.25"/><line class="cls-1" x1="12.25" y1="7.75" x2="0.75" y2="7.75"/><line class="cls-1" x1="13.75" y1="12.25" x2="4.75" y2="12.25"/></g></svg>
                                {{ $t('Set fee') }}
                            </button>
                            <button class="reset flex-row" @click="sendMax">
                                <!-- eslint-disable-next-line max-len -->
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><line class="cls-1" x1="8.25" y1="6.25" x2="8.25" y2="15.25"/><path class="cls-1" d="M12.25,9.3l-4-4-4,4"/><line class="cls-1" x1="3.25" y1="1.25" x2="13.25" y2="1.25"/></g></svg>
                                {{ $t('Send all') }}
                            </button>
                            <div class="separator"></div>
                            <div class="flex-row currencies">
                                <button
                                    class="reset" :class="{'active': activeCurrency === 'nim'}"
                                    @click="activeCurrency = 'nim'"
                                >NIM</button>
                                <button
                                    class="reset" :class="{'active': activeCurrency === fiatCurrency}"
                                    @click="activeCurrency = fiatCurrency"
                                >{{ fiatCurrency.toUpperCase() }}</button>
                                <button
                                    v-for="fiatCurrency of otherFiatCurrencies" :key="fiatCurrency"
                                    class="reset" :class="{'active': activeCurrency === fiatCurrency}"
                                    @click="activeCurrency = fiatCurrency"
                                >{{fiatCurrency.toUpperCase()}}</button>
                            </div>
                        </div>
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
                        vanishing/>
                </section>

                <button
                    class="nq-button light-blue"
                    :disabled="!canSend"
                    @click="sign"
                >{{ $t('Send Transaction') }}</button>
            </PageBody>
        </div>

        <div v-if="addressListOpened" slot="overlay" class="page flex-column">
            <PageHeader>{{ $t('Choose an Address') }}</PageHeader>
            <CloseButton class="top-right" @click="addressListOpened = false"/>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false"/>
            </PageBody>
        </div>

        <div v-if="feeSelectionOpened" slot="overlay" class="page flex-column">
            <CloseButton class="top-right" @click="feeSelectionOpened = false"/>
            <PageBody class="page__fee-selection fee-selection flex-column">
                <h1 class="nq-h1">{{ $t('Speed up your transaction') }}</h1>
                <p class="nq-text">
                    {{$t(`By adding a transation fee, you can influence
                    how fast your transaction will be processed.`) }}
                </p>
                <SelectBar
                    :options="feeOptions"
                    :selectedValue="feePerByte"
                    @changed="(value) => feePerByte = value"
                />
                <Amount :amount="fee" :minDecimals="0" :maxDecimals="5"/>
            </PageBody>
        </div>
    </Modal>
</template>
}

<script lang="ts">
import { defineComponent, ref, watch, computed } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    AddressInput,
    ScanQrCodeIcon,
    Identicon,
    CloseButton,
    LabelInput,
    Copyable,
    AddressDisplay,
    AmountInput,
    SelectBar,
    Amount,
} from '@nimiq/vue-components';
import { parseRequestLink, AddressBook, Utf8Tools } from '@nimiq/utils';
import Modal from './Modal.vue';
import ContactShortcuts from '../ContactShortcuts.vue';
import IdenticonButton from '../IdenticonButton.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import { useContactsStore } from '../../stores/Contacts';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { useFiatStore } from '../../stores/Fiat';
import { FiatCurrency } from '../../lib/Constants';
import { createCashlink, sendTransaction } from '../../hub';

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

        enum RecipientType {
            CONTACT,
            OWN_ADDRESS,
            GLOBAL_ADDRESS,
        }

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
        function onContactSelected(contact: {address: string, label: string}) {
            console.debug('Contact selected:', contact);

            recipientWithLabel.value = {
                ...contact,
                type: RecipientType.CONTACT,
            };
            contactListOpened.value = false;
            page.value = Pages.AMOUNT_INPUT;
        }

        const addressInputValue = ref(''); // Used for resetting the address input
        function onAddressEntered(address: string) {
            console.debug('Address entered:', address);

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

        const feeOptions: SelectBar.SelectBarOption[] = [{
            color: 'nq-light-blue-bg',
            text: 'free',
            value: 0,
            index: 0,
        }, {
            color: 'nq-green-bg',
            text: 'standard',
            value: 1,
            index: 1,
        }, {
            color: 'nq-gold-bg',
            text: 'express',
            value: 2,
            index: 2,
        }];

        const activeCurrency = ref('nim');
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency));

        watch(activeCurrency, (currency) => {
            if (currency === 'nim') {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.nim[currency]!;
        });

        watch(() => {
            if (activeCurrency.value === 'nim') return;
            amount.value = Math.floor(fiatAmount.value / exchangeRates.value.nim[activeCurrency.value]!);
        });

        async function sendMax() {
            if (activeCurrency.value !== 'nim') {
                fiatAmount.value = maxSendableAmount.value * fiat$.exchangeRates.nim[activeCurrency.value]!;
            }
            // Need to wait here for the next processing tick, as otherwise we would have a
            // race condition between the amount assignment and the fiatAmount watcher.
            await context.root.$nextTick();
            amount.value = maxSendableAmount.value;
        }

        const hasHeight = computed(() => !!network$.height);

        const canSend = computed(() => hasHeight && amount.value && amount.value <= maxSendableAmount.value);

        if (props.requestUri) {
            const parsedRequestLink = parseRequestLink(props.requestUri, window.location.origin, true);
            if (parsedRequestLink) {
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

        async function sign() {
            // TODO: Show loading screen
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

                if (plainTx) {
                    // TODO: Show success screen

                    // Close modal
                    context.root.$router.back();
                }
            } catch (error) {
                // TODO: Show error screen
            }
        }

        return {
            // General
            Pages,
            RecipientType,
            page,

            // Recipient Input
            contacts,
            recentContacts,
            contactListOpened,
            onContactSelected,
            addressInputValue,
            onAddressEntered,
            onCreateCashlink,
            recipientDetailsOpened,
            recipientWithLabel,
            closeRecipientDetails,

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
            sendMax,
            fiatCurrency: fiat$.currency,
            otherFiatCurrencies,
            message,
            canSend,
            sign,
            // onboard,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        ContactShortcuts,
        AddressInput,
        ScanQrCodeIcon,
        Identicon,
        CloseButton,
        LabelInput,
        Copyable,
        AddressDisplay,
        IdenticonButton,
        AddressList,
        AmountInput,
        FiatConvertedAmount,
        SelectBar,
        Amount,
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
    @import '../../scss/mixins.scss';

    .page {
        flex-grow: 1;
        font-size: 2rem;
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

        .nq-icon {
            display: block;
        }

        &:hover,
        &:focus {
            opacity: 0.6;
        }
    }

    .contact-list {
        overflow-y: scroll;
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;

        @extend %custom-scrollbar;
    }

    .contact-button {
        align-items: center;
        width: 100%;
        padding: 2rem;
        border-radius: 0.75rem;

        .identicon {
            width: 5.75rem;
            margin: -0.3125rem 0; // 0.3125 = 2.5px
        }

        label {
            margin-left: 2rem;
            font-weight: 600;
            cursor: pointer;
        }

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);
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
            font-size: 3rem;
            font-weight: 600;
        }

        label {
            line-height: 6.25rem; // Same height as the LabelInput
        }

        .copyable {
            margin-bottom: 3rem;
            padding: 1rem;

            &::before,
            &::after {
                padding-top: 1.5rem;
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

            transition: transform var(--movement-duration) var(--nimiq-ease);

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
                transform: translateX(-0.375rem);
            }

            .secondary:nth-child(2) {
                transform: translateX(0.375rem);
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
            opacity: 0.5;
            line-height: 10rem;
            margin-right: 0.75rem;
        }

        .amount-input {
            width: auto;
            max-width: calc(100% - 10rem - 1rem); // Subtract width of AmountMenuButton and its left margin
            min-height: 5rem;

            /deep/ input {
                padding-top: 0;
                padding-bottom: 0;
                color: inherit !important;
            }

            /deep/ .nim {
                display: none;
            }
        }

        .estimate .amount-input {
            max-width: calc(100% - 10rem - 1rem - 5rem); // Additionally subtract width of tilde
        }

        .amount-menu-button {
            align-items: center;
            margin-left: 1rem;
            margin-bottom: 1rem;
            font-size: 4rem;
            font-weight: bold;
            cursor: pointer;

            &::after {
                content: '';
                display: block;
                width: 0;
                height: 0;
                border: 1rem solid transparent;
                border-width: 1rem 0.625rem;
                border-top-color: inherit;
                margin-left: 0.75rem;
                margin-bottom: -1.5rem;
                opacity: 0.4;

                transition: opacity var(--attr-duration) var(--nimiq-ease);
            }

            &:hover,
            &:active {
                &::after {
                    opacity: 0.7;
                }
            }
        }

        .amount-menu {
            width: 16.75rem;
            border-radius: 0.5rem;
            background: var(--nimiq-blue-bg);
            position: absolute;
            right: 3rem;
            bottom: 3rem;
            padding: 1rem;
            z-index: 1;
            box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.2);

            button {
                color: white;
                opacity: 0.7;
                font-weight: 600;
                width: 100%;
                text-align: left;
                padding: 0.5rem;
                align-items: center;

                transition: opacity var(--attr-duration) var(--nimiq-ease);

                svg {
                    width: 2rem;
                    margin-right: 1rem;
                }

                &:hover,
                &:focus {
                    opacity: 1 !important;
                }
            }

            .separator {
                height: 0.125rem;
                background: white;
                opacity: 0.16;
                border-radius: 1rem;
                margin: 1rem 0;
            }

            .currencies {
                flex-wrap: wrap;

                button {
                    width: 50%;
                    opacity: 0.4;
                    font-weight: bold;

                    &.active {
                        opacity: 1;

                        &::after {
                            content: '';
                            display: inline-block;
                            border: 1rem solid transparent;
                            border-width: 0.5rem 0.75rem;
                            border-right-color: inherit;
                            margin-bottom: 0.25rem;
                            margin-left: -0.25rem;
                        }
                    }
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

        .insufficient-balance-warning {
            font-weight: 600;

            .send-all {
                text-decoration: underline;
                cursor: pointer;
            }
        }

        &.insufficient-balance {
            .amount-row {
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
            font-size: 2.5rem;
        }
    }

    .fee-selection {
        p {
            text-align: center;
            margin-top: 0.5rem;
            margin-bottom: 4rem;
        }

        .amount {
            margin-top: 3rem;
        }
    }
</style>

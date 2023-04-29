<template>
    <Modal :showOverlay="contactListOpened
        || recipientDetailsOpened
        || addressListOpened
        || feeSelectionOpened
        || statusScreenOpened"
        @close-overlay="onCloseOverlay"
        class="send-modal"
        :class="{'value-masked': amountsHidden}"
        ref="modal$"
    >
        <div v-if="page === Pages.RECIPIENT_INPUT" class="page flex-column" :key="Pages.RECIPIENT_INPUT">
            <PageHeader :backArrow="!!$route.params.canUserGoBack" @back="back">
                {{ $t('Send Transaction') }}
            </PageHeader>
            <PageBody class="page__recipient-input flex-column">
                <ContactShortcuts
                    :contacts="recentContacts"
                    :hasAddresses="hasOwnAddresses"
                    @contact-list-opened="contactListOpened = true"
                    @contact-selected="onContactSelected"
                />
                <section class="address-section flex-column">
                    <label class="nq-label">{{ $t('Enter address') }}</label>
                    <AddressInput
                        v-model="addressInputValue"
                        :allowDomains="true"
                        @paste="(event, text) => parseRequestUri(text, event)"
                        @address="onAddressEntered"
                        ref="addressInput$"/>
                    <span class="notice"
                        :class="{
                            'resolving': isResolvingUnstoppableDomain,
                            'nq-orange': resolverError,
                        }"
                        :style="{'opacity': isResolvingUnstoppableDomain || resolverError ? 1 : 0}"
                    >
                        <template v-if="isResolvingUnstoppableDomain">
                            {{ $t('Resolving Unstoppable Domain...') }}
                        </template>
                        <template v-else-if="resolverError">
                            {{ resolverError }}
                        </template>
                        <template v-else>
                            &nbsp;
                        </template>
                    </span>
                </section>
                <section class="cashlink-section">
                    <span>{{ $t('Address unavailable?') }}</span>
                    <button class="nq-button-s" @click="onCreateCashlink" @mousedown.prevent>
                        {{ $t('Create a Cashlink') }}
                    </button>
                </section>
                <button class="reset scan-qr-button" @click="$router.push('/scan')">
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

        <div v-if="recipientDetailsOpened && recipientWithLabel" slot="overlay" class="page flex-column">
            <PageBody class="page__recipient-overlay recipient-overlay flex-column">
                <div class="spacing-top"></div>
                <div class="flex-grow"></div>
                <Identicon :address="recipientWithLabel.address"/>
                <LabelInput
                    v-if="recipientWithLabel.type === RecipientType.CONTACT"
                    v-model="recipientWithLabel.label"
                    :placeholder="$t('Name this contact...')"
                    ref="labelInput$"/>
                <label v-else>{{ recipientWithLabel.label }}</label>
                <AddressDisplay :address="recipientWithLabel.address" :copyable="true"/>
                <div class="flex-grow"></div>
                <button
                    class="nq-button light-blue"
                    @click="recipientDetailsOpened = false; page = Pages.AMOUNT_INPUT;"
                    @mousedown.prevent
                >
                    <template v-if="page === Pages.AMOUNT_INPUT">{{ $t('Done') }}</template>
                    <template v-else>{{ $t('Set Amount') }}</template>
                </button>
            </PageBody>
        </div>

        <div
            v-if="page === Pages.AMOUNT_INPUT && recipientWithLabel" class="page flex-column"
            :key="Pages.AMOUNT_INPUT" @click="amountMenuOpened = false"
        >
            <PageHeader
                :backArrow="!gotValidRequestUri"
                @back="page = Pages.RECIPIENT_INPUT; resetRecipient();"
            >{{ $t('Set Amount') }}</PageHeader>
            <PageBody class="page__amount-input flex-column">
                <section class="identicon-section flex-row">
                    <button class="reset identicon-stack flex-column" @click="addressListOpened = true" :class="{
                        'triangle-indented': backgroundAddresses.length === 1,
                    }">
                        <Identicon class="secondary" v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>
                        <Identicon class="secondary" v-if="backgroundAddresses[1]" :address="backgroundAddresses[1]"/>
                        <Identicon class="primary" :address="activeAddressInfo.address"/>
                        <TriangleDownIcon v-if="backgroundAddresses.length"/>
                        <label>{{ activeAddressInfo.label }}</label>
                    </button>
                    <div class="separator-wrapper">
                        <div class="separator"></div>
                    </div>
                    <IdenticonButton
                        :address="recipientWithLabel.address"
                        :label="recipientWithLabel.label"
                        @click="recipientDetailsOpened = true"/>
                </section>

                <section v-if="!isValidRecipient" class="invalid-recipient-section">
                    <span class="nq-notice warning" key="invalid-recipient">
                        {{ $t('The sender and recipient cannot be identical.') }}
                    </span>
                </section>

                <section
                    v-if="isValidRecipient"
                    class="amount-section"
                    :class="{'insufficient-balance': maxSendableAmount < amount}"
                >
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== CryptoCurrency.NIM}">
                        <AmountInput v-if="activeCurrency === CryptoCurrency.NIM" v-model="amount" ref="amountInput$">
                            <AmountMenu slot="suffix" class="ticker"
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
                            <span slot="prefix" class="tilde">~</span>
                            <AmountMenu slot="suffix" class="ticker"
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
                        <span v-if="activeCurrency === CryptoCurrency.NIM" key="fiat-amount">
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

                <section v-if="isValidRecipient" class="message-section">
                    <LabelInput
                        v-model="message"
                        :placeholder="$t('Add a public message...')"
                        :maxBytes="64"
                        vanishing/>
                </section>
            </PageBody>
            <SendModalFooter
                :assets="[CryptoCurrency.NIM]"
                :disabled="!canSend"
                @click="sign"
            ><template #cta>{{ $t('Send {currency}', { currency: 'NIM' }) }}</template></SendModalFooter>
        </div>

        <div v-if="addressListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__address-list">{{ $t('Choose an Address') }}</PageHeader>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false" :required-balance="1"/>
            </PageBody>
        </div>

        <div v-if="feeSelectionOpened" slot="overlay" class="page flex-column">
            <PageBody class="page__fee-selection fee-selection flex-column">
                <h1 class="nq-h1">{{ $t('Speed up your Transaction') }}</h1>
                <p class="nq-text">
                    {{ $t('By adding a transaction fee, you can influence ' +
                    'how fast your transaction will be processed.') }}
                </p>
                <SelectBar
                    :options="feeOptions"
                    :selectedValue="feePerByte"
                    @changed="updateFee"
                />
                <Amount :amount="fee" :minDecimals="0" :maxDecimals="5"/>
                <div class="flex-grow"></div>
                <button class="nq-button light-blue" @click="onCloseOverlay" @mousedown.prevent>
                    {{ $t('Apply fee') }}
                </button>
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
import { defineComponent, ref, watch, computed, Ref, onBeforeUnmount } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    AddressInput,
    ScanQrCodeIcon,
    Identicon,
    LabelInput,
    AddressDisplay,
    SelectBar,
    Amount,
} from '@nimiq/vue-components';
import { parseRequestLink, AddressBook, Utf8Tools, CurrencyInfo, ValidationUtils } from '@nimiq/utils';
import { captureException } from '@sentry/vue';
import Modal, { disableNextModalTransition } from './Modal.vue';
import ContactShortcuts from '../ContactShortcuts.vue';
import ContactBook from '../ContactBook.vue';
import IdenticonButton from '../IdenticonButton.vue';
import TriangleDownIcon from '../icons/TriangleDownIcon.vue';
import AddressList from '../AddressList.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SendModalFooter from '../SendModalFooter.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useContactsStore } from '../../stores/Contacts';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCY_DENYLIST } from '../../lib/Constants';
import { createCashlink, sendTransaction } from '../../hub';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';
import { i18n } from '../../i18n/i18n-setup';
import {
    isValidDomain as isValidUnstoppableDomain,
    resolve as resolveUnstoppableDomain,
} from '../../lib/UnstoppableDomains';

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

        const modal$ = ref<Modal>(null);

        const { state: addresses$, activeAddressInfo, addressInfos } = useAddressStore();
        const { contactsArray: contacts, setContact, getLabel } = useContactsStore();
        const { state: network$ } = useNetworkStore();
        const { config } = useConfig();

        const recipientDetailsOpened = ref(false);
        const recipientWithLabel = ref<{address: string, label: string, type: RecipientType} | null>(null);

        function saveRecipientLabel() {
            if (!recipientWithLabel.value || recipientWithLabel.value.type !== RecipientType.CONTACT) return;
            setContact(recipientWithLabel.value.address, recipientWithLabel.value.label);
        }

        const recentContacts = computed(() => contacts.value.slice(0, 3));
        const hasOwnAddresses = computed(() => addressInfos.value.length - 1 > 0);

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
        const isDomain = computed(() => {
            const input = addressInputValue.value;
            if (input.length < 3) return false;
            if (input.toUpperCase().startsWith('NQ') && !Number.isNaN(parseInt(input[2], 10))) return false;
            return true;
        });
        const isResolvingUnstoppableDomain = ref(false);
        const resolverError = ref('');
        watch(addressInputValue, (address) => {
            resolverError.value = '';

            // Detect unstoppable domains
            if (isValidUnstoppableDomain(address)) {
                isResolvingUnstoppableDomain.value = true;
                const domain = address;
                const ticker = 'NIM';
                resolveUnstoppableDomain(domain, ticker)
                    .then(async (resolvedAddress) => {
                        if (resolvedAddress && ValidationUtils.isValidAddress(resolvedAddress)) {
                            const formattedAddress = resolvedAddress
                                .replace(/[ +-]|%20/g, '') // strip spaces and dashes
                                .replace(/(.)(?=(.{4})+$)/g, '$1 '); // reformat with spaces, forming blocks of 4 chars
                            const label = getLabel.value(formattedAddress);
                            if (!label) setContact(formattedAddress, domain);
                            recipientWithLabel.value = {
                                address: formattedAddress,
                                label: label || domain,
                                type: RecipientType.CONTACT,
                            };
                            page.value = Pages.AMOUNT_INPUT;
                        } else {
                            resolverError.value = context.root.$t(
                                'Domain does not resolve to a valid address') as string;
                        }
                    })
                    .catch((error: Error) => {
                        console.debug(error); // eslint-disable-line no-console
                        let { message } = error;
                        message = message.replace(`crypto.${ticker}.address record`, `${ticker} address`);
                        resolverError.value = message;
                    })
                    .finally(() => isResolvingUnstoppableDomain.value = false);
            }
        });

        function onAddressEntered(address: string, skipRecipientDetails = false) {
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
            if (label || skipRecipientDetails) {
                // Go directly to the next screen
                page.value = Pages.AMOUNT_INPUT;
            } else {
                recipientDetailsOpened.value = true;
            }
        }

        const isValidRecipient = computed(() => recipientWithLabel.value?.address !== activeAddressInfo.value?.address);

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
            get text() { return i18n.t('free') as string; },
            value: 0,
            index: 0,
        }, {
            color: 'nq-green-bg',
            get text() { return i18n.t('standard') as string; },
            value: 1,
            index: 1,
        }, {
            color: 'nq-gold-bg',
            get text() { return i18n.t('express') as string; },
            value: 2,
            index: 2,
        }];

        const activeCurrency = ref<CryptoCurrency.NIM | FiatCurrency>(CryptoCurrency.NIM);
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency
                && !FIAT_CURRENCY_DENYLIST.includes(fiat.toUpperCase())));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === CryptoCurrency.NIM) {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToNimDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals / 1e5);

        watch(activeCurrency, (currency) => {
            if (currency === CryptoCurrency.NIM) {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.nim[currency]! * fiatToNimDecimalRatio.value;
        });

        watch(() => {
            if (activeCurrency.value === CryptoCurrency.NIM) return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.nim[activeCurrency.value]!
                / fiatToNimDecimalRatio.value);
        });

        async function sendMax() {
            if (activeCurrency.value !== CryptoCurrency.NIM) {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.nim[activeCurrency.value]!
                    * fiatToNimDecimalRatio.value;
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
            network$.consensus === 'established'
            && hasHeight.value
            && !!amount.value
            && amount.value <= maxSendableAmount.value);

        const gotValidRequestUri = ref(false);
        function parseRequestUri(uri: string, event?: ClipboardEvent) {
            uri = uri.replace(`${window.location.origin}/`, '');
            const parsedRequestLink = parseRequestLink(uri, window.location.origin, true);
            if (parsedRequestLink) {
                if (event) {
                    // Prevent paste event being applied to the recipient label field, that now became focussed.
                    event.preventDefault();
                }

                if (parsedRequestLink.recipient) {
                    const skipRecipientDetails = Boolean(parsedRequestLink.label || parsedRequestLink.amount);
                    onAddressEntered(parsedRequestLink.recipient, skipRecipientDetails);
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

                gotValidRequestUri.value = true;
            }
        }

        if (props.requestUri) {
            parseRequestUri(props.requestUri);
        }

        /**
         * Autofocus
         */

        const addressInput$ = ref<AddressInput>(null);
        const labelInput$ = ref<LabelInput>(null);
        const amountInput$ = ref<AmountInput>(null);

        const { isMobile } = useWindowSize();

        async function focus(element$: Ref<AddressInput | LabelInput | AmountInput | null>) {
            // TODO: Detect onscreen keyboards instead?
            if (isMobile.value) return;

            await context.root.$nextTick();
            if (!element$.value) return;
            element$.value.focus();
        }

        watch(page, (currentPage) => {
            if (currentPage === Pages.RECIPIENT_INPUT) {
                focus(addressInput$);
            } else if (currentPage === Pages.AMOUNT_INPUT) {
                focus(amountInput$);
            }
        });

        watch(recipientDetailsOpened, (isOpened) => {
            if (isOpened) {
                focus(labelInput$);
            } else if (page.value === Pages.RECIPIENT_INPUT) {
                focus(addressInput$);
            } else {
                focus(amountInput$);
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
            if (!canSend.value) return;

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

                saveRecipientLabel();

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
                successCloseTimeout = window.setTimeout(() => modal$.value!.forceClose(), SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

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

            // Do nothing when the success status overlay is shown, it will be closed by successCloseTimeout
        }

        const { amountsHidden } = useSettingsStore();

        function back() {
            disableNextModalTransition();
            context.root.$router.back();
        }

        let successCloseTimeout = 0;

        onBeforeUnmount(() => {
            window.clearTimeout(successCloseTimeout);
        });

        return {
            // General
            Pages,
            RecipientType,
            CryptoCurrency,
            page,
            modal$,

            // Recipient Input
            recentContacts,
            hasOwnAddresses,
            contactListOpened,
            onContactSelected,
            addressInputValue,
            onAddressEntered,
            onCreateCashlink,
            recipientDetailsOpened,
            recipientWithLabel,
            closeRecipientDetails,
            gotValidRequestUri,
            parseRequestUri,
            amountsHidden,
            isDomain,
            isResolvingUnstoppableDomain,
            resolverError,

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
            updateFee,
            fiatCurrency: fiat$.currency,
            otherFiatCurrencies,
            message,
            canSend,
            sign,
            isValidRecipient,
            // onboard,

            // DOM refs for autofocus
            addressInput$,
            labelInput$,
            amountInput$,

            // Status Screen
            statusScreenOpened,
            statusTitle,
            statusState,
            statusMessage,
            statusMainActionText,
            statusAlternativeActionText,
            onStatusMainAction,
            onStatusAlternativeAction,

            back,

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
        AddressDisplay,
        IdenticonButton,
        TriangleDownIcon,
        AddressList,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
        SelectBar,
        Amount,
        SendModalFooter,
        StatusScreen,
    },
});
</script>

<style lang="scss" scoped>
.send-modal {
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
        position: relative;
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
        min-height: 0;
    }

    .page__address-list {
        --padding-sides: 2rem;
        padding: 0.375rem var(--padding-sides) 1.5rem;
    }

    .page__amount-input {
        padding-bottom: .75rem;

        button {
            flex-shrink: 0;
        }
    }

    .page__fee-selection {
        justify-content: center;
    }

    .contact-book {
        height: 100%;
    }

    .address-section {
        align-items: center;
        text-align: center;
        margin: 4rem 0;

        .nq-label {
            margin: 0;
        }

        .address-input {
            margin-top: 2.25rem;
        }

        .notice {
            margin-top: -3.5rem;
            font-size: var(--small-size);
            transition: opacity .3s var(--nimiq-ease), margin-top .3s var(--nimiq-ease);

            &.resolving {
                font-weight: 600;
                opacity: .5 !important;
            }
        }

        .address-input.display-as-domain ~ .notice {
            margin-top: 1rem;
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
        justify-content: flex-start;

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
            margin: 3rem 0;
        }

        label {
            line-height: 6.25rem; // Same height as the LabelInput
        }

        .copyable {
            padding: 0.5rem;
            background: var(--nimiq-highlight-bg);
            border-radius: 0.625rem;
            margin: 1rem 0 4rem;

            transition:
                color .3s var(--nimiq-ease),
                background 0.3s var(--nimiq-ease);

            ::v-deep .background {
                display: none;
            }

            .address-display {
                transition: opacity 0.3s var(--nimiq-ease);
                font-weight: 500;
                opacity: 1;
            }

            &:hover,
            &:focus,
            &.copied {
                background: rgba(5, 130, 202, 0.07); // Based on Nimiq Light Blue
            }
        }
    }

    .identicon-section {
        justify-content: center;
        align-items: center;
        align-self: stretch;
        margin-bottom: 3.5rem;

        .identicon-button {
            width: 14rem;

            ::v-deep .identicon {
                width: 9rem;
                height: 9rem;
            }
        }

        .separator-wrapper {
            --height: 0.25rem;

            height: var(--height);
            margin-left: 1rem;
            margin-right: 1rem;
            margin-bottom: 5rem;

            position: relative;
            flex-grow: 1;
            overflow: hidden;
            mask: radial-gradient(circle at center, white, white calc(100% - 3rem), rgba(255,255,255, 0));

            .separator {
                height: 100%;
                width: 50%;
                background: var(--text-14);
                border-radius: calc(var(--height) / 2);

                position: absolute;
                left: -50%;
                animation: separatorSliding 2.2s infinite;

                @keyframes separatorSliding {
                    0% { transform: translateX(0) }
                    100% { transform: translateX(300%) }
                }
            }
        }
    }

    .identicon-stack {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem;
        position: relative;
        width: 14rem;
        transition: background var(--attr-duration) var(--nimiq-ease);

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

        ::v-deep svg.triangle-down-icon {
            position: absolute;
            right: 0.375rem;
            top: 8rem;
            opacity: 0.25;
            transition: opacity var(--attr-duration) var(--nimiq-ease);
        }

        &.triangle-indented ::v-deep svg.triangle-down-icon {
            right: 2rem;
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

            ::v-deep svg.triangle-down-icon {
                opacity: 0.4;
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
        margin: 3rem 0 2rem;

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

    .invalid-recipient-section {
        align-self: stretch;
        text-align: center;
        margin-bottom: 4rem;
    }

    .message-section {
        align-self: stretch;
        text-align: center;
        margin-bottom: 4rem;

        .label-input {
            font-size: var(--h2-size);
        }
    }

    .send-modal-footer {
        padding: 0 3rem 2rem;

        @media (max-width: 450px) { // Breakpoint of .page-body padding
            padding: .75rem 1rem 2rem;
        }

        ::v-deep .footer-notice {
            margin-bottom: -1rem;
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

    @media (min-width: 420px) {
        .page__amount-input {
            padding-left: 5rem;
            padding-right: 5rem;
        }
    }

    @media (max-width: 700px) { // Full Mobile Breakpoint
        .status-screen {
            border-top-left-radius: 1.75rem;
            border-top-right-radius: 1.75rem;
        }
    }
}
</style>

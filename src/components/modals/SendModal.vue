<template>
    <Modal :showOverlay="contactListOpened
        || recipientDetailsOpened
        || addressListOpened
        || feeSelectionOpened
        || statusType !== 'none'"
        @close-overlay="onCloseOverlay"
        class="send-modal"
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
                <button class="reset scan-qr-button" @click="$router.push({ name: RouteName.Scan })">
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
                <AddressDisplay :address="recipientWithLabel.address" copyable/>
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
                :backArrow="!gotRequestUriRecipient"
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
                        <AmountInput v-if="activeCurrency === CryptoCurrency.NIM" v-model="amount"
                            :disabled="gotRequestUriAmount" ref="amountInput$">
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                :activeCurrency="activeCurrency"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                :sendAllOption="!gotRequestUriAmount"
                                @fee-selection="feeSelectionOpened = true"
                                @send-max="sendMax"
                                @currency="(currency) => activeCurrency = currency"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                        <AmountInput v-else v-model="fiatAmount" :disabled="gotRequestUriAmount"
                            :decimals="fiatCurrencyInfo.decimals">
                            <span slot="prefix" class="tilde">~</span>
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                :activeCurrency="activeCurrency"
                                :fiatCurrency="fiatCurrency"
                                :otherFiatCurrencies="otherFiatCurrencies"
                                :sendAllOption="!gotRequestUriAmount"
                                @fee-selection="feeSelectionOpened = true"
                                @send-max="sendMax"
                                @currency="(currency) => activeCurrency = currency"
                                @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                        </AmountInput>
                    </div>

                    <span v-if="maxSendableAmount >= amount" class="secondary-amount" key="fiat+fee+expiry">
                        <span v-if="activeCurrency === CryptoCurrency.NIM" key="fiat-amount">
                            {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="amount"/>
                            <span v-if="fee">
                                +<Amount :amount="fee" :minDecimals="0" :maxDecimals="5"/> {{ $t('fee') }}
                            </span>
                        </span>
                        <span v-else key="nim-amount">
                            {{ $t('You will send {amount} NIM', { amount: amount / 1e5 }) }}
                        </span>
                        <span v-if="goCryptoExpiryEarlyCountdown" class="expiry-countdown"
                            :class="{ 'same-line': activeCurrency === CryptoCurrency.NIM && !fee }">
                            {{ $t('Pay within {countdown}', { countdown: goCryptoExpiryEarlyCountdown }) }}
                            <Tooltip preferredPosition="top left" :styles="{ 'min-width': '35rem' }">
                                <template #trigger>
                                    <InfoCircleSmallIcon/>
                                </template>
                                <template #default>{{
                                    $t('The GoCrypto payment request expires in {finalCountdown}. To ensure that your '
                                        + 'payment is confirmed in time, send it within {earlyCountdown}.', {
                                        earlyCountdown: goCryptoExpiryEarlyCountdown,
                                        finalCountdown: goCryptoExpiryFinalCountdown,
                                    })
                                }}</template>
                            </Tooltip>
                        </span>
                    </span>
                    <span v-else class="insufficient-balance-warning nq-orange" key="insufficient">
                        {{ $t('Insufficient balance.') }}
                        <a v-if="!gotRequestUriAmount" class="send-all" @click="sendMax">{{ $t('Send all') }}</a>
                    </span>
                </section>

                <section v-if="isValidRecipient" class="message-section">
                    <LabelInput
                        v-model="message"
                        :placeholder="$t('Add a public message...')"
                        :maxBytes="64"
                        :disabled="gotRequestUriMessage"
                        vanishing
                    />
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

        <div v-if="statusType !== 'none'" slot="overlay" class="page">
            <StatusScreen
                :title="statusTitle"
                :state="statusState"
                :message="statusMessage"
                :mainAction="statusType === 'signing' ? $t('Retry') : $t('Cancel')"
                :alternativeAction="statusType === 'signing' ? $t('Edit transaction') : undefined"
                @main-action="onStatusMainAction"
                @alternative-action="onStatusAlternativeAction"
                lightBlue
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
    Tooltip,
    InfoCircleSmallIcon,
} from '@nimiq/vue-components';
import { parseRequestLink, AddressBook, Utf8Tools, Currency, CurrencyInfo, ValidationUtils } from '@nimiq/utils';
import { useRouter, RouteName } from '@/router';
import { useI18n } from '@/lib/useI18n';
import { nextTick } from '@/lib/nextTick';
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
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCIES_OFFERED } from '../../lib/Constants';
import { createCashlink, sendTransaction } from '../../hub';
import { formatDuration } from '../../lib/Time';
import {
    GOCRYPTO_ID_PARAM,
    fetchGoCryptoPaymentDetails,
    goCryptoStatusToUserFriendlyMessage,
    GoCryptoPaymentDetails,
    GoCryptoPaymentApiError,
} from '../../lib/GoCrypto';
import { useWindowSize } from '../../composables/useWindowSize';
import { i18n } from '../../i18n/i18n-setup';
import {
    isValidDomain as isValidUnstoppableDomain,
    resolve as resolveUnstoppableDomain,
} from '../../lib/UnstoppableDomains';
import { reportToSentry } from '../../lib/Sentry';

export enum RecipientType {
    CONTACT,
    OWN_ADDRESS,
    GLOBAL_ADDRESS,
    // GoCrypto payments show a recipient label, which shouldn't be stored as contact as GoCrypto recycles addresses
    // such that different addresses can be used for the same shop, and different shops can use the same address.
    GO_CRYPTO,
}

export default defineComponent({
    name: 'send-modal',
    props: {
        requestUri: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        const { $t } = useI18n();
        enum Pages {
            RECIPIENT_INPUT,
            AMOUNT_INPUT,
        }
        const page = ref(Pages.RECIPIENT_INPUT);

        const modal$ = ref<Modal>(null);

        const { state: addresses$, activeAddressInfo, addressInfos } = useAddressStore();
        const { contactsArray: contacts, setContact, getLabel } = useContactsStore();
        const { consensus, height } = useNetworkStore();

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
        const isResolvingUnstoppableDomain = ref(false);
        const resolverError = ref('');
        watch(addressInputValue, async (address) => {
            resolverError.value = '';

            // Detect unstoppable domains
            if (isValidUnstoppableDomain(address)) {
                isResolvingUnstoppableDomain.value = true;
                const domain = address;
                const ticker = 'NIM';
                try {
                    const resolvedAddress = await resolveUnstoppableDomain(domain, ticker);
                    const normalizedAddress = resolvedAddress && ValidationUtils.normalizeAddress(resolvedAddress);
                    if (normalizedAddress && ValidationUtils.isValidAddress(normalizedAddress)) {
                        const label = getLabel.value(normalizedAddress);
                        if (!label) setContact(normalizedAddress, domain);
                        recipientWithLabel.value = {
                            address: normalizedAddress,
                            label: label || domain,
                            type: RecipientType.CONTACT,
                        };
                        page.value = Pages.AMOUNT_INPUT;
                    } else {
                        resolverError.value = $t('Domain does not resolve to a valid address') as string;
                    }
                } catch (e) {
                    console.debug(e); // eslint-disable-line no-console
                    let message = e instanceof Error ? e.message : String(e);
                    message = message.replace(`crypto.${ticker}.address record`, `${ticker} address`);
                    resolverError.value = message;
                } finally {
                    isResolvingUnstoppableDomain.value = false;
                }
            }
        });

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
            if (label || gotRequestUriRecipient.value) {
                // Go directly to the amount page
                page.value = Pages.AMOUNT_INPUT;
            }
            if (!label) {
                recipientDetailsOpened.value = true;
            }
        }

        const isValidRecipient = computed(() => recipientWithLabel.value?.address !== activeAddressInfo.value?.address);

        function resetRecipient() {
            if (gotRequestUriRecipient.value) return;
            addressInputValue.value = '';
            recipientWithLabel.value = null;
        }

        function closeRecipientDetails() {
            recipientDetailsOpened.value = false;
            if (page.value === Pages.RECIPIENT_INPUT && !gotRequestUriRecipient.value) {
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
        const otherFiatCurrencies = computed(() => FIAT_CURRENCIES_OFFERED.filter((fiat) => fiat !== fiat$.currency));

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
            if (activeCurrency.value === CryptoCurrency.NIM || gotRequestUriAmount.value) return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.nim[activeCurrency.value]!
                / fiatToNimDecimalRatio.value);
        });

        async function sendMax() {
            if (gotRequestUriAmount.value) return;
            if (activeCurrency.value !== CryptoCurrency.NIM) {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.nim[activeCurrency.value]!
                    * fiatToNimDecimalRatio.value;
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

        const hasHeight = computed(() => !!height.value);

        const canSend = computed(() =>
            consensus.value === 'established'
            && hasHeight.value
            && !!amount.value
            && amount.value <= maxSendableAmount.value
            && !isGoCryptoExpiryEarlyCountdownExpired(),
        );

        /**
         * Request link parsing
         */

        const gotRequestUriRecipient = ref(false);
        const gotRequestUriAmount = ref(false);
        const gotRequestUriMessage = ref(false);
        function parseRequestUri(uri: string, event?: ClipboardEvent) {
            // Note that for Nimiq, parseRequestLink automatically validates and normalizes addresses.
            const parsedRequestLink = parseRequestLink(uri, { currencies: [Currency.NIM] });
            if (!parsedRequestLink) return;

            let goCryptoId: string | null = null;
            try {
                goCryptoId = new URL(uri).searchParams.get(GOCRYPTO_ID_PARAM);
            } catch (e) {
                // Failed to parse uri as URL, e.g. due to missing protocol. Ignore as legit requests with gocrypto_id
                // set should be coming from ScanQrModal and be well formatted.
            }

            if (event) {
                // Prevent paste event being applied to the recipient label field, that now became focussed.
                event.preventDefault();
            }

            gotRequestUriRecipient.value = true;
            onAddressEntered(parsedRequestLink.recipient);
            if (!recipientWithLabel.value!.label && parsedRequestLink.label) {
                recipientWithLabel.value!.label = parsedRequestLink.label;
                if (goCryptoId) {
                    recipientWithLabel.value!.type = RecipientType.GO_CRYPTO;
                    recipientDetailsOpened.value = false; // hide recipient overlay as GoCrypto label isn't editable
                }
            }

            if (parsedRequestLink.amount) {
                gotRequestUriAmount.value = true;
                amount.value = parsedRequestLink.amount;
            }

            if (parsedRequestLink.message) {
                gotRequestUriMessage.value = true;
                message.value = parsedRequestLink.message;
            }

            if (goCryptoId) {
                monitorGoCryptoRequest(goCryptoId);
            }
        }

        let goCryptoMonitoringTimeout = -1;
        let goCryptoPaymentDetails: GoCryptoPaymentDetails | GoCryptoPaymentApiError | null = null;
        async function monitorGoCryptoRequest(paymentId: string) {
            clearTimeout(goCryptoMonitoringTimeout); // avoid potential parallel monitoring
            let endMonitoring = false;
            try {
                goCryptoPaymentDetails = await fetchGoCryptoPaymentDetails({ paymentId });
                if (('recipient' in goCryptoPaymentDetails
                        && goCryptoPaymentDetails.recipient !== recipientWithLabel.value?.address)
                    || ('amount' in goCryptoPaymentDetails && goCryptoPaymentDetails.amount !== amount.value)) {
                    // The GoCrypto payment request does not match the payment info.
                    endMonitoring = true;
                    return;
                }
                const userFriendlyStatus = goCryptoStatusToUserFriendlyMessage(goCryptoPaymentDetails);

                if (userFriendlyStatus.paymentStatus === 'pending') {
                    if (statusType.value === 'go-crypto') {
                        // Hide previous status only if it was a go-crypto status before.
                        statusType.value = 'none';
                    }
                    return;
                }

                statusType.value = 'go-crypto';
                statusState.value = userFriendlyStatus.paymentStatus === 'accepted' ? State.SUCCESS : State.WARNING;
                statusTitle.value = userFriendlyStatus.title;
                statusMessage.value = 'message' in userFriendlyStatus ? userFriendlyStatus.message : '';

                // Close modal automatically if success screen is shown.
                if (statusState.value !== State.SUCCESS) return;
                await new Promise<void>((resolve) => {
                    successCloseTimeout = window.setTimeout(() => {
                        resolve();
                        if (statusType.value !== 'go-crypto' || statusState.value !== State.SUCCESS) return;
                        endMonitoring = true;
                        modal$.value!.forceClose();
                    }, SUCCESS_REDIRECT_DELAY);
                });
            } catch (e) {
                statusType.value = 'go-crypto';
                statusState.value = State.WARNING;
                statusTitle.value = $t('Something went wrong') as string;
                statusMessage.value = e instanceof Error ? e.message : String(e);
            } finally {
                clearTimeout(goCryptoMonitoringTimeout); // end if requested, or clear to avoid parallel monitoring
                if (!endMonitoring) {
                    startGoCryptoExpiryCountdowns(); // Start countdowns if they're not started yet.
                    goCryptoMonitoringTimeout = window.setTimeout(() => monitorGoCryptoRequest(paymentId), 10000);
                } else {
                    stopGoCryptoExpiryCountdowns(true);
                }
            }
        }

        let goCryptoExpiriesUpdateInterval = -1;
        const goCryptoExpiryEarlyCountdown = ref('');
        const goCryptoExpiryFinalCountdown = ref('');
        function startGoCryptoExpiryCountdowns() {
            if (goCryptoExpiriesUpdateInterval !== -1) return;
            const updateCountdown = () => {
                const {
                    expiryEarly,
                    expiryFinal,
                } = goCryptoPaymentDetails && 'expiryFinal' in goCryptoPaymentDetails
                    ? goCryptoPaymentDetails
                    : { expiryEarly: -1, expiryFinal: -1 }; // goCryptoPaymentDetails is unknown or an error

                const now = Date.now();
                // Ceil durations such that they're only 0:00 once the payment request actually expired, for
                // monitorGoCryptoRequest in stopGoCryptoExpiryCountdowns to show the warning screen immediately.
                goCryptoExpiryEarlyCountdown.value = formatDuration(Math.max(expiryEarly - now, 0), 'ceil');
                goCryptoExpiryFinalCountdown.value = formatDuration(Math.max(expiryFinal - now, 0), 'ceil');

                if (isGoCryptoExpiryEarlyCountdownExpired()) {
                    stopGoCryptoExpiryCountdowns();
                    return false;
                }

                return true;
            };
            if (!updateCountdown()) return;
            goCryptoExpiriesUpdateInterval = window.setInterval(updateCountdown, 500);
        }

        function stopGoCryptoExpiryCountdowns(clearExpiredCountdowns = false) {
            // Stop countdowns.
            clearInterval(goCryptoExpiriesUpdateInterval);
            goCryptoExpiriesUpdateInterval = -1;

            // Update UI.
            // Remove countdowns if they didn't reach 0:00, of if removal was explicitly requested.
            const isExpiryEarlyCountdownExpired = isGoCryptoExpiryEarlyCountdownExpired();
            const isExpiryFinalCountdownExpired = isGoCryptoExpiryFinalCountdownExpired();
            if (!isExpiryEarlyCountdownExpired || clearExpiredCountdowns) {
                goCryptoExpiryEarlyCountdown.value = '';
            }
            if (!isExpiryFinalCountdownExpired || clearExpiredCountdowns) {
                goCryptoExpiryFinalCountdown.value = '';
            }

            // Request an immediate monitoring update to show the expiry warning, if it's not shown already.
            // The check whether the warning is already shown is also important for avoiding an infinite loop.
            if (isExpiryEarlyCountdownExpired
                && (goCryptoPaymentDetails && 'id' in goCryptoPaymentDetails)
                && (statusType.value !== 'go-crypto' || statusState.value !== State.WARNING)) {
                monitorGoCryptoRequest(goCryptoPaymentDetails.id);
            }
        }

        function isGoCryptoExpiryEarlyCountdownExpired() {
            return goCryptoExpiryEarlyCountdown.value === '0:00';
        }

        function isGoCryptoExpiryFinalCountdownExpired() {
            return goCryptoExpiryFinalCountdown.value === '0:00';
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

            await nextTick();
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
        const statusType = ref<'none' | 'go-crypto' | 'signing'>('none');
        const statusState = ref<State>(State.LOADING);
        const statusTitle = ref('');
        const statusMessage = ref('');

        async function sign() {
            if (!canSend.value) return;

            // Show loading screen
            statusType.value = 'signing';
            statusState.value = State.LOADING;
            statusTitle.value = $t('Sending Transaction') as string;
            statusMessage.value = '';

            try {
                const abortController = new AbortController();
                const unwatchGoCryptoExpiry = watch(() => {
                    if (!isGoCryptoExpiryEarlyCountdownExpired()) return;
                    abortController.abort();
                });
                const plainTx = await sendTransaction({
                    sender: activeAddressInfo.value!.address,
                    recipient: recipientWithLabel.value!.address,
                    // recipientType: 0 | 1 | 2 | undefined,
                    recipientLabel: recipientWithLabel.value!.label,
                    value: amount.value,
                    fee: fee.value,
                    extraData: message.value || undefined,
                    validityStartHeight: height.value,
                }, abortController.signal);
                unwatchGoCryptoExpiry();

                if (!plainTx) {
                    if (statusType.value === 'signing') {
                        // Hide StatusScreen unless an error is shown.
                        statusType.value = 'none';
                    }
                    return;
                }

                saveRecipientLabel();

                // Show success screen
                statusType.value = 'signing';
                statusState.value = State.SUCCESS;
                statusTitle.value = recipientWithLabel.value!.label
                    ? $t('Sent {nim} NIM to {name}', {
                        nim: amount.value / 1e5,
                        name: recipientWithLabel.value!.label,
                    }) as string
                    : $t('Sent {nim} NIM', {
                        nim: amount.value / 1e5,
                    }) as string;

                // Close modal
                successCloseTimeout = window.setTimeout(() => {
                    if (statusType.value !== 'signing' || statusState.value !== State.SUCCESS) return;
                    modal$.value!.forceClose();
                }, SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                reportToSentry(error);

                // Show error screen
                statusType.value = 'signing';
                statusState.value = State.WARNING;
                statusTitle.value = $t('Something went wrong') as string;
                statusMessage.value = `${error.message} - ${error.data}`;
            }
        }

        function onStatusMainAction() {
            if (statusType.value === 'signing') {
                // Retry signing
                sign();
            } else {
                // Close SendModal and potentially go back to previous modal, which should be the QrScanner for GoCrypto
                back();
            }
        }

        function onStatusAlternativeAction() {
            statusType.value = 'none'; // hide StatusScreen
        }

        function onCloseOverlay() {
            contactListOpened.value = false;
            if (recipientDetailsOpened.value) {
                closeRecipientDetails();
            }
            addressListOpened.value = false;
            feeSelectionOpened.value = false;

            if (statusState.value !== State.WARNING) {
                // Do nothing when the loading or success status overlays are shown as they will be auto-closed.
                return;
            }
            if (statusType.value === 'go-crypto') {
                // Close SendModal and potentially go back to previous modal, which should be the QrScanner for GoCrypto
                back();
            } else {
                statusType.value = 'none'; // hide StatusScreen
            }
        }

        const router = useRouter();
        function back() {
            disableNextModalTransition();
            router.back();
        }

        let successCloseTimeout = 0;

        onBeforeUnmount(() => {
            clearTimeout(successCloseTimeout);
            clearTimeout(goCryptoMonitoringTimeout);
            clearInterval(goCryptoExpiriesUpdateInterval);
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
            gotRequestUriRecipient,
            gotRequestUriAmount,
            gotRequestUriMessage,
            parseRequestUri,
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
            goCryptoExpiryEarlyCountdown,
            goCryptoExpiryFinalCountdown,
            canSend,
            sign,
            isValidRecipient,
            // onboard,

            // DOM refs for autofocus
            addressInput$,
            labelInput$,
            amountInput$,

            // Status Screen
            statusType,
            statusState,
            statusTitle,
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
        Tooltip,
        InfoCircleSmallIcon,
        SendModalFooter,
        StatusScreen,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

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

        .address-display {
            padding: 0.5rem;
            margin-bottom: 4rem;

            ::v-deep .background {
                border-radius: 0.625rem;
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
            padding: 0 .5rem; // for fixing a visual glitch in iOS Safari 16.5 which cuts off the text
            font-weight: 600;
            color: var(--text-50);

            .fiat-amount,
            .amount {
                margin-left: -0.2em;
            }

            .expiry-countdown {
                font-variant-numeric: tabular-nums;

                &.same-line::before {
                    content: '\00B7 '; // &middot;
                }
                &:not(.same-line)::before {
                    content: '\000A'; // newline
                    white-space: pre-line;
                    line-height: 1.7;
                }

                .tooltip {
                    contain: layout; // avoid jumping of the UI when showing tooltip for first time
                    margin-bottom: -.25rem;
                }
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

    @media (max-width: $mobileBreakpoint) { // Full Mobile Breakpoint
        .status-screen {
            border-top-left-radius: 1.75rem;
            border-top-right-radius: 1.75rem;
        }
    }
}
</style>

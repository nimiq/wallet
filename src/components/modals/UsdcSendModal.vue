<template>
    <Modal :showOverlay="contactListOpened
        || recipientDetailsOpened
        || statusScreenOpened"
        @close-overlay="onCloseOverlay"
        class="send-modal"
        :class="{'value-masked': amountsHidden}"
        ref="modal$"
    >
        <div v-if="page === Pages.BEFORE_YOU_START" class="page flex-column" :key="Pages.BEFORE_YOU_START">
            <PageHeader :backArrow="!!$route.params.canUserGoBack" class="header__before-you-start" @back="back"/>
            <PageBody class="page__before-you-start flex-column">
                <StopSignIcon/>
                <h3 class="nq-h3">{{ $t('Before you start') }}</h3>
                <h1 class="nq-h1">{{ $t('The Nimiq Wallet uses Polygon USDC for speed and low fees.') }}</h1>
                <p class="nq-text nq-light-blue">
                    <AlertCircleIcon/>
                    {{ $t('Send to Polygon USDC addresses only!') }}
                </p>
                <p class="nq-text nq-orange">
                    <AlertTriangleIcon/>
                    {{ $t('Funds sent to non-Polygon USDC addresses could be permanently lost.') }}
                </p>
                <button class="nq-button light-blue" @click="page = Pages.RECIPIENT_INPUT" @mousedown.prevent>
                    {{ $t('Got it') }}
                </button>
            </PageBody>
        </div>

        <div v-if="page === Pages.RECIPIENT_INPUT" class="page flex-column" :key="Pages.RECIPIENT_INPUT">
            <PageHeader :backArrow="!!$route.params.canUserGoBack || page !== initialPage" @back="back">
                {{ $t('Send USDC') }}
            </PageHeader>
            <PageBody class="page__recipient-input flex-column">
                <UsdcContactShortcuts
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
                        :allowEthAddresses="true"
                        :allowNimiqAddresses="false"
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
            </PageBody>
            <PolygonWarningFooter level="info"/>
            <button class="reset scan-qr-button" @click="$router.push('/scan')">
                <ScanQrCodeIcon/>
            </button>
        </div>

        <div v-if="contactListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__contact-list">{{ $t('Choose a Recipient') }}</PageHeader>
            <PageBody class="page__contact-list">
                <UsdcContactBook @contact-selected="onContactSelected"/>
            </PageBody>
        </div>

        <div v-if="recipientDetailsOpened && recipientWithLabel" slot="overlay" class="page flex-column">
            <PageBody class="page__recipient-overlay flex-column">
                <Avatar :label="recipientWithLabel.label"/>
                <LabelInput
                    v-if="recipientWithLabel.type === RecipientType.CONTACT"
                    v-model="recipientWithLabel.label"
                    :placeholder="$t('Name this contact...')"
                    ref="labelInput$"/>
                <label v-else>{{ recipientWithLabel.label }}</label>
                <AddressDisplay :address="recipientWithLabel.address" format="ethereum" copyable/>
                <LongPressButton @long-press="recipientDetailsOpened = false; page = Pages.AMOUNT_INPUT">
                    {{ $t('Save and proceed') }}
                    <template #subline>{{ $t('Long press to confirm') }}</template>
                </LongPressButton>
            </PageBody>
            <PolygonWarningFooter level="warning"/>
        </div>

        <div
            v-if="page === Pages.AMOUNT_INPUT && recipientWithLabel" class="page flex-column"
            :key="Pages.AMOUNT_INPUT" @click="amountMenuOpened = false"
        >
            <PageHeader
                :backArrow="!!$route.params.canUserGoBack || page !== initialPage"
                @back="back"
            >{{ $t('Set Amount') }}</PageHeader>
            <PageBody class="page__amount-input flex-column">
                <section class="flex-row sender-recipient">
                    <UsdcAddressInfo
                        :address="addressInfo.address"
                    />
                    <div class="separator-wrapper">
                        <div class="separator"></div>
                    </div>
                    <UsdcAddressInfo
                        :address="recipientWithLabel.address"
                        :label="recipientWithLabel.label"
                        tooltipPosition="bottom left"
                        :editable="recipientWithLabel.type === RecipientType.CONTACT"
                    />
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
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== 'usdc'}">
                        <AmountInput v-if="activeCurrency === 'usdc'"
                            v-model="amount" :decimals="6" ref="amountInput$"
                        >
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                currency="usdc"
                                :activeCurrency="activeCurrency"
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
                                currency="usdc"
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
                        <span v-if="activeCurrency === 'usdc'" key="fiat-amount">
                            <FiatConvertedAmount :data-amount="amount" :amount="amount" currency="usdc"/>
                            <svg class="dot" viewBox="0 0 3 3"
                                xmlns="http://www.w3.org/2000/svg">
                                <circle data-v-3d79c726="" cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
                            </svg>
                            <template v-if="feeLoading">
                                <CircleSpinner />
                            </template>
                            <template v-else>
                                <i18n v-if="feeSmallerThanSmUnit" tag="span" path="< {amount} fee" class="fee">
                                    <template #amount>
                                        <FiatAmount :amount="fiatSmUnit"
                                            :hideDecimals="false" :currency="fiatCurrency"/>
                                    </template>
                                </i18n>
                                <i18n v-else tag="span" path="{amount} fee" class="fee">
                                    <template #amount>
                                        <FiatAmount :amount="roundedUpFiatFee"
                                            :hideDecimals="false" :currency="fiatCurrency"/>
                                    </template>
                                </i18n>
                            </template>
                        </span>
                        <div v-else key="usdc-amount" class="usdc-amount">
                            <span>
                                {{ $t('You will send {amount} USDC', { amount: amount / 1e6 }) }}
                            </span>
                            <div>
                                <template v-if="feeLoading">
                                    <CircleSpinner />
                                </template>
                                <template v-else>
                                    <i18n v-if="feeSmallerThanSmUnit" tag="span" path="< {amount} fee" class="fee">
                                        <template #amount>
                                            <FiatAmount :amount="fiatSmUnit"
                                                :hideDecimals="false" :currency="fiatCurrency"/>
                                        </template>
                                    </i18n>
                                    <i18n v-else tag="span" path="{amount} fee" class="fee">
                                        <template #amount>
                                            <FiatAmount :amount="roundedUpFiatFee"
                                                :hideDecimals="false" :currency="fiatCurrency"/>
                                        </template>
                                    </i18n>
                                </template>
                            </div>
                        </div>
                    </span>
                    <span v-else class="insufficient-balance-warning nq-orange" key="insufficient">
                        {{ $t('Insufficient balance.') }}
                        <a class="send-all" @click="sendMax">
                            {{ $t('Send all') }}
                        </a>
                    </span>
                </section>

                <button
                    class="nq-button light-blue"
                    :disabled="!canSend"
                    @click="sign"
                    @mousedown.prevent
                >{{ $t('Send USDC') }}</button>
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
import { calculateFee } from '@/ethers';
import { RelayServerInfo } from '@/lib/usdc/OpenGSN';
import { CurrencyInfo, parseRequestLink } from '@nimiq/utils';
import {
    AddressDisplay,
    AddressInput,
    LabelInput,
    LongPressButton,
    PageHeader,
    PageBody,
    AlertCircleIcon,
    AlertTriangleIcon,
    ScanQrCodeIcon,
    FiatAmount,
    CircleSpinner,
} from '@nimiq/vue-components';
import { captureException } from '@sentry/vue';
import { computed, defineComponent, onBeforeUnmount, ref, Ref, watch } from '@vue/composition-api';
import { utils } from 'ethers';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';
import { sendUsdcTransaction } from '../../hub';
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCY_DENYLIST } from '../../lib/Constants';
import {
    isValidDomain as isValidUnstoppableDomain,
    resolve as resolveUnstoppableDomain,
} from '../../lib/UnstoppableDomains';
import { useAccountStore } from '../../stores/Account';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { useUsdcContactsStore } from '../../stores/UsdcContacts';
import { useUsdcNetworkStore } from '../../stores/UsdcNetwork';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import StopSignIcon from '../icons/StopSignIcon.vue';
import PolygonWarningFooter from '../PolygonWarningFooter.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import Avatar from '../Avatar.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import UsdcAddressInfo from '../UsdcAddressInfo.vue';
import UsdcContactBook from '../UsdcContactBook.vue';
import UsdcContactShortcuts from '../UsdcContactShortcuts.vue';
import Modal, { disableNextModalTransition } from './Modal.vue';

export enum RecipientType {
    CONTACT,
    OWN_ADDRESS,
    GLOBAL_ADDRESS,
}

export default defineComponent({
    name: 'usdc-send-modal',
    props: {
        requestUri: {
            type: String,
            required: false,
        },
    },
    setup(props, context) {
        enum Pages {
            BEFORE_YOU_START,
            RECIPIENT_INPUT,
            AMOUNT_INPUT,
        }

        const modal$ = ref<any | null>(null);

        const { state: addresses$, addressInfo } = useUsdcAddressStore();
        const { state: transactions$ } = useUsdcTransactionsStore();
        const { contactsArray: contacts, setContact, getLabel } = useUsdcContactsStore();
        const { state: network$ } = useUsdcNetworkStore();
        const { config } = useConfig();

        // These are non-reactive because we're only interested in whether the user had ever sent USDC when the modal
        // was initially opened.
        const normalizedUserAddresses = Object.values(addresses$.addressInfos)
            .map(({ address }) => address.toLowerCase());
        const hasEverSentUsdc = Object.values(transactions$.transactions)
            .some(({ sender }) => normalizedUserAddresses.includes(sender.toLowerCase()));
        const page = ref(hasEverSentUsdc ? Pages.RECIPIENT_INPUT : Pages.BEFORE_YOU_START);

        const recipientDetailsOpened = ref(false);
        const recipientWithLabel = ref<{address: string, label: string, type: RecipientType} | null>(null);

        function saveRecipientLabel() {
            if (!recipientWithLabel.value || recipientWithLabel.value.type !== RecipientType.CONTACT) return;
            setContact(recipientWithLabel.value.address, recipientWithLabel.value.label);
        }

        const recentContacts = computed(() => contacts.value.slice(0, 3));
        const hasOwnAddresses = computed(() => Object.keys(addresses$.addressInfos).length - 1 > 0);

        const contactListOpened = ref(false);
        function onContactSelected(contact: {address: string, label: string}, type = RecipientType.CONTACT) {
            recipientWithLabel.value = {
                address: contact.address,
                label: contact.label,
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
                const ticker = 'USDC';
                resolveUnstoppableDomain(domain, ticker)
                    .then(async (resolvedAddress) => {
                        if (resolvedAddress && utils.isAddress(resolvedAddress)) {
                            const formattedAddress = utils.getAddress(resolvedAddress);
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
            const ownAccountLabel = Object.values(useAccountStore().accountInfos.value).find(
                (ai) => ai.polygonAddresses?.includes(address),
            )?.label || '';

            if (ownedAddressInfo) {
                label = ownAccountLabel;
                type = RecipientType.OWN_ADDRESS;
            }

            // Search contacts
            if (getLabel.value(address)) {
                label = getLabel.value(address)!;
                type = RecipientType.CONTACT;
            }

            recipientWithLabel.value = { address, label, type };
            if (label || skipRecipientDetails) {
                // Go directly to the next screen
                page.value = Pages.AMOUNT_INPUT;
            } else {
                recipientDetailsOpened.value = true;
            }
        }

        const isValidRecipient = computed(() => recipientWithLabel.value?.address !== addressInfo.value?.address);

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

        const amount = ref(0);
        const fee = ref<number>(0);
        const feeLoading = ref(true);

        const relay = ref<RelayServerInfo | null>(null);

        const maxSendableAmount = computed(() => Math.max((addressInfo.value!.balance || 0) - fee.value, 0));

        const amountMenuOpened = ref(false);

        const activeCurrency = ref('usdc' as CryptoCurrency.USDC | FiatCurrency);
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency
                && !FIAT_CURRENCY_DENYLIST.includes(fiat.toUpperCase())));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === 'usdc') {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToUsdcDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals / 1e6);

        watch(activeCurrency, (currency) => {
            if (currency === 'usdc') {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.usdc[currency]! * fiatToUsdcDecimalRatio.value;
        });

        watch(() => {
            if (activeCurrency.value === 'usdc') return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.usdc[activeCurrency.value]!
                / fiatToUsdcDecimalRatio.value);
        });

        async function sendMax() {
            if (activeCurrency.value !== 'usdc') {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.usdc[activeCurrency.value]!
                    * fiatToUsdcDecimalRatio.value;
            }
            // Need to wait here for the next processing tick, as otherwise we would have a
            // race condition between the amount assignment and the fiatAmount watcher.
            await context.root.$nextTick();
            amount.value = maxSendableAmount.value;
        }

        const hasHeight = computed(() => !!network$.height);

        const canSend = computed(() =>
            network$.consensus === 'established'
            && hasHeight.value
            && !!amount.value
            && amount.value <= maxSendableAmount.value);

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

                // if (parsedRequestLink.message) {
                //     message.value = parsedRequestLink.message;
                // }
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

        const addressInput$: Ref<AddressInput | null> = ref(null);
        const labelInput$: Ref<LabelInput | null> = ref(null);
        const amountInput$: Ref<AmountInput | null> = ref(null);
        // const messageInput$: Ref<LabelInput | null> = ref(null);

        const { isMobile } = useWindowSize();

        async function focus(elementRef: Ref<AddressInput | LabelInput | AmountInput | null>) {
            // TODO: Detect onscreen keyboards instead?
            if (isMobile.value) return;

            await context.root.$nextTick();
            if (!elementRef.value) return;
            elementRef.value.focus();
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
        const statusTitle = ref(context.root.$t('Sending Transaction') as string);
        const statusState = ref(State.LOADING);
        const statusMessage = ref('');
        const statusMainActionText = ref(context.root.$t('Retry') as string);
        const statusAlternativeActionText = ref(context.root.$t('Edit transaction') as string);

        async function sign() {
            if (!canSend.value) return;

            // Show loading screen
            statusScreenOpened.value = true;
            statusState.value = State.LOADING;

            try {
                const tx = await sendUsdcTransaction(
                    recipientWithLabel.value!.address,
                    amount.value,
                    recipientWithLabel.value!.label,
                    relay.value || undefined,
                );

                if (!tx) {
                    statusScreenOpened.value = false;
                    return;
                }

                saveRecipientLabel();

                useUsdcTransactionsStore().addTransactions([tx]);

                // Show success screen
                statusState.value = State.SUCCESS;
                statusTitle.value = recipientWithLabel.value!.label
                    ? context.root.$t('Sent {usdc} USDC to {name}', {
                        usdc: amount.value / 1e6,
                        name: recipientWithLabel.value!.label,
                    }) as string
                    : context.root.$t('Sent {usdc} USDC', {
                        usdc: amount.value / 1e6,
                    }) as string;

                // Close modal
                successCloseTimeout = window.setTimeout(() => modal$.value!.forceClose(), SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

                // Show error screen
                statusState.value = State.WARNING;
                statusTitle.value = context.root.$t('Something went wrong') as string;
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

            // Do nothing when the success status overlay is shown, it will be closed by successCloseTimeout
        }

        const { amountsHidden } = useSettingsStore();

        function back() {
            if (page.value === initialPage) {
                disableNextModalTransition();
                context.root.$router.back();
            } else if (page.value === Pages.RECIPIENT_INPUT) {
                page.value = Pages.BEFORE_YOU_START;
            } else if (page.value === Pages.AMOUNT_INPUT) {
                page.value = Pages.RECIPIENT_INPUT;
                resetRecipient();
            }
        }

        let successCloseTimeout = 0;

        onBeforeUnmount(() => {
            window.clearTimeout(successCloseTimeout);
        });

        async function setFeeInformation() {
            const feeInformation = await calculateFee('transferWithApproval', relay.value || undefined);
            fee.value = Math.max(feeInformation.fee.toNumber(), 0.01);
            relay.value = feeInformation.relay;
            feeLoading.value = false;
        }

        let feeIntervalId = -1;

        // USDC fee does not depend on the amount, therefore it is not reactive to amount
        watch(statusScreenOpened, async (statusScreenOpen) => {
            if (!statusScreenOpen) {
                setFeeInformation();
                feeIntervalId = window.setInterval(setFeeInformation, 20e3); // 20 seconds
            } else {
                window.clearInterval(feeIntervalId);
                feeIntervalId = -1;
            }
        });

        onBeforeUnmount(() => {
            window.clearInterval(feeIntervalId);
        });

        const fiatSmUnit = computed(() => {
            const currencyInfo = new CurrencyInfo(fiat$.currency);
            return 1 / 10 ** currencyInfo.decimals;
        });

        const feeInFiat = computed(() => {
            const exchangeRate = fiat$.exchangeRates.usdc[fiat$.currency]!;
            return (fee.value / 1e6) * exchangeRate;
        });

        const roundedUpFiatFee = computed(() =>
            Math.ceil(feeInFiat.value / fiatSmUnit.value) * fiatSmUnit.value);

        const feeSmallerThanSmUnit = computed(() => roundedUpFiatFee.value <= fiatSmUnit.value);

        const initialPage = page.value;

        return {
            // General
            Pages,
            RecipientType,
            page,
            initialPage,
            modal$,

            // Recipient Input
            recentContacts,
            hasOwnAddresses,
            contactListOpened,
            onContactSelected,
            addressInputValue,
            onAddressEntered,
            recipientDetailsOpened,
            recipientWithLabel,
            closeRecipientDetails,
            parseRequestUri,
            amountsHidden,
            isDomain,
            isResolvingUnstoppableDomain,
            resolverError,
            setContact,

            // Amount Input
            resetRecipient,
            addressInfo,
            amount,
            fee,
            feeLoading,
            roundedUpFiatFee,
            feeSmallerThanSmUnit,
            fiatSmUnit,
            maxSendableAmount,
            amountMenuOpened,
            activeCurrency,
            fiatAmount,
            fiatCurrencyInfo,
            sendMax,
            fiatCurrency: fiat$.currency,
            otherFiatCurrencies,
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
        UsdcContactShortcuts,
        UsdcContactBook,
        StopSignIcon,
        PolygonWarningFooter,
        AlertCircleIcon,
        AlertTriangleIcon,
        AddressInput,
        ScanQrCodeIcon,
        LabelInput,
        LongPressButton,
        AddressDisplay,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
        StatusScreen,
        Avatar,
        UsdcAddressInfo,
        FiatAmount,
        CircleSpinner,
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

    .header__before-you-start ::v-deep .page-header-back-button {
        z-index: 1; // make back arrow accessible over page body
    }

    .page__before-you-start {
        padding-top: 0;
        margin-top: -3rem;

        .nq-h3 {
            margin-top: 4.125rem;
            margin-bottom: 1.5rem;
            font-size: var(--small-size);
            font-weight: 600;
            line-height: 1;
            letter-spacing: 0.1875rem;
            text-transform: uppercase;
            color: var(--text-60);
        }

        .nq-h1 {
            max-width: 41.25rem;
            margin-top: 0;
            margin-bottom: 2rem;
            line-height: 1.3;
            text-align: center;
        }

        .nq-text {
            padding: 2rem;
            margin: 0;
            border: 1px solid var(--text-16);
            align-self: stretch;
            letter-spacing: .1px;

            &:first-of-type {
                margin-top: auto;
                border-bottom: none;
                border-top-left-radius: 1.5rem;
                border-top-right-radius: 1.5rem;
            }

            &:last-of-type {
                margin-bottom: auto;
                border-bottom-left-radius: 1.5rem;
                border-bottom-right-radius: 1.5rem;
            }

            .nq-icon {
                display: inline-block;
                margin-bottom: .5rem;
                margin-right: .375rem;
                vertical-align: middle;
            }
        }

        .nq-button {
            margin-top: 3rem;
        }
    }

    .header__contact-list {
        padding-bottom: 1.5rem;
    }

    .page__recipient-input,
    .page__contact-list,
    .page__amount-input {
        // 0.375rem to get the distance between the heading and .contact-selection to exact 40px
        padding: 0.375rem 3rem 3rem;
    }

    .page__contact-list {
        padding-right: 0;
        padding-left: 0;
        min-height: 0;
    }

    .page__amount-input {
        padding-bottom: 4rem;

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
        margin: 4rem 0 8rem;

        .nq-label {
            margin: 0;
        }

        .address-input {
            margin-top: 2.25rem;
        }

        .notice {
            margin-top: -3.5rem;
            transition: opacity 0.3s var(--nimiq-ease), margin-top 0.3s var(--nimiq-ease);

            &.resolving {
                font-size: var(--small-size);
                font-weight: 600;
                opacity: 0.5 !important;
            }
        }

        .address-input.is-domain ~ .notice {
            margin-top: 1rem;
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

    .page__recipient-overlay {
        padding-top: 7rem;
        padding-bottom: 2rem;
        justify-content: flex-start;

        .avatar {
            width: 16rem;
            height: 16rem;
            margin-top: auto;
            font-size: 6.75rem;
        }

        .label-input,
        label {
            font-size: var(--h1-size);
            font-weight: 600;
            margin: 3rem 0 2.5rem;
            flex-shrink: 0;
        }

        label {
            line-height: 6.25rem; // Same height as the LabelInput
        }

        .address-display {
            padding: 0.5rem;
            margin-bottom: 3.5rem;

            ::v-deep .background {
                border-radius: 0.625rem;
            }

            ::v-deep .chunk {
                margin: .75rem 0;
            }
        }

        .long-press-button {
            margin-top: auto;
            flex-shrink: 0;
        }

        & + .polygon-warning-footer {
            padding-bottom: 2rem;
        }
    }

    .sender-recipient {
        justify-content: center;
        align-items: center;
        align-self: stretch;
        margin-bottom: 3.5rem;
        padding: 0 3.5rem;

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

            .fiat-amount,
            .amount {
                margin-left: -0.2em;
            }

            [data-amount]:not([data-amount="0"])::before {
                content: "~";
            }

            & ::v-deep .circle-spinner {
                width: 13px;
                margin-bottom: -3px;
                margin-left: 3px;
            }

            & > .usdc-amount > span,
            & > .usdc-amount .fee,
            & > span > * {
                opacity: 0.5;
            }

            .usdc-amount {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .dot {
                position: relative;
                width: 3px;
                bottom: 3px;
                margin-left: 8px;
                margin-right: 8px;
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

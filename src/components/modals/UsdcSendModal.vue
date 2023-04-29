<template>
    <Modal :showOverlay="contactListOpened
        || recipientDetailsOpened
        || statusScreenOpened"
        @close-overlay="onCloseOverlay"
        class="send-modal"
        :class="{'value-masked': amountsHidden}"
        ref="modal$"
    >
        <PolygonWarningPage v-if="page === Pages.WARNING"
            type="sending"
            :canGoBack="!!$route.params.canUserGoBack"
            :key="Pages.WARNING"
            @back="back"
            @continue="page = Pages.RECIPIENT_INPUT"
        />

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
                        :allowNimAddresses="false"
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
            <PolygonWarningFooter type="sending" level="info"/>
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
            <PolygonWarningFooter type="sending" level="warning"/>
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
                    <div class="flex-row amount-row" :class="{'estimate': activeCurrency !== CryptoCurrency.USDC}">
                        <AmountInput v-if="activeCurrency === CryptoCurrency.USDC"
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
                        <span v-if="activeCurrency === CryptoCurrency.USDC" key="fiat-amount">
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
            </PageBody>
            <SendModalFooter
                :assets="[CryptoCurrency.USDC]"
                :disabled="!canSend"
                :error="feeError"
                @click="sign"
            ><template #cta>{{ $t('Send USDC') }}</template></SendModalFooter>
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
import { CurrencyInfo } from '@nimiq/utils';
import {
    AddressDisplay,
    AddressInput,
    LabelInput,
    LongPressButton,
    PageHeader,
    PageBody,
    ScanQrCodeIcon,
    FiatAmount,
    CircleSpinner,
} from '@nimiq/vue-components';
import { captureException } from '@sentry/vue';
import { computed, defineComponent, onBeforeUnmount, ref, Ref, watch } from '@vue/composition-api';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';
import { sendUsdcTransaction } from '../../hub';
import { getPolygonClient, calculateFee } from '../../ethers';
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCY_DENYLIST } from '../../lib/Constants';
import type { RelayServerInfo } from '../../lib/usdc/OpenGSN';
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
import PolygonWarningPage from '../PolygonWarningPage.vue';
import PolygonWarningFooter from '../PolygonWarningFooter.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import Avatar from '../Avatar.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SendModalFooter from '../SendModalFooter.vue';
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
            WARNING,
            RECIPIENT_INPUT,
            AMOUNT_INPUT,
        }

        const modal$ = ref<Modal>(null);

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
        const page = ref(hasEverSentUsdc ? Pages.RECIPIENT_INPUT : Pages.WARNING);

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
        watch(addressInputValue, async (address) => {
            resolverError.value = '';

            // Detect unstoppable domains
            if (isValidUnstoppableDomain(address)) {
                isResolvingUnstoppableDomain.value = true;
                const domain = address;
                const ticker = 'USDC';
                try {
                    const [resolvedAddress, { ethers }] = await Promise.all([
                        resolveUnstoppableDomain(domain, ticker),
                        getPolygonClient(),
                    ]);
                    if (resolvedAddress && ethers.utils.isAddress(resolvedAddress)) {
                        onAddressEntered(resolvedAddress, domain);
                    } else {
                        resolverError.value = context.root.$t('Domain does not resolve to a valid address') as string;
                    }
                } catch (error) {
                    console.debug(error); // eslint-disable-line no-console
                    resolverError.value = (error instanceof Error ? error.message : String(error))
                        .replace(`crypto.${ticker}.address record`, `${ticker} address`);
                } finally {
                    isResolvingUnstoppableDomain.value = false;
                }
            }
        });

        async function onAddressEntered(address: string, fallbackLabel = '') {
            // Normalize address to checksummed version
            const { ethers } = await getPolygonClient();
            address = ethers.utils.getAddress(address);

            // Find label across contacts, own addresses
            let label = fallbackLabel;
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
            const contactLabel = getLabel.value(address);
            if (contactLabel) {
                label = contactLabel;
                type = RecipientType.CONTACT;
            }

            recipientWithLabel.value = { address, label, type };
            if (ownedAddressInfo || contactLabel) {
                // Go directly to the next screen
                page.value = Pages.AMOUNT_INPUT;
            } else {
                // Show recipient details with polygon warnings.
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
        const feeLoading = ref(true); // Only true for first fee loading, not for updates.
        const feeError = ref<string>(null);

        const relay = ref<RelayServerInfo | null>(null);

        // Use 2.00 USDC as safe fallback fee
        const maxSendableAmount = computed(() => Math.max((addressInfo.value!.balance || 0) - (fee.value || 2e6), 0));

        const amountMenuOpened = ref(false);

        const activeCurrency = ref<CryptoCurrency.USDC | FiatCurrency>(CryptoCurrency.USDC);
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency
                && !FIAT_CURRENCY_DENYLIST.includes(fiat.toUpperCase())));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === CryptoCurrency.USDC) {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToUsdcDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals / 1e6);

        watch(activeCurrency, (currency) => {
            if (currency === CryptoCurrency.USDC) {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value * fiat$.exchangeRates.usdc[currency]! * fiatToUsdcDecimalRatio.value;
        });

        watch(() => {
            if (activeCurrency.value === CryptoCurrency.USDC) return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value.usdc[activeCurrency.value]!
                / fiatToUsdcDecimalRatio.value);
        });

        async function sendMax() {
            if (activeCurrency.value !== CryptoCurrency.USDC) {
                fiatAmount.value = maxSendableAmount.value
                    * fiat$.exchangeRates.usdc[activeCurrency.value]!
                    * fiatToUsdcDecimalRatio.value;
            }
            // Need to wait here for the next processing tick, as otherwise we would have a
            // race condition between the amount assignment and the fiatAmount watcher.
            await context.root.$nextTick();
            amount.value = maxSendableAmount.value;
        }

        const canSend = computed(() =>
            network$.consensus === 'established'
            && !!amount.value
            && amount.value <= maxSendableAmount.value
            && !feeLoading.value
            && !feeError.value,
        );

        async function parseRequestUri(uri: string, event?: ClipboardEvent) {
            // For now only plain USDC/Polygon/ETH addresses are supported.
            // TODO support Polygon-USDC request links and even consider removing scanning of plain addresses
            //  due to the risk of USDC being sent on the wrong chain.
            uri = uri.replace(`${window.location.origin}/`, '')
                .replace('polygon:', '');
            const { ethers } = await getPolygonClient();
            if (ethers.utils.isAddress(uri)) {
                if (event) {
                    // Prevent paste event being applied to the recipient label field, that now became focussed.
                    event.preventDefault();
                }

                onAddressEntered(uri);
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

        let successCloseTimeout = 0;

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
                page.value = Pages.WARNING;
            } else if (page.value === Pages.AMOUNT_INPUT) {
                page.value = Pages.RECIPIENT_INPUT;
                resetRecipient();
            }
        }

        let feeUpdateTimeout = -1; // -1: stopped; 0: to be started; >0: timer id
        async function startFeeUpdates() {
            window.clearTimeout(feeUpdateTimeout); // Reset potentially existing update timeout.
            feeUpdateTimeout = 0; // 0: timer is to be started after the initial update
            try {
                const feeInformation = await calculateFee('transferWithApproval', relay.value || undefined);
                fee.value = Math.max(feeInformation.fee.toNumber(), 0.01);
                relay.value = feeInformation.relay;
                feeLoading.value = false;
                feeError.value = null;
                if (feeUpdateTimeout === 0) {
                    // Schedule next update in 20s if timer is still to be started and has not been started yet.
                    feeUpdateTimeout = window.setTimeout(startFeeUpdates, 20e3);
                }
            } catch (e: unknown) {
                feeError.value = context.root.$t(
                    'Failed to fetch USDC fees. Retrying... (Error: {message})',
                    { message: e instanceof Error ? e.message : String(e) },
                ) as string;
                if (feeUpdateTimeout === 0) {
                    // Retry in 10s if timer is still to be started and has not been started yet.
                    feeUpdateTimeout = window.setTimeout(startFeeUpdates, 10e3);
                }
            }
        }

        function stopFeeUpdates() {
            window.clearTimeout(feeUpdateTimeout);
            feeUpdateTimeout = -1; // -1: timer stopped
            feeError.value = null;
        }

        // USDC fee does not depend on the amount, therefore it is not reactive to amount
        watch(statusScreenOpened, (statusScreenOpen) => {
            if (!statusScreenOpen) {
                startFeeUpdates();
            } else if (!feeError.value) {
                // Avoid changing the fees while signing.
                stopFeeUpdates();
            }
        });

        onBeforeUnmount(() => {
            stopFeeUpdates();
            window.clearTimeout(successCloseTimeout);
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
            CryptoCurrency,
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
            feeLoading,
            feeError,
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
        PolygonWarningPage,
        UsdcContactShortcuts,
        UsdcContactBook,
        PolygonWarningFooter,
        AddressInput,
        ScanQrCodeIcon,
        LabelInput,
        LongPressButton,
        AddressDisplay,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
        SendModalFooter,
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

    .header__contact-list {
        padding-bottom: 1.5rem;
    }

    .page__contact-list {
        padding-right: 0;
        padding-left: 0;
        min-height: 0;
    }

    .page__amount-input {
        padding-bottom: 4.5rem;

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

    .send-modal-footer {
        padding: 0 3rem 2rem;

        @media (max-width: 450px) { // Breakpoint of .page-body padding
            padding: .75rem 1rem 2rem;
        }

        ::v-deep .footer-notice {
            margin-bottom: -1rem;
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

<template>
    <Modal :showOverlay="contactListOpened
        || recipientDetailsOpened
        || feeSelectionOpened
        || statusScreenOpened"
        @close-overlay="onCloseOverlay"
        class="send-modal"
        :class="{'value-masked': amountsHidden}"
        ref="$modal"
    >
        <div v-if="page === Pages.RECIPIENT_INPUT" class="page flex-column" :key="Pages.RECIPIENT_INPUT">
            <PageHeader :backArrow="!!$route.params.canUserGoBack" @back="back">
                {{ $t('Send Transaction') }}
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
                        ref="addressInputRef"/>
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
                <button class="reset scan-qr-button" @click="$router.push('/scan')">
                    <ScanQrCodeIcon/>
                </button>
            </PageBody>
        </div>

        <div v-if="contactListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__contact-list">{{ $t('Choose a Recipient') }}</PageHeader>
            <PageBody class="page__contact-list">
                <UsdcContactBook @contact-selected="onContactSelected"/>
            </PageBody>
        </div>

        <div v-if="recipientDetailsOpened && recipientWithLabel" slot="overlay" class="page flex-column">
            <PageBody class="page__recipient-overlay recipient-overlay flex-column">
                <div class="spacing-top"></div>
                <div class="flex-grow"></div>
                <Avatar :label="recipientWithLabel.label"/>
                <LabelInput
                    v-if="recipientWithLabel.type === RecipientType.CONTACT"
                    v-model="recipientWithLabel.label"
                    :placeholder="$t('Name this contact...')"
                    ref="labelInputRef"/>
                <label v-else>{{ recipientWithLabel.label }}</label>
                <AddressDisplay :address="recipientWithLabel.address" format="ethereum" copyable/>
                <div class="flex-grow"></div>
                <button
                    class="nq-button light-blue"
                    @click="recipientDetailsOpened = false; page = Pages.AMOUNT_INPUT;"
                    @mousedown.prevent
                >
                    <template v-if="amount > 0">{{ $t('Continue') }}</template>
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
                            v-model="amount" :decimals="6" ref="amountInputRef"
                        >
                            <AmountMenu slot="suffix" class="ticker"
                                :open="amountMenuOpened"
                                currency="usdc"
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
                                currency="usdc"
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
                        <span v-if="activeCurrency === 'usdc'" key="fiat-amount">
                            {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="amount" currency="usdc"/>
                            <!-- <span v-if="fee">
                                +<Amount :amount="fee"
                                    currency="usdc" :currencyDecimals="6"
                                    :minDecimals="0" :maxDecimals="6"
                                /> {{ $t('fee') }}
                            </span> -->
                        </span>
                        <span v-else key="usdc-amount">
                            {{ $t('You will send {amount} USDC', { amount: amount / 1e6 }) }}
                        </span>
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
                >{{ $t('Send Transaction') }}</button>
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
                <!-- <Amount :amount="fee" currency="usdc" :currencyDecimals="6" :minDecimals="0" :maxDecimals="6"/> -->
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
    LabelInput,
    AddressDisplay,
    SelectBar,
    // Amount,
} from '@nimiq/vue-components';
import { parseRequestLink, CurrencyInfo } from '@nimiq/utils';
import { utils } from 'ethers';
import { captureException } from '@sentry/vue';
import Config from 'config';
import Modal, { disableNextModalTransition } from './Modal.vue';
import UsdcContactShortcuts from '../UsdcContactShortcuts.vue';
import UsdcContactBook from '../UsdcContactBook.vue';
import AmountInput from '../AmountInput.vue';
import AmountMenu from '../AmountMenu.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useUsdcContactsStore } from '../../stores/UsdcContacts';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { useUsdcNetworkStore } from '../../stores/UsdcNetwork';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCY_DENYLIST } from '../../lib/Constants';
import { sendUsdcTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import { i18n } from '../../i18n/i18n-setup';
import {
    isValidDomain as isValidUnstoppableDomain,
    resolve as resolveUnstoppableDomain,
} from '../../lib/UnstoppableDomains';
import { useAccountStore } from '../../stores/Account';
import { useUsdcTransactionsStore } from '../../stores/UsdcTransactions';
import Avatar from '../Avatar.vue';
import UsdcAddressInfo from '../UsdcAddressInfo.vue';

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
            RECIPIENT_INPUT,
            AMOUNT_INPUT,
        }
        const page = ref(Pages.RECIPIENT_INPUT);

        const $modal = ref<any | null>(null);

        const { state: addresses$, addressInfo } = useUsdcAddressStore();
        const { contactsArray: contacts, setContact, getLabel } = useUsdcContactsStore();
        const { state: network$ } = useUsdcNetworkStore();

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
                (ai) => ai.polygonAddresses.includes(address),
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
        const feePerByte = ref(0);
        // const message = ref('');

        // const fee = computed(() => feePerByte.value * 138);

        const maxSendableAmount = computed(() => Math.max((addressInfo.value!.balance || 0) /* - fee.value */, 0));

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

                // if (parsedRequestLink.message) {
                //     message.value = parsedRequestLink.message;
                // }

                gotValidRequestUri.value = true;
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
        // const messageInputRef: Ref<LabelInput | null> = ref(null);

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
                    // relay, // TODO: Pass relay that was retrieved when fee was calculated
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
                successCloseTimeout = window.setTimeout(() => $modal.value!.forceClose(), SUCCESS_REDIRECT_DELAY);
            } catch (error: any) {
                if (Config.reportToSentry) captureException(error);
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
            page,
            $modal,

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
            gotValidRequestUri,
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
            feePerByte,
            // fee,
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
            canSend,
            sign,
            isValidRecipient,
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
        AddressInput,
        ScanQrCodeIcon,
        LabelInput,
        AddressDisplay,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
        SelectBar,
        // Amount,
        StatusScreen,
        Avatar,
        UsdcAddressInfo,
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

    .header__contact-list {
        padding-bottom: 1.5rem;
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
        margin: 4rem 0;

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

    .recipient-overlay {
        justify-content: flex-start;

        .spacing-top {
            height: 1.5rem;
        }

        .avatar {
            width: 16rem;
            height: 16rem;
            font-size: 6.75rem;
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
            margin-bottom: 4rem;

            ::v-deep .background {
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

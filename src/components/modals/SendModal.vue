<template>
    <Modal :showOverlay="contactListOpened || recipientDetailsOpened">
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
                <button class="reset scan-qr-button">
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

        <div v-if="page === Pages.AMOUNT_INPUT" class="page flex-column" :key="Pages.AMOUNT_INPUT">
            <PageHeader
                :backArrow="true"
                @back="page = Pages.RECIPIENT_INPUT; resetRecipient();"
            >{{ $t('Set Amount') }}</PageHeader>
            <PageBody class="page__amount-input flex-column">
                <section class="identicon-section flex-row">
                    <button class="reset identicon-stack flex-column">
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

                <section class="amount-section">
                    <AmountInput v-model="amount"/>
                    <span class="secondary-amount">
                        {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="amount"/>
                    </span>
                </section>

                <section class="message-section">
                    <LabelInput v-model="message" :placeholder="$t('Add a public message...')" vanishing/>
                </section>

                <button
                    class="nq-button light-blue"
                    :disabled="!hasHeight || !amount"
                    @click="sign"
                >{{ $t('Send Transaction') }}</button>
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
} from '@nimiq/vue-components';
import { parseRequestLink, AddressBook } from '@nimiq/utils';
import Modal from './Modal.vue';
import ContactShortcuts from '../ContactShortcuts.vue';
import IdenticonButton from '../IdenticonButton.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import { useContactsStore } from '../../stores/Contacts';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { onboard, sendTransaction, createCashlink } from '../../hub';

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
            recipientDetailsOpened.value = true;
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
            recipientDetailsOpened.value = true;
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


        const amount = ref(0);
        const fee = ref(0);
        const message = ref('');

        const hasHeight = computed(() => !!network$.height);

        // if (props.requestUri) {
        //     const parsedRequestLink = parseRequestLink(props.requestUri, window.location.origin, true);
        //     if (parsedRequestLink) {
        //         let recipient: string | undefined;
        //         ({ recipient, amount: amount.value, message: message.value } = parsedRequestLink);
        //         if (recipient) {
        //             recipientWithLabel.value = {
        //                 address: recipient,
        //                 label: Object.values(addresses$.addressInfos)
        //                     .find((addressInfo) => addressInfo.address === recipient)?.label
        //                     || getLabel.value(recipient)
        //                     || '',
        //             };
        //         }
        //     }
        // }

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
            amount,
            fee,
            message,
            hasHeight,
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
        AmountInput,
        FiatConvertedAmount,
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

    .page__amount-input {
        padding-bottom: 4rem;
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

    .amount-section {
        text-align: center;
        align-self: stretch;

        .amount-input {
            margin-bottom: 1rem;

            /deep/ input {
                padding-top: 0;
                padding-bottom: 0;
                // height: 8.75rem; // 70px
            }
        }

        .secondary-amount {
            font-weight: 600;
            opacity: 0.5;
        }
    }

    .message-section {
        .label-input {
            font-size: 2.5rem;
        }
    }
</style>

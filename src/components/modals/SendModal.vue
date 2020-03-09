<template>
    <Modal>
        <div class="send-modal">
            <SendTx
                :addresses="addresses"
                :contacts="contactsArray"
                :wallet="walletInfo"
                :sender="sender"
                :validityStartHeight="height"
                :recipient="recipientWithLabel"
                :value="amount || undefined"
                :message="message || undefined"
                @send-tx="sendTx"
                @contact-added="addContact"
                @create-cashlink="()=>{}"
                @login="onboard"
                @scan-qr="$router.replace('/scan').catch((err)=>{})" />
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed, ref, Ref } from '@vue/composition-api';
import { PageBody, PageHeader, SmallPage, SendTx } from '@nimiq/vue-components';
import { parseRequestLink } from '@nimiq/utils';
import Modal from './Modal.vue';
import { useAccountStore } from '../../stores/Account';
import { useContactsStore } from '../../stores/Contacts';
import { useAddressStore, AddressType, AddressInfo, ContractAddressInfo } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { onboard, sendTransaction } from '../../hub';
import { useRouter } from '../../router';

export default defineComponent({
    name: 'send-modal',
    props: {
        senderAddress: {
            type: String,
            required: false,
        },
        requestUri: {
            type: String,
            required: false,
        },
    },
    setup(props: any) {
        const { activeAccountInfo } = useAccountStore();
        const { state: addressesStore$, addressInfos, activeAddress } = useAddressStore();
        const { contactsArray, setContact, getLabel } = useContactsStore();
        const $router = useRouter();

        const recipientWithLabel: Ref<{address: string, label: string}> | undefined = ref(undefined);
        const amount: Ref<number | undefined> = ref(undefined);
        const message: Ref<string | undefined> = ref(undefined);
        if (props.requestUri) {
            const parsedRequestLink = parseRequestLink(props.requestUri, window.location.origin, true);
            if (parsedRequestLink) {
                let recipient: string | undefined;
                ({ recipient, amount: amount.value, message: message.value } = parsedRequestLink);
                if (recipient) {
                    recipientWithLabel.value = {
                        address: recipient,
                        label: addressInfos.value.find((addressInfo) => addressInfo.address === recipient)?.label
                            || getLabel.value(recipient) || '',
                    };
                }
            }
        }

        // blockchainHeight as consensus indicator
        // TODO add proper consenus listeners
        const height = computed(() => useNetworkStore().state.height);


        // create WalletInfo out of existing information.
        // TODO refactor vue-component's sendTx to no longer require a WalletInfo prop.
        const accounts: Array<[string, AddressInfo]> = [];
        const contracts: Array<ContractAddressInfo> = [];
        activeAccountInfo!.value!.addresses.forEach((address) => {
            const addressInfo = addressesStore$.addressInfos[address];
            if (addressInfo.type === AddressType.BASIC) {
                accounts.push([address, addressInfo]);
            } else {
                contracts.push(addressInfo);
            }
        });

        const walletInfo = {
            id: activeAccountInfo!.value!.id,
            label: activeAccountInfo!.value!.label,
            accounts: new Map(accounts),
            contracts,
            type: activeAccountInfo!.value!.type,
            keyMissing: false,
        };

        // wrap setContact to accept an object instead of 2
        // TODO change either setContact or the contact-added event of SendTx
        const addContact = (contact: {address: string, label?: string}) => {
            if (!contact.label) return;
            setContact(contact.address, contact.label);
        };

        // create sender object.
        // sender.address will be null oif no prop is given thus not preselecting a sender.
        const sender = {
            walletId: activeAccountInfo!.value!.id,
            address: props.senderAddress || activeAddress.value,
        };

        // very basic hub invokation.
        // TODO error handling, success animation if desired.
        const sendTx = async (tx: any) => {
            try {
                const result = await sendTransaction(tx);

                if (result) {
                    $router.back();
                }
            } catch (error) {
                // TODO
            }
        };

        return {
            addContact,
            addresses: addressInfos.value,
            amount,
            contactsArray,
            height,
            message,
            onboard,
            recipientWithLabel,
            sender,
            sendTx,
            walletInfo,
        };
    },
    components: {
        PageBody,
        PageHeader,
        SendTx,
        SmallPage,
        Modal,
    } as any,
});

/*
    TODO:
    * Styling of SendTx
    * properly implementy the change Sender functionality (design pending)
    * close button and Scan QR Code collide.
 */
</script>

<style lang="scss" scoped>
.send-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .small-page {
        margin: 0;
    }

    .page-body {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
    }
}
</style>

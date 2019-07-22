<template>
    <div class="contact-shortcuts">
        <div class="open-contacts" @click="contactsOpened" :class="{'disabled': contacts.length === 0}">
            <ContactsIcon/>
            <div class="label">Contacts</div>
        </div>
        <div class="contacts">
            <div href="javascript:void(0)" class="account-entry"
                v-for="contact in filteredContacts" :key="contact.address"
                @click="contactSelected(contact.address, contact.label)">
                <Account
                    layout="column"
                    :address="contact.address"
                    :label="contact.label" />
            </div>
            <div class="account-entry disabled" v-for="contact in missingContacts" :key="contact">
                <Account
                    layout="column"
                    address=""
                    label="" />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import Account from './Account.vue';
import { ContactsIcon } from './Icons';

@Component({components: {Account, ContactsIcon}})
    export default class ContactShortcuts extends Vue {
        @Prop(Array) public contacts!: Array<{address: string, label: string}>;

        private get filteredContacts() {
            return this.contacts.slice(0, 3);
        }

        private get missingContacts() {
            return (3 - this.contacts.length > 0) ? new Array(3 - this.contacts.length) : [];
        }

        @Emit()
        // tslint:disable-next-line no-empty
        public contactsOpened() {}

        @Emit()
        // tslint:disable-next-line no-empty
        public contactSelected(address: string, label: string) {}
    }
</script>

<style>
    .contact-shortcuts {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 2rem;
        width: 100%;
    }

    .contact-shortcuts .open-contacts {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        flex-direction: column;
        padding: 2rem 1rem;
        width: 12.5rem;
    }

    .contact-shortcuts .open-contacts.disabled {
        cursor: unset;
    }

    .contact-shortcuts .open-contacts svg {
        width: 5rem;
        height: auto;
        margin-bottom: 2.25rem;
        color: var(--nimiq-blue);
        opacity: .4;
    }

    .contact-shortcuts .contacts {
        display: flex;
        flex-direction: row;
        width: calc(100% - 12.5rem - 1px);
        border-left: 1px solid rgba(30,30,30, 0.1);
    }

    .contact-shortcuts .contacts .account-entry {
        width: calc(100% / 3);
        cursor: pointer;
    }

    .contact-shortcuts .contacts .account-entry.disabled {
        cursor: unset;
    }

    .contact-shortcuts .contacts .identicon {
        width: 7rem;
        height: auto;
    }

    .contact-shortcuts .contacts .label {
        height: 1.5em;
        overflow: hidden;
        max-width: 100%;
    }
</style>

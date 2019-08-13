<template>
    <div class="contact-shortcuts">
        <div class="open-contacts" @click="contactsOpened" :class="{'disabled': contacts.length === 0}">
            <ContactsIcon/>
            <div class="label">Contacts</div>
        </div>
        <div class="contacts">
            <Account v-for="contact in filteredContacts" :key="contact.address"
                layout="column"
                :address="contact.address"
                :label="contact.label"
                @click.native="contactSelected(contact.address, contact.label)" />
            <Account v-for="contact in missingContacts" class="disabled" :key="contact"
                layout="column"
                address=""
                label="" />
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
            return new Array(Math.max(0, 3 - this.contacts.length));
        }

        @Emit()
        // tslint:disable-next-line no-empty
        public contactsOpened() {}

        @Emit()
        // tslint:disable-next-line no-empty
        public contactSelected(address: string, label: string) {}
    }
</script>

<style scoped>
    .contact-shortcuts {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        font-size: 2rem;
        width: 100%;
    }

    .open-contacts {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        flex-direction: column;
        margin: 1rem 3rem 2rem 0;
        width: 10rem;
    }

    .open-contacts.disabled {
        cursor: unset;
        opacity: 0.5;
    }

    .open-contacts.disabled .nq-icon {
        opacity: 0.4;
    }

    .open-contacts.disabled .label {
        opacity: 0.6;
    }

    .open-contacts svg {
        width: 5rem;
        height: auto;
        margin-top: 0.5rem;
        margin-bottom: 2.875rem;
        color: var(--nimiq-blue);
        opacity: .4;
    }

    .contacts {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        border-left: 1px solid rgba(30,30,30, 0.1);
        padding-left: 1rem;
        margin-right: -1.5rem;
    }

    .account {
        padding: 0.5rem 1.5rem;
        cursor: pointer;
    }

    .account.disabled {
        cursor: unset;
    }

    .account >>> .identicon {
        width: 8rem;
        height: auto;
    }

    .account >>> .label {
        max-height: 6em;
        overflow: hidden;
        max-width: 8rem;
    }
</style>

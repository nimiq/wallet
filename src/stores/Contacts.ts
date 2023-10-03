import { createStore } from 'pinia';
import { ValidationUtils } from '@nimiq/utils';

export type ContactsState = {
     contacts: {[address: string]: string},
};

export const useContactsStore = createStore({
    id: 'contact',
    state: (): ContactsState => ({ contacts: {} } as ContactsState),
    getters: {
        contacts: (state): Readonly<{ [address: string]: string }> => state.contacts,
        contactsArray: (state): Readonly<Array<{address: string, label: string}>> =>
            Object.entries(state.contacts).map(([address, label]) => ({ address, label })),
        getLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.contacts[address],
    },
    actions: {
        setContact(address: string, label: string) {
            address = ValidationUtils.normalizeAddress(address.toUpperCase());

            // console.debug('Updating contact', address, label);
            if (!label.trim()) {
                // Remove contact
                const contacts = { ...this.state.contacts };
                delete contacts[address];
                this.state.contacts = contacts;
                return;
            }

            // Need to assign whole object for change detection of new contacts.
            // TODO: Simply set new contact in Vue 3.
            this.state.contacts = {
                ...this.state.contacts,
                [address]: label.trim(),
            };
        },
    },
});

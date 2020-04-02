import { createStore } from 'pinia';

export type ContactsState = {
     contacts: {[address: string]: string},
};

export const useContactsStore = createStore({
    id: 'contact',
    state: (): ContactsState => ({ contacts: {} } as ContactsState),
    getters: {
        contacts: (state): Readonly<{ [address: string]: string }> => state.contacts,
        contactsArray: (state): Readonly<Array<{address: string, label: string}>> =>
            Object.keys(state.contacts).map((address) => ({ address, label: state.contacts[address] })),
        getLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.contacts[address],
    },
    actions: {
        setContact(address: string, label: string) {
            if (!label) {
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
                [address]: label,
            };
        },
    },
});

import { createStore } from 'pinia';
import { loadEthersLibrary } from '../ethers';

export type UsdtContactsState = {
     contacts: {[address: string]: string},
};

export const useUsdtContactsStore = createStore({
    id: 'usdtContacts',
    state: (): UsdtContactsState => ({
        contacts: {},
    }),
    getters: {
        contacts: (state): Readonly<{ [address: string]: string }> => state.contacts,
        contactsArray: (state): Readonly<Array<{address: string, label: string}>> =>
            Object.entries(state.contacts).map(([address, label]) => ({ address, label })),
        getLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.contacts[address],
    },
    actions: {
        async setContact(address: string, label: string) {
            const ethers = await loadEthersLibrary();
            address = ethers.utils.getAddress(address.trim()); // normalize with checksum

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

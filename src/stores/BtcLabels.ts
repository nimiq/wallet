import { createStore } from 'pinia';

export type BtcLabelsState = {
    recipientLabels: {[address: string]: string},
    senderLabels: {[address: string]: string},
    copiedAddresses: {[address: string]: number}, // { address: timestamp }
};

export const useBtcLabelsStore = createStore({
    id: 'btcLabels',
    state: () => ({
        recipientLabels: {},
        senderLabels: {},
        copiedAddresses: {},
    } as BtcLabelsState),
    getters: {
        recipientLabels: (state): Readonly<{ [address: string]: string }> => state.recipientLabels,
        getRecipientLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.recipientLabels[address],
        senderLabels: (state): Readonly<{ [address: string]: string }> => state.senderLabels,
        getSenderLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.senderLabels[address],
        copiedAddresses: (state): Readonly<{ [address: string]: number }> => state.copiedAddresses,
    },
    actions: {
        setRecipientLabel(address: string, label: string) {
            // console.debug('Updating recipient label', address, label);
            if (!label.trim()) {
                // Remove label
                const labels = { ...this.state.recipientLabels };
                delete labels[address];
                this.state.recipientLabels = labels;
                return;
            }

            // Need to assign whole object for change detection of new labels.
            // TODO: Simply set new label in Vue 3.
            this.state.recipientLabels = {
                ...this.state.recipientLabels,
                [address.trim()]: label.trim(),
            };
        },
        setSenderLabel(address: string, label: string) {
            // console.debug('Updating sender label', address, label);
            if (!label.trim()) {
                // Remove label
                const labels = { ...this.state.senderLabels };
                delete labels[address];
                this.state.senderLabels = labels;
                return;
            }

            // Need to assign whole object for change detection of new labels.
            // TODO: Simply set new label in Vue 3.
            this.state.senderLabels = {
                ...this.state.senderLabels,
                [address.trim()]: label.trim(),
            };
        },
        setCopiedAddress(address: string, timestamp: number) {
            if (!this.state.copiedAddresses[address] && timestamp <= Date.now()) {
                this.state.copiedAddresses = {
                    ...this.state.copiedAddresses,
                    [address]: timestamp,
                };
            }
        },
        removeCopiedAddresses(addresses: string[]) {
            const copiedAddresses = { ...this.state.copiedAddresses };
            for (const address of addresses) {
                delete copiedAddresses[address];
            }
            this.state.copiedAddresses = copiedAddresses;
        },
    },
});

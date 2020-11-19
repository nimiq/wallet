import { createStore } from 'pinia';

export type BtcLabelsState = {
    recipientLabels: {[address: string]: string},
    senderLabels: {[address: string]: string},
};

export const useBtcLabelsStore = createStore({
    id: 'btcLabels',
    state: () => ({
        recipientLabels: {},
        senderLabels: {},
    } as BtcLabelsState),
    getters: {
        recipientLabels: (state): Readonly<{ [address: string]: string }> => state.recipientLabels,
        getRecipientLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.recipientLabels[address],
        senderLabels: (state): Readonly<{ [address: string]: string }> => state.senderLabels,
        getSenderLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.senderLabels[address],
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
                [address.trim()]: label,
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
                [address.trim()]: label,
            };
        },
        removeSenderLabelByAddress(address: string) {
            const senderLabels = { ...this.state.senderLabels };
            delete senderLabels[address];
            this.state.senderLabels = senderLabels;
        },
    },
});

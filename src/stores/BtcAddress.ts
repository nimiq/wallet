import { createStore } from 'pinia';
import { useAccountStore } from './Account'; // eslint-disable-line import/no-cycle

export type BtcAddressState = {
    addressInfos: {[id: string]: BtcAddressInfo},
    recipientLabels: {[address: string]: string},
    senderLabels: {[address: string]: string},
    copiedAddresses: {[address: string]: number}, // { address: timestamp }
}

export type BtcAddressSet = {
    internal: BtcAddressInfo[],
    external: BtcAddressInfo[],
}

export type UTXO = {
    transactionHash: string,
    index: number,
    witness: {
        script: string,
        value: number,
    },
}

export type BtcAddressInfo = {
    address: string,
    used: boolean,
    utxos: UTXO[],
}

export const useBtcAddressStore = createStore({
    id: 'btcAddresses',
    state: () => ({
        addressInfos: {},
        recipientLabels: {},
        senderLabels: {},
        copiedAddresses: {},
    } as BtcAddressState),
    getters: {
        addressSet: (state): BtcAddressSet => {
            const accountStore = useAccountStore();
            return accountStore.activeAccountInfo.value
                ? {
                    internal: accountStore.activeAccountInfo.value.btcAddresses.internal
                        .map((addr) => state.addressInfos[addr]),
                    external: accountStore.activeAccountInfo.value.btcAddresses.external
                        .map((addr) => state.addressInfos[addr]),
                }
                : {
                    internal: [],
                    external: [],
                };
        },
        activeInternalAddresses: (state, { addressSet }): string[] =>
            (addressSet.value as BtcAddressSet).internal.map((btcAddressInfo) => btcAddressInfo.address),
        activeExternalAddresses: (state, { addressSet }): string[] =>
            (addressSet.value as BtcAddressSet).external.map((btcAddressInfo) => btcAddressInfo.address),
        activeAddresses: (state, { activeInternalAddresses, activeExternalAddresses }): string[] =>
            (activeInternalAddresses.value as string[]).concat((activeExternalAddresses.value as string[])),
        accountBalance: (state, { addressSet }) => {
            const internalBalance = (addressSet.value as BtcAddressSet).internal
                .reduce((sum1, addressInfo) => sum1 + addressInfo.utxos
                    .reduce((sum2, utxo) => sum2 + utxo.witness.value, 0), 0);
            const externalBalance = (addressSet.value as BtcAddressSet).external
                .reduce((sum1, addressInfo) => sum1 + addressInfo.utxos
                    .reduce((sum2, utxo) => sum2 + utxo.witness.value, 0), 0);

            return internalBalance + externalBalance;
        },
        recipientLabels: (state): Readonly<{ [address: string]: string }> => state.recipientLabels,
        getRecipientLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.recipientLabels[address],
        senderLabels: (state): Readonly<{ [address: string]: string }> => state.senderLabels,
        getSenderLabel: (state): ((address: string) => string | undefined) => (address: string): Readonly<string> =>
            state.senderLabels[address],
        copiedAddresses: (state): Readonly<{ [address: string]: number }> => state.copiedAddresses,
    },
    actions: {
        addAddressInfos(addressInfos: BtcAddressInfo[]) {
            const newAddressInfos: {[address: string]: BtcAddressInfo} = {};

            for (const addressInfo of addressInfos) {
                newAddressInfos[addressInfo.address] = addressInfo;
            }

            this.state.addressInfos = {
                ...this.state.addressInfos,
                ...newAddressInfos,
            };
        },
        patchAddress(address: string, patch: Partial<BtcAddressInfo>) {
            if (!this.state.addressInfos[address]) return;

            // @ts-ignore
            this.state.addressInfos[address] = {
                ...this.state.addressInfos[address],
                ...patch,
            };
        },
        removeAddresses(addresses: string[]) {
            const addressInfos = { ...this.state.addressInfos };
            for (const address of addresses) {
                delete addressInfos[address];
            }
            this.state.addressInfos = addressInfos;
        },
        setRecipientLabel(address: string, label: string) {
            // console.debug('Updating recipient label', address, label);
            if (!label.trim()) {
                // Remove contact
                const labels = { ...this.state.recipientLabels };
                delete labels[address];
                this.state.recipientLabels = labels;
                return;
            }

            // Need to assign whole object for change detection of new labels.
            // TODO: Simply set new contact in Vue 3.
            this.state.recipientLabels = {
                ...this.state.recipientLabels,
                [address.trim()]: label.trim(),
            };
        },
        setSenderLabel(address: string, label: string) {
            // console.debug('Updating sender label', address, label);
            if (!label.trim()) {
                // Remove contact
                const labels = { ...this.state.senderLabels };
                delete labels[address];
                this.state.senderLabels = labels;
                return;
            }

            // Need to assign whole object for change detection of new labels.
            // TODO: Simply set new contact in Vue 3.
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
    },
});

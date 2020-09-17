import { Ref } from '@vue/composition-api';
import { createStore } from 'pinia';
import { useAccountStore } from './Account'; // eslint-disable-line import/no-cycle

export type BtcAddressState = {
    addressInfos: {[address: string]: BtcAddressInfo},
    copiedExternalAddresses: BtcCopiedAddresses, // { address: timestamp }
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

export type BtcCopiedAddresses = { [address: string]: number } // timestamps per address

export const useBtcAddressStore = createStore({
    id: 'btcAddresses',
    state: () => ({
        addressInfos: {},
        copiedExternalAddresses: {},
    } as BtcAddressState),
    getters: {
        addressSet: (state): BtcAddressSet => {
            const { activeAccountInfo } = useAccountStore();
            const accountInfo = activeAccountInfo.value;
            return accountInfo && accountInfo.btcAddresses
                ? {
                    internal: accountInfo.btcAddresses.internal.map((addr) => state.addressInfos[addr]),
                    external: accountInfo.btcAddresses.external.map((addr) => state.addressInfos[addr]),
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
        accountUtxos: (state, { addressSet }) => {
            const utxos = [] as Array<UTXO & { address: string }>;

            // Note: Using concat() as it is optimized for arrays and faster than array spread
            const addressInfos = (addressSet as Ref<BtcAddressSet>).value.internal
                .concat((addressSet as Ref<BtcAddressSet>).value.external);

            for (const addressInfo of addressInfos) {
                if (!addressInfo.utxos.length) continue;

                utxos.push(...addressInfo.utxos.map((utxo) => ({
                    ...utxo,
                    address: addressInfo.address,
                })));
            }
            return utxos;
        },
        accountBalance: (state, { accountUtxos }) => (accountUtxos as Ref<UTXO[]>).value
            .reduce((sum, utxo) => sum + utxo.witness.value, 0),
        // activeExternalAddresses that were copied
        copiedExternalAddresses: (state, { activeExternalAddresses }): Readonly<BtcCopiedAddresses> => {
            const tmp = {} as BtcCopiedAddresses;

            for (const address of (activeExternalAddresses.value as string[])) {
                if (state.copiedExternalAddresses[address]) {
                    tmp[address] = state.copiedExternalAddresses[address];
                }
            }

            return tmp;
        },
        // activeExternalAddresses that were never copied
        availableExternalAddresses: (state, { addressSet, copiedExternalAddresses }): string[] =>
            addressSet.value.external
                .filter(({ used, address }: BtcAddressInfo) => !used && !copiedExternalAddresses.value[address])
                .map((btcAddressInfo: BtcAddressInfo) => btcAddressInfo.address),
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
        // set an external address as copied
        setCopiedAddress(address: string, timestamp: number = Date.now()) {
            if (!this.state.copiedExternalAddresses[address] && timestamp <= Date.now()) {
                this.state.copiedExternalAddresses = {
                    ...this.state.copiedExternalAddresses,
                    [address]: timestamp,
                };
            }
        },
        // remove a list of addresses from the copiedAddresses list
        removeCopiedAddresses(addresses: string[]) {
            const copiedExternalAddresses = { ...this.state.copiedExternalAddresses };

            for (const address of addresses) {
                delete copiedExternalAddresses[address];
            }

            this.state.copiedExternalAddresses = copiedExternalAddresses;
        },
        // remove a list of addresses from the copiedAddresses list and every other addresses copied before
        removeCopiedAddressesAndOlder(addresses: string[]) {
            const copiedExternalAddresses = { ...this.state.copiedExternalAddresses };
            const mostRecentTimestamp = addresses.reduce((acc, cur) =>
                copiedExternalAddresses[cur] > acc ? copiedExternalAddresses[cur] : acc, 0);

            if (mostRecentTimestamp === 0) return;

            Object.entries(copiedExternalAddresses).forEach(([address, timestamp]) => {
                if (timestamp <= mostRecentTimestamp) {
                    delete copiedExternalAddresses[address];
                }
            });

            this.state.copiedExternalAddresses = copiedExternalAddresses;
        },
    },
});

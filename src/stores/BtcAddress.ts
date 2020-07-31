import { createStore } from 'pinia';
import { useAccountStore } from './Account'; // eslint-disable-line import/no-cycle

export type BtcAddressState = {
    addressInfos: {[id: string]: BtcAddressInfo},
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
        accountBalance: (state, { addressSet }) => {
            const internalBalance = (addressSet.value as BtcAddressSet).internal
                .reduce((sum1, addressInfo) => sum1 + addressInfo.utxos
                    .reduce((sum2, utxo) => sum2 + utxo.witness.value, 0), 0);
            const externalBalance = (addressSet.value as BtcAddressSet).external
                .reduce((sum1, addressInfo) => sum1 + addressInfo.utxos
                    .reduce((sum2, utxo) => sum2 + utxo.witness.value, 0), 0);

            return internalBalance + externalBalance;
        },
    },
    actions: {
        addAddressInfo(addressInfo: BtcAddressInfo) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new addressInfo in Vue 3.
            this.state.addressInfos = {
                ...this.state.addressInfos,
                [addressInfo.address]: addressInfo,
            };
        },
        setAddressInfos(addressInfos: BtcAddressInfo[]) {
            const newAddressInfos: {[address: string]: BtcAddressInfo} = {};

            for (const addressInfo of addressInfos) {
                newAddressInfos[addressInfo.address] = addressInfo;
            }

            this.state.addressInfos = newAddressInfos;

            // TODO: Remove transactions that became obsolete because their address was removed?
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
    },
});

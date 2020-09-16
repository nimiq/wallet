import { Ref } from '@vue/composition-api';
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
    },
});

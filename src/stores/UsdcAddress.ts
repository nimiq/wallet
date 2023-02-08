import { createStore } from 'pinia';
import { useAccountStore } from './Account';
// import { useUsdcTransactionsStore } from './UsdcTransactions';

export type UsdcAddressState = {
    addressInfos: {[id: string]: UsdcAddressInfo},
}

export type UsdcAddressInfo = {
    address: string,
    balance: number | null,
    matic: number | null, // For testing until OpenGSN contract is available
};

export const useUsdcAddressStore = createStore({
    id: 'usdcAddresses',
    state: (): UsdcAddressState => ({
        addressInfos: {},
    }),
    getters: {
        addressInfo: (state): UsdcAddressInfo | undefined => {
            const { activeAccountInfo } = useAccountStore();
            if (!activeAccountInfo.value?.polygonAddresses?.length) return undefined;

            // TODO: Subtract pending outgoing balance from addressInfo.balance
            // const { pendingTransactionsBySender } = useUsdcTransactionsStore();

            // Only supports one USDC address per account for now
            return state.addressInfos[activeAccountInfo.value.polygonAddresses[0]];
        },
        activeAddress: (state, { addressInfo }): string | undefined =>
            (addressInfo.value as UsdcAddressInfo | undefined)?.address,
        accountBalance: (state, { addressInfo }) => {
            const ai = addressInfo.value as UsdcAddressInfo | undefined;
            if (!ai || ai.balance === null) return 0;
            return ai.balance;
        },
    },
    actions: {
        addAddressInfo(addressInfo: UsdcAddressInfo) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new addressInfo in Vue 3.
            this.state.addressInfos = {
                ...this.state.addressInfos,
                [addressInfo.address]: addressInfo,
            };
        },
        setAddressInfos(addressInfos: UsdcAddressInfo[]) {
            const newAddressInfos: {[address: string]: UsdcAddressInfo} = {};

            for (const addressInfo of addressInfos) {
                newAddressInfos[addressInfo.address] = addressInfo;
            }

            this.state.addressInfos = newAddressInfos;

            // TODO: Remove transactions that became obsolete because their address was removed?
        },
        patchAddress(address: string, patch: Partial<UsdcAddressInfo>) {
            if (!this.state.addressInfos[address]) return;

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

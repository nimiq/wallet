import { createStore } from 'pinia';
import { useAccountStore } from './Account';
// import { useUsdcTransactionsStore } from './UsdcTransactions';

export type PolygonAddressState = {
    addressInfos: {[id: string]: PolygonAddressInfo},
}

export type PolygonAddressInfo = {
    address: string,
    balanceUsdcBridged: number | null,
    balanceUsdc: number | null,
    pol: number | null, // For testing until OpenGSN contract is available
};

export const usePolygonAddressStore = createStore({
    id: 'polygonAddresses',
    state: (): PolygonAddressState => ({
        addressInfos: {},
    }),
    getters: {
        addressInfo: (state): PolygonAddressInfo | undefined => {
            const { activeAccountInfo } = useAccountStore();
            if (!activeAccountInfo.value?.polygonAddresses?.length) return undefined;

            // TODO: Subtract pending outgoing balance from addressInfo.balanceUsdcBridged / balanceUsdc
            // const { pendingTransactionsBySender } = useUsdcTransactionsStore();

            // Only supports one USDC address per account for now
            return state.addressInfos[activeAccountInfo.value.polygonAddresses[0]];
        },
        activeAddress: (state, { addressInfo }): string | undefined =>
            (addressInfo.value as PolygonAddressInfo | undefined)?.address,
        accountUsdcBridgedBalance: (state, { addressInfo }) => {
            const ai = addressInfo.value as PolygonAddressInfo | undefined;
            if (!ai || ai.balanceUsdcBridged === null) return 0;
            return ai.balanceUsdcBridged;
        },
        accountUsdcBalance: (state, { addressInfo }) => {
            const ai = addressInfo.value as PolygonAddressInfo | undefined;
            if (!ai || ai.balanceUsdc === null) return 0;
            return ai.balanceUsdc;
        },
    },
    actions: {
        addAddressInfo(addressInfo: PolygonAddressInfo) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new addressInfo in Vue 3.
            this.state.addressInfos = {
                ...this.state.addressInfos,
                [addressInfo.address]: addressInfo,
            };
        },
        setAddressInfos(addressInfos: PolygonAddressInfo[]) {
            const newAddressInfos: {[address: string]: PolygonAddressInfo} = {};

            for (const addressInfo of addressInfos) {
                newAddressInfos[addressInfo.address] = addressInfo;
            }

            this.state.addressInfos = newAddressInfos;

            // TODO: Remove transactions that became obsolete because their address was removed?
        },
        patchAddress(address: string, patch: Partial<PolygonAddressInfo>) {
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

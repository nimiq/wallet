import { createStore } from 'pinia'

export type AddressState = {
    addressInfos: {[id: string]: AddressInfo},
    activeAddress: string | null,
}

export type AddressInfo = {
    address: string,
    type: string,
    label: string,
    balance: number | null,
    accountId: string,
}

export const useAddressStore = createStore({
    id: 'addresses',
    state: () => ({
        addressInfos: {},
        activeAddress: null,
    } as AddressState),
    getters: {
        addressInfos: state => state.addressInfos,
        activeAddress: state => state.activeAddress,
        activeAddressInfo: state => state.activeAddress && state.addressInfos[state.activeAddress],
        // TODO: Only sum up balances of active account addresses
        accountBalance: state => Object.values(state.addressInfos).reduce((sum, acc) => sum + (acc.balance || 0), 0),
    },
    actions: {
        selectAddress(address: string) {
            this.state.activeAddress = address
        },
        addAddressInfos(addressInfos: AddressInfo[]) {
            const newAddressInfos: {[address: string]: AddressInfo} = {}

            for (const addressInfo of addressInfos) {
                newAddressInfos[addressInfo.address] = addressInfo
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Only add new addresses in Vue 3.
            this.state.addressInfos = {
                ...this.state.addressInfos,
                ...newAddressInfos,
            }
        },
        updateBalance(address: string, balance: number) {
            this.state.addressInfos[address].balance = balance
            // this.state.addressInfos[address] = {
            //     ...this.state.addressInfos[address],
            //     balance,
            // }
        },
    },
})

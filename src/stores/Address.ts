import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { TransactionState, useTransactionsStore } from './Transactions';

export type AddressState = {
    addressInfos: {[id: string]: AddressInfo},
    activeAddress: string | null,
}

// Mirror of Nimiq.Account.Type
export enum AddressType {
    BASIC = 0,
    VESTING = 1,
    HTLC = 2,
}

export type AddressInfo = {
    address: string,
    label: string,
    balance: number | null,
} & (BasicAddressInfo | ContractAddressInfo);

export type BasicAddressInfo = {
    type: AddressType.BASIC,
}

export type ContractAddressInfo = {
    type: AddressType.VESTING,
    owner: string,
    start: number,
    stepAmount: number,
    stepBlocks: number,
    totalAmount: number,
}

export const useAddressStore = createStore({
    id: 'addresses',
    state: () => ({
        addressInfos: {},
        activeAddress: null,
    } as AddressState),
    getters: {
        addressInfos: (state): AddressInfo[] => {
            const { activeAccountInfo } = useAccountStore();
            if (!activeAccountInfo.value) return [];

            const { pendingTransactionsBySender } = useTransactionsStore();

            return activeAccountInfo.value.addresses
                .map((addr) => state.addressInfos[addr])
                .filter((ai) => Boolean(ai))
                .map((ai) => {
                    const pendingTxs = pendingTransactionsBySender.value[ai.address] || [];
                    const outgoingPendingAmount = pendingTxs
                        // Do not consider pending transactions to our own addresses, to prevent the account
                        // balance from getting reduced when sending between own accounts.
                        .filter((tx) => !activeAccountInfo.value!.addresses.includes(tx.recipient))
                        .reduce((sum, tx) => sum + tx.value + tx.fee, 0);
                    return {
                        ...ai,
                        balance: Math.max(0, (ai.balance || 0) - outgoingPendingAmount),
                    };
                });
        },
        activeAddress: (state) => state.activeAddress,
        activeAddressInfo: (state, { addressInfos }) => state.activeAddress
            ? (addressInfos.value as AddressInfo[]).find((ai) => ai.address === state.activeAddress)
            : null,
        accountBalance: (state, { addressInfos }) =>
            (addressInfos.value as AddressInfo[]).reduce((sum, acc) => sum + ((!!acc && acc.balance) || 0), 0),
        transactionsForActiveAddress: (state, { activeAddress }) => {
            if (!activeAddress.value) return [];
            const { state: transactionsState } = useTransactionsStore();
            const { transactions } = transactionsState;

            // Filter down to relevant transactions for the active address
            const txs = Object.values(transactions).filter(
                (tx) => tx.sender === activeAddress.value || tx.recipient === activeAddress.value,
            );

            // Sort transactions by descending timestamp
            return txs.slice(0).sort((a, b) => {
                const aHeight = a.blockHeight
                    || ((a.state === TransactionState.EXPIRED || a.state === TransactionState.INVALIDATED)
                        && a.validityStartHeight)
                    || Number.MAX_SAFE_INTEGER;
                const bHeight = b.blockHeight
                    || ((b.state === TransactionState.EXPIRED || b.state === TransactionState.INVALIDATED)
                        && b.validityStartHeight)
                    || Number.MAX_SAFE_INTEGER;

                return bHeight - aHeight;
            });
        },
    },
    actions: {
        selectAddress(address: string) {
            this.state.activeAddress = address;
        },
        addAddressInfo(addressInfo: AddressInfo, selectIt = true) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new addressInfo in Vue 3.
            this.state.addressInfos = {
                ...this.state.addressInfos,
                [addressInfo.address]: addressInfo,
            };

            if (selectIt) this.state.activeAddress = addressInfo.address;
        },
        setAddressInfos(addressInfos: AddressInfo[]) {
            const newAddressInfos: {[address: string]: AddressInfo} = {};

            for (const addressInfo of addressInfos) {
                newAddressInfos[addressInfo.address] = addressInfo;
            }

            this.state.addressInfos = newAddressInfos;

            // If no address selected yet, or selected address does not exist anymore, select the first available.
            if (!this.state.activeAddress || !this.state.addressInfos[this.state.activeAddress]) {
                this.state.activeAddress = addressInfos[0] ? addressInfos[0].address : null;
            }

            // TODO: Remove transactions that became obsolete because their address was removed?
        },
        patchAddress(address: string, patch: Partial<Omit<AddressInfo, 'type'>>) {
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

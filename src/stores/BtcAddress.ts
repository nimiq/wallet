import { Ref } from 'vue';
import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { Transaction } from './BtcTransactions';

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
    txoCount?: number, // Number of transaction outputs received, to track if the address has been reused
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
                    internal: accountInfo.btcAddresses.internal
                        .map((addr) => state.addressInfos[addr])
                        .filter((addrInfo) => !!addrInfo),
                    external: accountInfo.btcAddresses.external
                        .map((addr) => state.addressInfos[addr])
                        .filter((addrInfo) => !!addrInfo),
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
                for (const utxo of addressInfo.utxos) {
                    utxos.push({
                        ...utxo,
                        address: addressInfo.address,
                    });
                }
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
                .filter(({ txoCount, address }: BtcAddressInfo) => !txoCount && !copiedExternalAddresses.value[address])
                .map((btcAddressInfo: BtcAddressInfo) => btcAddressInfo.address),
        nextChangeAddress: (state, { addressSet }): string | undefined =>
            (addressSet as Ref<BtcAddressSet>).value.internal.find((addressInfo) => !addressInfo.txoCount)?.address,
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

            this.state.addressInfos[address] = {
                ...this.state.addressInfos[address],
                ...patch,
            };
        },
        applyTransactionsToUtxos(transactions: Transaction[], spentInputs: Set<string>) {
            // Remove spent UTXOs in transactions from addresses
            for (const { inputs } of transactions) {
                for (const { address } of inputs) {
                    if (!address) continue;
                    const addressInfo = this.state.addressInfos[address];
                    if (!addressInfo) continue;

                    this.patchAddress(address, {
                        utxos: addressInfo.utxos.filter((utxo) =>
                            !spentInputs.has(`${utxo.transactionHash}:${utxo.index}`)),
                    });
                }
            }

            // Add new UTXOs in transactions to addresses
            const utxosByAddress = new Map<string, UTXO[]>();
            const txoCountByAddress = new Map<string, number>();
            for (const { outputs, transactionHash } of transactions) {
                for (const { address, index, script, value } of outputs) {
                    if (!address) continue;
                    const addressInfo = this.state.addressInfos[address];
                    if (!addressInfo) continue;

                    // Skip this output if it is already spent
                    if (spentInputs.has(`${transactionHash}:${index}`)) {
                        txoCountByAddress.set(address, (txoCountByAddress.get(address) || 0) + 1);
                        continue;
                    }

                    // Skip this output if the UTXO is already known
                    if (addressInfo.utxos.some((utxo) =>
                        utxo.transactionHash === transactionHash && utxo.index === index)) continue;

                    const utxos = utxosByAddress.get(address) || [];
                    utxos.push({
                        transactionHash,
                        index,
                        witness: {
                            script,
                            value,
                        },
                    });
                    utxosByAddress.set(address, utxos);
                }
            }
            for (const [address, utxos] of utxosByAddress) {
                const existingUtxos = this.state.addressInfos[address].utxos;
                this.patchAddress(address, {
                    utxos: existingUtxos.concat(utxos),
                    txoCount: (this.state.addressInfos[address].txoCount || 0) + utxos.length,
                });
            }
            for (const [address, txoCount] of txoCountByAddress) {
                this.patchAddress(address, {
                    txoCount: (this.state.addressInfos[address].txoCount || 0) + txoCount,
                });
            }
            this.removeCopiedAddresses([...utxosByAddress.keys(), ...txoCountByAddress.keys()]);
        },
        removeAddresses(addresses: string[]) {
            const addressInfos = { ...this.state.addressInfos };
            for (const address of addresses) {
                delete addressInfos[address];
            }
            this.state.addressInfos = addressInfos;
            this.removeCopiedAddresses(addresses);
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

/* eslint-disable import/no-cycle */

import Vue from 'vue';
import { createStore } from 'pinia';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { PlainTransaction, PlainOutput, PlainInput } from '@nimiq/electrum-client';
import { useFiatStore } from './Fiat'; // eslint-disable-line import/no-cycle
import { CryptoCurrency, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { useBtcAddressStore, UTXO } from './BtcAddress';
import { useBtcLabelsStore } from './BtcLabels';

export type Transaction = Omit<PlainTransaction, 'outputs'> & {
    addresses: string[],
    outputs: (PlainOutput & {
        fiatValue?: { [fiatCurrency: string]: number | typeof FIAT_PRICE_UNAVAILABLE | undefined },
    })[],
};

// TODO: Import from @nimiq/electrum-client
export enum TransactionState {
    NEW = 'new',
    PENDING = 'pending',
    MINED = 'mined',
    INVALIDATED = 'invalidated',
    EXPIRED = 'expired',
    CONFIRMED = 'confirmed',
}

export const useBtcTransactionsStore = createStore({
    id: 'btcTransactions',
    state: () => ({
        transactions: {} as {[hash: string]: Transaction},
    }),
    getters: {
        // activeAccount: state => state.accounts[state.activeAccountId],
    },
    actions: {
        addTransactions(txs: PlainTransaction[]) {
            if (!txs.length) return;

            const txDetails = txs.map((tx) => {
                // Collect all addresses used in this transaction (for convenience)
                const inputAddresses = tx.inputs
                    .map((input) => input.address)
                    .filter((address) => !!address) as string[];
                const outputAddresses = tx.outputs.map((output) => output.address);

                return {
                    ...tx,
                    addresses: inputAddresses.concat(outputAddresses),
                } as Transaction;
            });

            const newTxs: { [hash: string]: Transaction } = {};
            for (const plain of txDetails) {
                newTxs[plain.transactionHash] = plain;
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            this.calculateFiatAmounts();

            // Update UTXOs and `used` status on affected addresses
            const { state: btcAddresses$, patchAddress } = useBtcAddressStore();
            const { removeCopiedAddresses } = useBtcLabelsStore();

            // Remove UTXOs in inputs from addresses
            const inputsByAddress = new Map<string, PlainInput[]>();
            for (const tx of txDetails) {
                for (const input of tx.inputs) {
                    const { address } = input;
                    if (address && btcAddresses$.addressInfos[address]) {
                        const inputs = inputsByAddress.get(address) || [];
                        inputs.push(input);
                        inputsByAddress.set(address, inputs);
                    }
                }
            }
            // TODO: More efficient filtering of one array by not-in-other-array?
            for (const [address, inputs] of inputsByAddress) {
                const { utxos } = btcAddresses$.addressInfos[address];
                patchAddress(address, {
                    utxos: utxos.filter((utxo) => !inputs.some((input) =>
                        input.transactionHash === utxo.transactionHash && input.outputIndex === utxo.index)),
                    used: true,
                });
            }

            // Build a list of all known spent outputs (= inputs)
            // It's not enough to only take into account the inputs used in the transactions
            // added in this method call, as for the case where an output is added for which
            // the spending transaction is already known and has been processed, this output
            // would still be added as an UTXO.
            const knownInputKeys = Object.values(this.state.transactions)
                .reduce((set, tx) => {
                    for (const input of tx.inputs) {
                        set.add(`${input.transactionHash}:${input.outputIndex}`);
                    }
                    return set;
                }, new Set<string>());


            // Add UTXOs to addresses from outputs
            const utxosByAddress = new Map<string, UTXO[]>();
            for (const tx of txDetails) {
                for (const output of tx.outputs) {
                    // Skip this output if an according input is already known
                    if (knownInputKeys.has(`${tx.transactionHash}:${output.index}`)) continue;

                    const { address } = output;

                    if (btcAddresses$.addressInfos[address]) {
                        const utxos = utxosByAddress.get(address) || [];

                        // Skip this output if the UTXO is already known
                        if (btcAddresses$.addressInfos[address].utxos.some((utxo) =>
                            utxo.transactionHash === tx.transactionHash && utxo.index === output.index)) continue;

                        utxos.push({
                            transactionHash: tx.transactionHash,
                            index: output.index,
                            witness: {
                                script: output.script,
                                value: output.value,
                            },
                        });
                        utxosByAddress.set(address, utxos);
                    }
                }
            }
            for (const [address, utxos] of utxosByAddress) {
                const existingUtxos = btcAddresses$.addressInfos[address].utxos;
                patchAddress(address, {
                    utxos: existingUtxos.concat(utxos),
                    used: true,
                });
            }
            removeCopiedAddresses([...inputsByAddress.keys(), ...utxosByAddress.keys()]);
        },

        async calculateFiatAmounts() {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatCurrency = useFiatStore().currency.value;
            const transactionsToUpdate = Object.values(this.state.transactions).filter((tx) =>
                !!tx.timestamp && tx.outputs.some((output) => !output.fiatValue || !(fiatCurrency in output.fiatValue)),
            ) as Array<Omit<Transaction, 'timestamp'> & { timestamp: number }>;

            if (!transactionsToUpdate.length) return;

            const timestamps = transactionsToUpdate.map((tx) => tx.timestamp * 1000);
            const historicExchangeRates = await getHistoricExchangeRates(CryptoCurrency.BTC, fiatCurrency, timestamps);

            for (const tx of transactionsToUpdate) {
                const exchangeRate = historicExchangeRates.get(tx.timestamp * 1000);
                for (const output of tx.outputs) {
                    // Set via Vue.set to let vue setup the reactivity.
                    // TODO this might be not necessary anymore with Vue3
                    if (!output.fiatValue) Vue.set(output, 'fiatValue', {});
                    Vue.set(output.fiatValue!, fiatCurrency, exchangeRate !== undefined
                        ? (exchangeRate * output.value) / 1e8
                        : FIAT_PRICE_UNAVAILABLE,
                    );
                }
            }
        },

        removeTransactions(txs: Transaction[]) {
            const transactions = { ...this.state.transactions };
            for (const tx of txs) {
                delete transactions[tx.transactionHash];
            }
            this.state.transactions = transactions;
        },
    },
});

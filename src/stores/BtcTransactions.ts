import Vue from 'vue';
import { createStore } from 'pinia';
import { getHistoricExchangeRates } from '@nimiq/utils';
import { TransactionDetails, PlainOutput, TransactionState } from '@nimiq/electrum-client';
import { init as initFastspotApi, getContract, SwapAsset } from '@nimiq/fastspot-api';
import Config from 'config';
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { useBtcAddressStore } from './BtcAddress';
import { isHtlcFunding, isHtlcRefunding, isHtlcSettlement, HTLC_ADDRESS_LENGTH } from '../lib/BtcHtlcDetection';
import { useSwapsStore } from './Swaps';

export type Transaction = Omit<TransactionDetails, 'outputs'> & {
    addresses: string[],
    outputs: (PlainOutput & {
        fiatValue?: { [fiatCurrency: string]: number | typeof FIAT_PRICE_UNAVAILABLE | undefined },
    })[],
};

const VALID_TRANSACTION_STATES = [
    TransactionState.PENDING,
    TransactionState.MINED,
    TransactionState.CONFIRMED,
];

export const useBtcTransactionsStore = createStore({
    id: 'btcTransactions',
    state: () => ({
        transactions: {} as {[hash: string]: Transaction},
    }),
    getters: {
        spentInputs: (state) => Object.values(state.transactions).reduce((set, tx) => {
            if (!VALID_TRANSACTION_STATES.includes(tx.state)) return set;
            for (const input of tx.inputs) {
                set.add(`${input.transactionHash}:${input.outputIndex}`);
            }
            return set;
        }, new Set<string>()),
    },
    actions: {
        async addTransactions(txs: TransactionDetails[]) {
            if (!txs.length) return;

            const txDetails = txs.map((tx) => {
                // Collect all addresses used in this transaction (for convenience)
                const inputAddresses = tx.inputs
                    .map((input) => input.address)
                    .filter((address) => !!address) as string[];
                const outputAddresses = tx.outputs.map((output) => output.address || output.script);

                return {
                    ...tx,
                    addresses: inputAddresses.concat(outputAddresses),
                } as Transaction;
            });

            const newTxs: { [hash: string]: Transaction } = {};
            for (const plain of txDetails) {
                if (!useSwapsStore().state.swapByTransaction[plain.transactionHash]) {
                    // Detect swaps
                    // HTLC Creation
                    const fundingData = await isHtlcFunding(plain); // eslint-disable-line no-await-in-loop
                    if (fundingData) {
                        useSwapsStore().addFundingData(fundingData.hash, {
                            asset: SwapAsset.BTC,
                            transactionHash: plain.transactionHash,
                            outputIndex: fundingData.outputIndex,
                            htlc: {
                                address: plain.outputs
                                    .find((output) => output.address?.length === HTLC_ADDRESS_LENGTH)!
                                    .address || undefined,
                                script: fundingData.script,
                                refundAddress: fundingData.refundAddress,
                                redeemAddress: fundingData.redeemAddress,
                                timeoutTimestamp: fundingData.timeoutTimestamp,
                            },
                        });
                    }
                    // HTLC Refunding
                    const refundingData = await isHtlcRefunding(plain); // eslint-disable-line no-await-in-loop
                    if (refundingData) {
                        useSwapsStore().addSettlementData(refundingData.hash, {
                            asset: SwapAsset.BTC,
                            transactionHash: plain.transactionHash,
                            outputIndex: refundingData.outputIndex,
                        });
                    }
                    // HTLC Settlement
                    const settlementData = await isHtlcSettlement(plain); // eslint-disable-line no-await-in-loop
                    if (settlementData) {
                        useSwapsStore().addSettlementData(settlementData.hash, {
                            asset: SwapAsset.BTC,
                            transactionHash: plain.transactionHash,
                            outputIndex: settlementData.outputIndex,
                        });

                        if (!useSwapsStore().state.swaps[settlementData.hash].in) {
                            // Check this swap with the Fastspot API to detect if this was a EUR swap
                            initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);
                            getContract(SwapAsset.BTC, plain.inputs[0].address!).then((contractWithEstimate) => {
                                if (contractWithEstimate.from.asset === SwapAsset.EUR) {
                                    useSwapsStore().addFundingData(settlementData.hash, {
                                        asset: SwapAsset.EUR,
                                        amount: contractWithEstimate.from.amount,
                                        // We cannot get bank info or EUR HTLC details from this.
                                    });
                                }
                            }).catch(() => undefined);
                        }
                    }
                }

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

            const appliedTransactions: Transaction[] = [];
            // const revertedTransactions: Transaction[] = [];

            for (const tx of txDetails) {
                if (VALID_TRANSACTION_STATES.includes(tx.state)) {
                    appliedTransactions.push(tx);
                } else {
                    // revertedTransactions.push(tx);
                }
            }

            const { applyTransactionsToUtxos/* , revertTransactionsFromUtxos */ } = useBtcAddressStore();
            applyTransactionsToUtxos(appliedTransactions, this.spentInputs.value);
            // revertTransactionsFromUtxos(revertedTransactions, this.state.transactions);
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

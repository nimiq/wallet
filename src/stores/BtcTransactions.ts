import Vue from 'vue';
import { createStore } from 'pinia';
import { getHistoricExchangeRates, isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { TransactionDetails, PlainOutput, TransactionState } from '@nimiq/electrum-client';
import { getContract, SwapAsset } from '@nimiq/fastspot-api';
import { useFiatStore } from './Fiat';
import { CryptoCurrency, FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, FIAT_PRICE_UNAVAILABLE } from '../lib/Constants';
import { useBtcAddressStore } from './BtcAddress';
import { isHtlcFunding, isHtlcRefunding, isHtlcSettlement, HTLC_ADDRESS_LENGTH } from '../lib/BtcHtlcDetection';
import { useSwapsStore } from './Swaps';
import { getEurPerCrypto, getFiatFees } from '../lib/swap/utils/Functions';

export type Transaction = Omit<TransactionDetails, 'outputs'> & {
    addresses: string[],
    outputs: (PlainOutput & {
        fiatValue?: Partial<Record<FiatCurrency, number | typeof FIAT_PRICE_UNAVAILABLE>>,
    })[],
};

const VALID_TRANSACTION_STATES = [
    TransactionState.PENDING,
    TransactionState.MINED,
    TransactionState.CONFIRMED,
];

const scheduledHistoricFiatAmountUpdates: Partial<Record<FiatCurrency, Set<string>>> = {};

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
        // Note: this method should not be async to avoid race conditions between parallel calls. Otherwise an older
        // transaction can overwrite its updated version.
        addTransactions(txs: TransactionDetails[]) {
            if (!txs.length) return;

            const txDetails = txs.map((tx) => {
                const knownTx = this.state.transactions[tx.transactionHash];

                // Collect all addresses used in this transaction (for convenience)
                const inputAddresses = tx.inputs
                    .map((input) => input.address)
                    .filter((address) => !!address) as string[];
                const outputAddresses = tx.outputs.map((output) => output.address || output.script);

                return {
                    ...tx,
                    addresses: inputAddresses.concat(outputAddresses),
                    // Preserve known fiatValues.
                    ...(knownTx ? {
                        outputs: tx.outputs.map((output, i) => {
                            const knownOutput = knownTx.outputs[i];
                            if (!knownOutput
                                || typeof knownOutput.fiatValue === 'undefined'
                                || knownOutput.script !== output.script
                                || knownOutput.address !== output.address
                                || knownOutput.value !== output.value
                                || knownOutput.index !== output.index
                            ) return output;
                            return {
                                ...output,
                                fiatValue: knownOutput.fiatValue,
                            };
                        }),
                    } : null),
                } as Transaction;
            });

            const newTxs: { [hash: string]: Transaction } = {};
            for (const plain of txDetails) {
                // Async sub call to keep the main method synchronous to avoid race conditions with other places where
                // transactions are being overwritten like in calculateFiatAmounts, and to avoid await in loop (slow
                // sequential processing).
                detectSwap(plain);
                newTxs[plain.transactionHash] = plain;
            }

            // Need to re-assign the whole object in Vue 2 for change detection.
            // TODO: Simply assign transactions in Vue 3.
            this.state.transactions = {
                ...this.state.transactions,
                ...newTxs,
            };

            // Run async operation in background
            this.calculateFiatAmounts(Object.values(newTxs));

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

        async calculateFiatAmounts(transactions?: Transaction[], fiatCurrency?: FiatCurrency) {
            // fetch fiat amounts for transactions that have a timestamp (are mined) but no fiat amount yet
            const fiatStore = useFiatStore();
            fiatCurrency = fiatCurrency || fiatStore.currency.value;
            const historyFiatCurrency = isHistorySupportedFiatCurrency(fiatCurrency, FIAT_API_PROVIDER_TX_HISTORY)
                ? fiatCurrency
                : FiatCurrency.USD;
            const lastExchangeRateUpdateTime = fiatStore.timestamp.value;
            const currentRate = fiatStore.exchangeRates.value[CryptoCurrency.BTC]?.[fiatCurrency]; // might be pending
            const currentUsdRate = fiatStore.exchangeRates.value[CryptoCurrency.BTC]?.[FiatCurrency.USD];
            const transactionsToUpdate = (transactions || Object.values(this.state.transactions)).filter((tx) =>
                // Only update fiat amount if neither completely set for actual fiatCurrency nor historyFiatCurrency.
                // Generally, the amount for the actually requested fiatCurrency is preferred, so if that is already set
                // there is no need to fetch for the historyFiatCurrency. On the other hand, if historyFiatCurrency is
                // different to fiatCurrency, no historic amounts for fiatCurrency can be determined, thus only for new
                // transactions, and if an amount for historyFiatCurrency is already set, it's not a new transaction.
                tx.outputs.some((output) => typeof output.fiatValue?.[fiatCurrency!] !== 'number')
                    && tx.outputs.some((output) => typeof output.fiatValue?.[historyFiatCurrency] !== 'number')
                    && !scheduledHistoricFiatAmountUpdates[historyFiatCurrency]?.has(tx.transactionHash)
                    // BTC transactions don't need to be filtered by age,
                    // as the BTC price is available far enough into the past.
                    && tx.timestamp,
            ) as Array<Omit<Transaction, 'timestamp'> & { timestamp: number }>;

            if (!transactionsToUpdate.length) return;

            scheduledHistoricFiatAmountUpdates[historyFiatCurrency] ||= new Set();
            const historicTransactions: typeof transactionsToUpdate = [];
            const { swapByTransaction } = useSwapsStore().state;

            for (const tx of transactionsToUpdate) {
                for (const output of tx.outputs) {
                    output.fiatValue ||= {};
                }

                // For very recent transactions use current exchange rate without unnecessarily querying historic rates,
                // which also don't get updated minutely and might not include the newest rates yet. If the user time is
                // not set correctly, this will gracefully fall back to fetching rates for new transactions as historic
                // exchange rates; old transactions at the user's system's time might be interpreted as current though.
                const isNewTransaction = Math.abs(tx.timestamp * 1000 - lastExchangeRateUpdateTime) < 2.5 * 60 * 1000;
                if (isNewTransaction && currentRate) {
                    for (const output of tx.outputs) {
                        // Set via Vue.set to let vue handle reactivity.
                        // TODO this might be not necessary anymore with Vue3, also for the other Vue.sets in this file.
                        Vue.set(output.fiatValue!, fiatCurrency, currentRate * (output.value / 1e8));
                    }
                } else {
                    historicTransactions.push(tx);
                    scheduledHistoricFiatAmountUpdates[historyFiatCurrency]!.add(tx.transactionHash);
                }
                // For the calculation of swap limits, USD amounts of swap transactions are required. If we have the USD
                // rate already available without having to fetch it, because it's a new transaction, store it.
                if (isNewTransaction && currentUsdRate && swapByTransaction[tx.transactionHash]) {
                    for (const output of tx.outputs) {
                        Vue.set(output.fiatValue!, FiatCurrency.USD, currentUsdRate * (output.value / 1e8));
                    }
                }
            }

            if (historicTransactions.length) {
                const historicExchangeRates = await getHistoricExchangeRates(
                    CryptoCurrency.BTC,
                    historyFiatCurrency,
                    historicTransactions.map((tx) => tx.timestamp * 1000),
                    FIAT_API_PROVIDER_TX_HISTORY,
                );

                for (let tx of historicTransactions) {
                    const exchangeRate = historicExchangeRates.get(tx.timestamp * 1000);
                    // Get the newest transaction from the store in case the object changed in the meantime due to
                    // calculation of txDetails in addTransactions.
                    tx = this.state.transactions[tx.transactionHash] as typeof tx || tx;
                    for (const output of tx.outputs) {
                        Vue.set(output.fiatValue!, historyFiatCurrency, exchangeRate !== undefined
                            ? exchangeRate * (output.value / 1e8)
                            : FIAT_PRICE_UNAVAILABLE,
                        );
                    }

                    scheduledHistoricFiatAmountUpdates[historyFiatCurrency]!.delete(tx.transactionHash);
                }
            }

            // Manually notify the store of the deep changes to trigger subscriptions.
            // TODO this hack is likely not necessary in newer pinia versions.
            this.patch({});
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

// Note: this method should not modify the transaction itself or the transaction store, to avoid race conditions with
// other methods that do so.
async function detectSwap(transaction: Transaction) {
    const { state: swaps$, addFundingData, addSettlementData } = useSwapsStore();
    if (swaps$.swapByTransaction[transaction.transactionHash]) return; // already known

    const [fundingData, refundingData, settlementData] = await Promise.all([
        isHtlcFunding(transaction),
        isHtlcRefunding(transaction),
        isHtlcSettlement(transaction),
    ]);

    // HTLC Creation
    if (fundingData) {
        addFundingData(fundingData.hash, {
            asset: SwapAsset.BTC,
            transactionHash: transaction.transactionHash,
            outputIndex: fundingData.outputIndex,
            htlc: {
                address: transaction.outputs
                    .find((output) => output.address?.length === HTLC_ADDRESS_LENGTH)!
                    .address || undefined,
                script: fundingData.script,
                refundAddress: fundingData.refundAddress,
                redeemAddress: fundingData.redeemAddress,
                timeoutTimestamp: fundingData.timeoutTimestamp,
            },
        });

        const htlcAddress = transaction.outputs
            .find((output) => output.address?.length === HTLC_ADDRESS_LENGTH)!
            .address;
        if (!swaps$.swaps[fundingData.hash].out && htlcAddress) {
            // Check this swap with the Fastspot API to detect if this was a EUR swap
            const contractWithEstimate = await getContract(SwapAsset.BTC, htlcAddress).catch(() => undefined);
            if (contractWithEstimate?.to.asset === SwapAsset.EUR) {
                const exchangeRate = {
                    [CryptoCurrency.BTC]: {
                        [FiatCurrency.EUR]: getEurPerCrypto(
                            SwapAsset.BTC,
                            contractWithEstimate,
                        ),
                    },
                };
                const fiatFees = getFiatFees(
                    contractWithEstimate,
                    CryptoCurrency.BTC,
                    exchangeRate,
                    FiatCurrency.EUR,
                    null,
                );

                addSettlementData(fundingData.hash, {
                    asset: SwapAsset.EUR,
                    amount: contractWithEstimate.to.amount,
                    // We cannot get bank info or EUR HTLC details from this.
                }, {
                    fees: {
                        totalFee: fiatFees.funding.total,
                        asset: SwapAsset.EUR,
                    },
                });
            }
        }
    }

    // HTLC Refunding
    if (refundingData) {
        addSettlementData(refundingData.hash, {
            asset: SwapAsset.BTC,
            transactionHash: transaction.transactionHash,
            outputIndex: refundingData.outputIndex,
        });
    }

    // HTLC Settlement
    if (settlementData) {
        addSettlementData(settlementData.hash, {
            asset: SwapAsset.BTC,
            transactionHash: transaction.transactionHash,
            outputIndex: settlementData.outputIndex,
        });

        if (!swaps$.swaps[settlementData.hash].in) {
            // Check this swap with the Fastspot API to detect if this was a EUR swap
            const contractWithEstimate = await getContract(SwapAsset.BTC, transaction.inputs[0].address!)
                .catch(() => undefined);
            if (contractWithEstimate?.from.asset === SwapAsset.EUR) {
                const exchangeRate = {
                    [CryptoCurrency.BTC]: {
                        [FiatCurrency.EUR]: getEurPerCrypto(SwapAsset.BTC, contractWithEstimate),
                    },
                };
                const fiatFees = getFiatFees(
                    contractWithEstimate,
                    CryptoCurrency.BTC,
                    exchangeRate,
                    FiatCurrency.EUR,
                    null,
                );

                addFundingData(settlementData.hash, {
                    asset: SwapAsset.EUR,
                    amount: contractWithEstimate.from.amount,
                    // We cannot get bank info or EUR HTLC details from this.
                }, {
                    fees: {
                        totalFee: fiatFees.settlement.total,
                        asset: SwapAsset.EUR,
                    },
                });
            }
        }
    }
}

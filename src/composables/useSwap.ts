import { setupSwap } from '@/hub';
import { calculateFees, FiatSwapAsset, getFiatSwapParameters, useSwapEstimate } from '@/lib/swap/utils/CommonUtils';
import { getNetworkClient } from '@/network';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { useNetworkStore } from '@/stores/Network';
import { SwapState, useSwapsStore } from '@/stores/Swaps';
import { cancelSwap, Contract, createSwap, getSwap, PreSwap, RequestAsset, Swap } from '@nimiq/fastspot-api';
import {
    EuroHtlcSettlementInstructions,
    HtlcCreationInstructions,
    SetupSwapRequest,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { SwapAsset } from '@nimiq/libswap';
import { exchangeAuthorizationToken, getHtlc, HtlcStatus } from '@nimiq/oasis-api';
import { CryptoCurrency } from '@nimiq/utils';
import { captureException } from '@sentry/vue';
import { computed, Ref, ref } from '@vue/composition-api';
import { AssetTransferParams } from './asset-transfer/types';
import { useConfig } from './useConfig';
import { SwapLimits } from './useSwapLimits';

type KycResult = import('../swap-kyc-handler').SetupSwapWithKycResult['kyc'];

type UseSwapOptions = AssetTransferParams & {
  limits: Ref<SwapLimits | null>,
  fetchingEstimate: Ref<boolean>,
  invalid: Ref<boolean>,
  updateEstimate: () => Promise<void>,
}

export function useSwap(options: UseSwapOptions) {
    const {
        limits, rightAsset, leftAsset,
        isSelling, fiatAmount, cryptoAmount, currencyFiatFallback,
        currencyCrypto, exchangeRate, updateEstimate,
    } = options;
    const fiatAsset = currencyFiatFallback.toUpperCase() as FiatSwapAsset;

    const { activeAddress } = useAddressStore();
    const { activeAccountInfo } = useAccountStore();
    const { estimate } = useSwapEstimate();
    const estimateError = ref<string>(null);
    const swapError = ref<string>(null);
    const { config } = useConfig();
    const { setActiveSwap, setSwap, activeSwap: swap } = useSwapsStore();

    const canSign = computed(() =>
        leftAsset && rightAsset
            && !estimateError.value && !swapError.value
            && estimate.value
            && limits.value?.current.usd,
        // && !fetchingEstimate.value
        // && !insufficientBalance.value
        // && !insufficientLimit.value,
    );

    async function sign() {
        if (!canSign.value) return;

        // currentlySigning.value = true;

        // eslint-disable-next-line no-async-promise-executor
        const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
            let swapSuggestion!: PreSwap;

            const nimAddress = activeAddress.value!;

            try {
                const args: Parameters<typeof getFiatSwapParameters>[1] = isSelling
                    ? { to: { asset: SwapAsset.EUR, amount: fiatAmount.value } }
                    : { from: { amount: cryptoAmount.value } };
                const { from, to } = getFiatSwapParameters(fiatAsset, args);

                swapSuggestion = await createSwap(
                        // Need to force one of the function signatures
                        from as RequestAsset<SwapAsset>,
                        to as SwapAsset,
                );

                // Update local fees with latest feePerUnit values
                const calculateFeesFiat = isSelling
                    ? { to: currencyFiatFallback }
                    : { from: currencyFiatFallback };
                const { fundingFee } = calculateFees(calculateFeesFiat, swapSuggestion.from.amount, {
                    fiat: swapSuggestion.to.fee || 0,
                    nim: currencyCrypto === CryptoCurrency.NIM ? swapSuggestion.from.feePerUnit! : 0,
                    btc: currencyCrypto === CryptoCurrency.BTC ? swapSuggestion.from.feePerUnit! : 0,
                });

                swapSuggestion.from.fee = fundingFee;
                swapSuggestion.to.fee = 0; // OASIS' SEPA Instant fees are already included

                console.log('Swap ID:', swapSuggestion.id); // eslint-disable-line no-console

                console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                swapError.value = null;
            } catch (error: any) {
                console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                reject(error);
                return;
            }

            // Await Nimiq and Bitcoin consensus
            if (currencyCrypto === CryptoCurrency.NIM) {
                const nimiqClient = await getNetworkClient();

                if (useNetworkStore().state.consensus !== 'established') {
                    await nimiqClient.waitForConsensusEstablished();
                }

                const headHeight = await nimiqClient.getHeadHeight();
                if (headHeight > 100) {
                    useNetworkStore().state.height = headHeight;
                } else {
                    throw new Error('Invalid network state, try please reloading the app');
                }
            }
            // if (activeCurrency.value === CryptoCurrency.BTC) {
            //     const electrumClient = await getElectrumClient();
            //     await electrumClient.waitForConsensusEstablished();
            // }

            const validityStartHeight = useNetworkStore().height.value;

            // Convert the swapSuggestion to the Hub request.
            // Note that swap-kyc-handler.ts recalculates the original swapSuggestion amounts that we got from
            // createSwap, therefore if you change the calculation here, you'll likely also want to change it there.

            // TODO: Validate swap data against estimate

            let fund: HtlcCreationInstructions | null = null;
            const redeem: EuroHtlcSettlementInstructions /* TODO: Eur is same as CRC */ | null = null;

            if (swapSuggestion.from.asset === SwapAsset.NIM) {
                fund = {
                    type: 'NIM',
                    sender: nimAddress,
                    value: swapSuggestion.from.amount,
                    fee: swapSuggestion.from.fee,
                    validityStartHeight,
                };
            }

            // if (swapSuggestion.from.asset === SwapAsset.BTC) {
            //     // Assemble BTC inputs
            //     // Transactions to an HTLC are 48 weight units bigger because of the longer recipient address
            //     const requiredInputs = selectOutputs(
            //         accountUtxos.value, swapSuggestion.from.amount, swapSuggestion.from.feePerUnit, 48);
            //     let changeAddress: string | undefined;
            //     if (requiredInputs.changeAmount > 0) {
            //         const { nextChangeAddress } = useBtcAddressStore();
            //         if (!nextChangeAddress.value) {
            //             // FIXME: If no unused change address is found, need to request new ones from Hub!
            //             throw new Error('No more unused change addresses (not yet implemented)');
            //         }
            //         changeAddress = nextChangeAddress.value;
            //     }

            //     fund = {
            //         type: 'BTC',
            //         inputs: requiredInputs.utxos.map((utxo) => ({
            //             address: utxo.address,
            //             transactionHash: utxo.transactionHash,
            //             outputIndex: utxo.index,
            //             outputScript: utxo.witness.script,
            //             value: utxo.witness.value,
            //         })),
            //         output: {
            //             value: swapSuggestion.from.amount,
            //         },
            //         ...(requiredInputs.changeAmount > 0 ? {
            //             changeOutput: {
            //                 address: changeAddress!,
            //                 value: requiredInputs.changeAmount,
            //             },
            //         } : {}),
            //         refundAddress: btcAddress,
            //     };
            // }

            // if (swapSuggestion.to.asset === SwapAsset.EUR) {
            //     redeem = {
            //         type: SwapAsset.EUR,
            //         value: swapSuggestion.to.amount,
            //         fee: swapSuggestion.to.fee,
            //         bankLabel: bank.value?.name,
            //         settlement: config.environment === ENV_MAIN ? {
            //             type: OasisTransactionType.SEPA,
            //             recipient: {
            //                 name: bankAccount.value!.accountName,
            //                 iban: bankAccount.value!.iban,
            //                 bic: bank.value!.BIC,
            //             },
            //         } : {
            //             type: OasisTransactionType.MOCK,
            //         },
            //     };
            // }

            if (!fund || !redeem) {
                reject(new Error('UNEXPECTED: No funding or redeeming data objects'));
                return;
            }

            const serviceSwapFee = Math.round(
                (swapSuggestion.from.amount - swapSuggestion.from.serviceNetworkFee)
                    * swapSuggestion.serviceFeePercentage,
            );

            const request: Omit<SetupSwapRequest, 'appName'> = {
                accountId: activeAccountInfo.value!.id,
                swapId: swapSuggestion.id,
                fund,
                redeem,
                fiatCurrency: currencyFiatFallback,
                fundingFiatRate: exchangeRate.value,
                redeemingFiatRate: 1, // 1 fiat currency = 1 fiat currency
                fundFees: {
                    processing: 0,
                    redeeming: swapSuggestion.from.serviceNetworkFee,
                },
                redeemFees: {
                    funding: swapSuggestion.to.serviceNetworkFee,
                    processing: swapSuggestion.to.serviceEscrowFee,
                },
                serviceSwapFee,
            };

            resolve(request);
        });

        let signedTransactions: SetupSwapResult | null;
        let kycGrantTokens: KycResult | undefined;
        try {
            const setupSwapResult = await setupSwap(hubRequest);
            if (setupSwapResult === undefined) return; // Using Hub redirects
            if (setupSwapResult && 'kyc' in setupSwapResult) {
                ({ kyc: kycGrantTokens, ...signedTransactions } = setupSwapResult);
            } else {
                signedTransactions = setupSwapResult; // can be null if the hub popup was cancelled
            }
        } catch (error: any) {
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = error.message;
            cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        const { swapId } = (await hubRequest);

        if (!signedTransactions) {
            // Hub popup cancelled
            cancelSwap({ id: swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        if (typeof signedTransactions.eur !== 'string' || (!signedTransactions.nim && !signedTransactions.btc)) {
            const error = new Error('Internal error: Hub result did not contain EUR or (NIM|BTC) data');
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = error.message;
            cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        console.log('Signed:', signedTransactions, 'KYC tokens', kycGrantTokens); // eslint-disable-line no-console

        // Fetch contract from Fastspot and confirm that it's confirmed.
        // In parallel convert OASIS KYC grant token to OASIS authorization token for OASIS settlements (for OASIS
        // clearings, this is already happening in the Hub at Fastspot swap confirmation).
        let confirmedSwap: Swap;
        let settlementAuthorizationToken: string | undefined;
        try {
            const request = await hubRequest; // already resolved
            // TODO: Retry getting the swap if first time fails
            let swapOrPreSwap: Swap | PreSwap;
            [swapOrPreSwap, settlementAuthorizationToken] = await Promise.all([
                getSwap(swapId),
                request.redeem.type === SwapAsset.EUR && kycGrantTokens?.oasisGrantToken
                    ? exchangeAuthorizationToken(kycGrantTokens.oasisGrantToken)
                    : undefined,
            ]);
            if (!('contracts' in swapOrPreSwap)) {
                throw new Error('UNEXPECTED: No `contracts` in supposedly confirmed swap');
            }
            confirmedSwap = swapOrPreSwap;

            // Apply the correct local fees from the swap request
            confirmedSwap.from.fee = request.fund.type === SwapAsset.NIM
                ? request.fund.fee
                : request.fund.type === SwapAsset.BTC
                    ? request.fund.inputs.reduce((sum, input) => sum + input.value, 0)
                            - request.fund.output.value
                            - (request.fund.changeOutput?.value || 0)
                    : 0;
            confirmedSwap.to.fee = (request.redeem as EuroHtlcSettlementInstructions).fee;
        } catch (error) {
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = 'Invalid swap state, swap aborted!';
            cancelSwap({ id: swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        const nimHtlcAddress = signedTransactions.nim?.raw.recipient;

        setActiveSwap({
            ...confirmedSwap,
            // Place NIM HTLC address into the swap object, as it's otherwise unknown for NIM-to-EUR swaps
            ...(nimHtlcAddress ? { contracts: {
                ...confirmedSwap.contracts,
                [SwapAsset.NIM]: {
                    ...confirmedSwap.contracts[SwapAsset.NIM]!,
                    htlc: {
                        ...confirmedSwap.contracts[SwapAsset.NIM]!.htlc,
                        address: nimHtlcAddress,
                    },
                },
            } } : {}),
            state: SwapState.SIGN_SWAP,
            stateEnteredAt: Date.now(),
            watchtowerNotified: false,
            fundingSerializedTx: confirmedSwap.from.asset === SwapAsset.NIM
                ? signedTransactions.nim!.serializedTx
                : signedTransactions.btc!.serializedTx,
            settlementSerializedTx: signedTransactions.eur,
            settlementAuthorizationToken,
        });

        // Fetch OASIS HTLC to get clearing instructions
        const eurContract = confirmedSwap.contracts[SwapAsset.EUR] as Contract<SwapAsset.EUR>;
        const oasisHtlc = await getHtlc(eurContract.htlc.address);
        if (oasisHtlc.status !== HtlcStatus.PENDING && oasisHtlc.status !== HtlcStatus.CLEARED) {
            const error = new Error(`UNEXPECTED: OASIS HTLC is not 'pending'/'cleared' but '${oasisHtlc.status}'`);
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = 'Invalid OASIS contract state, swap aborted!';
            cancelSwap({ id: swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        // Validate OASIS HTLC details
        try {
            // Check hash
            if (oasisHtlc.hash.value !== confirmedSwap.hash) {
                throw new Error('OASIS HTLC hash does not match Fastspot swap hash');
            }
            // Check amount (OASIS processing fee is not included in Fastspot amount)
            if (oasisHtlc.amount !== confirmedSwap.to.amount) {
                throw new Error('OASIS HTLC amount does not match swap amount');
            }

                // For selling, Fastspot can sometimes report a wrongly rounded fee. Since for this direction
                // it is not important for the user what the exact fee is (that Fastspot pays to OASIS),
                // we are taking the fee that OASIS reports, so we don't run into an HTLC validation error.
                swap.value!.to.serviceEscrowFee = oasisHtlc.fee;
        } catch (error) {
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = 'Invalid OASIS contract, swap aborted!';
            cancelSwap({ id: swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        // Add swap details to swap store
        setSwap(confirmedSwap.hash, {
            id: confirmedSwap.id,
            fees: {
                totalFee: options.fiatFees.total,
                asset: confirmedSwap.to.asset,
            },
        });

        setActiveSwap({
            ...swap.value!,
            state: SwapState.AWAIT_INCOMING,
            stateEnteredAt: Date.now(),
        });

        if (config.fastspot.watchtowerEndpoint) {
            let settlementSerializedTx = swap.value!.settlementSerializedTx!;

            // In case of a OASIS settlement instruction, we need to wrap it into a JSON object
            if (swap.value!.to.asset === 'EUR') {
                settlementSerializedTx = JSON.stringify({
                    preimage: '0000000000000000000000000000000000000000000000000000000000000000',
                    settlement: settlementSerializedTx,
                });
            }

            // Send redeem transaction to watchtower
            fetch(`${config.fastspot.watchtowerEndpoint}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(swap.value!.to.asset === 'EUR' && settlementAuthorizationToken
                        ? { 'X-OASIS-Settle-Token': settlementAuthorizationToken }
                        : null
                    ),
                },
                body: JSON.stringify({
                    id: confirmedSwap.id,
                    endpoint: new URL(config.fastspot.apiEndpoint).host,
                    apikey: config.fastspot.apiKey,
                    redeem: settlementSerializedTx,
                    ...(signedTransactions.refundTx ? { refund: signedTransactions.refundTx } : {}),
                }),
            }).then(async (response) => {
                if (!response.ok) {
                    throw new Error((await response.json()).message);
                }

                setActiveSwap({
                    ...swap.value!,
                    watchtowerNotified: true,
                });
                console.debug('Swap watchtower notified'); // eslint-disable-line no-console
            }).catch((error) => {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
            });
        }

        // setTimeout(() => currentlySigning.value = false, 1000);
    }

    return {
        sign,
    };
}

import {
    FiatCurrency,
    CryptoCurrency,
    OASIS_CRC_DETECTION_DELAY,
    FIAT_CURRENCIES_OFFERED,
    ENV_MAIN,
    SINPE_MOVIL_PAIRS,
} from '@/lib/Constants';
import { computed, ref } from '@vue/composition-api';
import { selectedFiatCurrency,
    fiatFees,
    useCurrentLimitFiat,
    useCurrentLimitCrypto,
    calculateFees,
    getFiatSwapParameters,
    FiatSwapCurrency } from '@/lib/swap/utils/CommonUtils';
import { i18n } from '@/i18n/i18n-setup';
import { useAddressStore } from '@/stores/Address';
import { useSwapsStore, SwapState } from '@/stores/Swaps';
import { useFiatStore } from '@/stores/Fiat';
import { FundingFees } from '@/lib/swap/utils/Functions';
import { setupSwap } from '@/hub';
import { getNetworkClient } from '@/network';
import { useAccountStore } from '@/stores/Account';
import { useNetworkStore } from '@/stores/Network';
import { cancelSwap, Contract, createSwap, getSwap, PreSwap, RequestAsset, Swap, SwapAsset } from '@nimiq/fastspot-api';
import {
    SinpeMovilHtlcSettlementInstructions,
    HtlcCreationInstructions,
    SetupSwapRequest,
    SetupSwapResult,
    NimiqHtlcSettlementInstructions,
    NimiqHtlcCreationInstructions,
    SinpeMovilHtlcCreationInstructions,
} from '@nimiq/hub-api';
import {
    getHtlc,
    HtlcStatus,
    TransactionType as OasisTransactionType,
} from '@nimiq/oasis-api';
import { captureException } from '@sentry/vue';
import router, { RouteName } from '@/router';
import { useSinpeMovilStore } from '@/stores/SinpeMovil';
import { SwapLimits, useSwapLimits } from '../useSwapLimits';
import SinpeUserInfo from '../../components/SinpeUserInfo.vue';
import AddressSelector from '../../components/AddressSelector.vue';
import { AssetTransferOptions, AssetTransferParams } from './types';
import { useConfig } from '../useConfig';

function isCryptoCurrency(currency: any): currency is CryptoCurrency {
    return Object.values(CryptoCurrency).includes(currency.toLocaleLowerCase() as CryptoCurrency);
}

function isFiatCurrency(currency: any): currency is FiatCurrency {
    return Object.values(FiatCurrency).includes(currency.toLocaleLowerCase() as FiatCurrency);
}

export async function useSinpeMovilSwap(options: AssetTransferOptions): Promise<AssetTransferParams> {
    const { fiatAmount, cryptoAmount, estimate, estimateError, pair, updateEstimate, fetchingEstimate } = options;
    const [leftAsset, rightAsset] = pair;

    if (!SINPE_MOVIL_PAIRS.some(([from, to]) => from === leftAsset && to === rightAsset)) {
        throw new Error('Invalid pair for SinpeMovil swap');
    }

    const { label: sinpeLabel, phoneNumber, smsApiToken } = useSinpeMovilStore();
    if (!smsApiToken.value) {
        // eslint-disable-next-line no-console
        console.error('SinpeMovil API token not set. Redirecting to Mobile verification');
        router.push({ name: RouteName.SinpeMovilMobileVerification, params: { pair: JSON.stringify(pair) } });
    }

    const fiatCurrency = isFiatCurrency(leftAsset) ? leftAsset : rightAsset;
    const cryptoCurrency = isCryptoCurrency(leftAsset) ? leftAsset : rightAsset;

    // Code in the wallet rely on the global "selectedFiatCurrency" for swaps
    selectedFiatCurrency.value = fiatCurrency.toLocaleLowerCase() as FiatSwapCurrency;

    // Loading the CRC currency is lazy, we need to explicitly set it
    await useFiatStore().updateExchangeRates({ fiatCurrency: selectedFiatCurrency.value });

    const isSelling = leftAsset === cryptoCurrency;

    // const decimalsCrypto = computed(() => calculateDisplayedDecimals(fiatAmount.value, cryptoCurrency));
    const decimalsCrypto = computed(() => 5);
    const decimalsFiat = computed(() => 2);

    const { activeAddress, accountBalance } = useAddressStore();

    const { exchangeRates } = useFiatStore();
    const exchangeRate = computed(() => {
        if (!FIAT_CURRENCIES_OFFERED.includes(selectedFiatCurrency.value as any)) {
            return 0; // No exchange rate available yet
        }

        const rate = exchangeRates.value[cryptoCurrency.toLocaleLowerCase()]?.[selectedFiatCurrency.value] || 0;
        return rate;
    });

    const nimAddress = computed(() => activeAddress.value!);
    const { limits } = useSwapLimits({ nimAddress: nimAddress.value });
    const currentLimitUsd = useCurrentLimitFiat(limits);
    const currentLimitFiat = computed(() => {
        if (!currentLimitUsd.value) return 0;
        const usdRate = exchangeRates.value.usdc?.[selectedFiatCurrency.value] || 0;
        return currentLimitUsd.value * usdRate;
    });

    // TODO move this to vue component
    const insufficientBalance = computed(() => cryptoAmount.value > 0 && cryptoAmount.value > accountBalance.value);
    const currentLimitCrypto = useCurrentLimitCrypto(currentLimitFiat);
    const insufficientLimit = computed(() => {
        const cryptoLimit = currentLimitCrypto?.value || Number.POSITIVE_INFINITY;
        return (cryptoAmount.value > cryptoLimit || fiatAmount.value > currentLimitFiat.value);
    });

    const { activeAccountInfo } = useAccountStore();

    const addressListOpened = ref(false);

    const { activeSwap: swap, setActiveSwap, setSwap } = useSwapsStore();
    const { config } = useConfig();

    const oasisLimitExceeded = isSelling
        ? ((await import('@/lib/swap/utils/SellUtils')).oasisSellLimitExceeded)
        : ((await import('@/lib/swap/utils/BuyUtils')).oasisBuyLimitExceeded);

    const swapError = ref<string>(null);

    const canSign = computed(() =>
        !!fiatAmount.value
        && estimateError.value === null
        && swapError.value === null
        && estimate.value !== null
        && sinpeLabel.value !== null && phoneNumber.value !== null && smsApiToken.value !== null
        && (limits.value?.current?.usd || 0) > 0
        && !fetchingEstimate.value
        && !insufficientBalance.value
        && !insufficientLimit.value
        && !oasisLimitExceeded.value,
    );

    async function sign() {
        console.log('Signing swap...', canSign.value); // eslint-disable-line no-console

        if (!canSign.value) return;

        // eslint-disable-next-line no-async-promise-executor
        const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
            let swapSuggestion!: PreSwap;

            try {
                const args: Parameters<typeof getFiatSwapParameters>[1] = fiatAmount.value
                    ? { to: { asset: SwapAsset.CRC, amount: fiatAmount.value } }
                    : { from: { amount: cryptoAmount.value } };
                const { from, to } = getFiatSwapParameters(SwapAsset.CRC, args);

                swapSuggestion = await createSwap(from as RequestAsset<SwapAsset>, to as SwapAsset);

                // Update local fees with latest feePerUnit values
                const { fundingFee } = calculateFees({ to: FiatCurrency.CRC }, swapSuggestion.from.amount, {
                    fiat: swapSuggestion.to.fee || 0,
                    nim: swapSuggestion.from.feePerUnit!,
                    btc: 0,
                });

                swapSuggestion.from.fee = fundingFee;
                swapSuggestion.to.fee = 0;

                console.log('Swap ID:', swapSuggestion.id); // eslint-disable-line no-console

                console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                swapError.value = null;
            } catch (error: any) {
                console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                reject(error);
                return;
            }

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

            const validityStartHeight = useNetworkStore().height.value;

            // Convert the swapSuggestion to the Hub request.
            // Note that swap-kyc-handler.ts recalculates the original swapSuggestion amounts that we got from
            // createSwap, therefore if you change the calculation here, you'll likely also want to change it there.

            // TODO: Validate swap data against estimate

            let fund: HtlcCreationInstructions | null = null;
            let redeem: SinpeMovilHtlcSettlementInstructions | null = null;

            if (swapSuggestion.from.asset === SwapAsset.NIM) {
                fund = {
                    type: 'NIM',
                    sender: nimAddress.value,
                    value: swapSuggestion.from.amount,
                    fee: swapSuggestion.from.fee,
                    validityStartHeight,
                };
            }

            if (swapSuggestion.to.asset === SwapAsset.CRC) {
                redeem = {
                    type: SwapAsset.CRC,
                    value: swapSuggestion.to.amount,
                    fee: swapSuggestion.to.fee,
                    recipientLabel: sinpeLabel.value!,
                    settlement: config.environment === ENV_MAIN ? {
                        type: OasisTransactionType.SINPEMOVIL,
                        phoneNumber: phoneNumber.value!,
                    } : {
                        type: OasisTransactionType.MOCK,
                    },
                };
            }

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
                fiatCurrency,
                fundingFiatRate:
                        exchangeRates.value[swapSuggestion.from.asset.toLowerCase()][selectedFiatCurrency.value]!,
                redeemingFiatRate: 1, // 1 CRC = 1 CRC
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
        try {
            const setupSwapResult = await setupSwap(hubRequest);
            if (setupSwapResult === undefined) return; // Using Hub redirects
            signedTransactions = setupSwapResult; // can be null if the hub popup was cancelled
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

        if (typeof signedTransactions.crc !== 'string' || (!signedTransactions.nim && !signedTransactions.btc)) {
            const error = new Error('Internal error: Hub result did not contain CRC or (NIM|BTC) data');
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = error.message;
            cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
            // currentlySigning.value = false;
            updateEstimate();
            return;
        }

        console.log('Signed:', signedTransactions); // eslint-disable-line no-console

        // Fetch contract from Fastspot and confirm that it's confirmed.
        // In parallel convert OASIS KYC grant token to OASIS authorization token for OASIS settlements (for OASIS
        // clearings, this is already happening in the Hub at Fastspot swap confirmation).
        let confirmedSwap: Swap;
        let settlementAuthorizationToken: string | undefined;
        try {
            const request = await hubRequest; // already resolved
            if (!request) return;

            const swapOrPreSwap = await retryOperation(() => getSwap(swapId), { retries: 5, delay: 5_000 });
            if (!swapOrPreSwap || !('contracts' in swapOrPreSwap)) {
                throw new Error('UNEXPECTED: No `contracts` in supposedly confirmed swap');
            }
            confirmedSwap = swapOrPreSwap;

            // Apply the correct local fees from the swap request
            type HtlcCreationInstructions = NimiqHtlcCreationInstructions | SinpeMovilHtlcCreationInstructions;
            confirmedSwap.from.fee = (request.fund as HtlcCreationInstructions).fee;
            type HtlcSettlementInstructions = NimiqHtlcSettlementInstructions | SinpeMovilHtlcSettlementInstructions;
            confirmedSwap.to.fee = (request.redeem as HtlcSettlementInstructions).fee;
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
            // Place NIM HTLC address into the swap object, as it's otherwise unknown for NIM-to-CRC swaps
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
            settlementSerializedTx: signedTransactions.crc,
            settlementAuthorizationToken,
            settlementSmsToken: smsApiToken.value!,
            phoneNumber: phoneNumber.value!,
        });

        // Fetch OASIS HTLC to get clearing instructions
        const crcContract = confirmedSwap.contracts[SwapAsset.CRC] as Contract<SwapAsset.CRC>;
        const oasisHtlc = await retryOperation(() => getHtlc(crcContract.htlc.address), { delay: 10_000, retries: 10 });

        if (!oasisHtlc || (oasisHtlc.status !== HtlcStatus.PENDING && oasisHtlc.status !== HtlcStatus.CLEARED)) {
            const error = new Error(`UNEXPECTED: OASIS HTLC is not 'pending'/'cleared' but '${oasisHtlc?.status}'`);
            if (config.reportToSentry) captureException(error);
            else console.error(error); // eslint-disable-line no-console
            swapError.value = 'Invalid OASIS contract state, swap aborted!';
            cancelSwap({ id: swapId } as PreSwap);
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
                throw new Error(`OASIS HTLC amount (${oasisHtlc.amount}) doesn't match with `
                    + `confirmed swap (${confirmedSwap.to.amount})`);
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
                totalFee: fiatFees.value.funding.total,
                asset: confirmedSwap.to.asset,
            },
        });

        setActiveSwap({
            ...swap.value!,
            state: SwapState.AWAIT_INCOMING,
            stateEnteredAt: Date.now(),
            settlementSmsToken: smsApiToken.value!,
            phoneNumber: phoneNumber.value!,
        });

        if (config.fastspot.watchtowerEndpoint) {
            let settlementSerializedTx = swap.value!.settlementSerializedTx!;

            // In case of a OASIS settlement instruction, we need to wrap it into a JSON object
            if (swap.value!.to.asset === SwapAsset.CRC) {
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
                    ...(swap.value!.to.asset === SwapAsset.CRC && settlementAuthorizationToken
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
    }

    return {
        isSelling,

        leftAsset,
        rightAsset,

        currencyFiatFallback: fiatCurrency,
        currencyCrypto: cryptoCurrency,

        exchangeRate,

        decimalsCrypto,
        decimalsFiat,

        limits: computed(() => limits.value) as unknown as SwapLimits,
        currentLimitCrypto,
        currentLimitFiat,
        fiatFees: computed(() => fiatFees.value.funding) as unknown as FundingFees,

        componentLeft: isSelling ? AddressSelector : SinpeUserInfo,
        componentRight: !isSelling ? AddressSelector : SinpeUserInfo,
        addressListOpened,

        modalTitle: isSelling ? (i18n.t('Sell Crypto') as string) : (i18n.t('Buy Crypto') as string),

        swap,
        estimateError,
        estimate,

        detectionDelay: OASIS_CRC_DETECTION_DELAY,

        oasisLimitExceeded,

        invalidReason: computed(() => {
            if (insufficientBalance.value) return 'insufficient-balance';
            if (insufficientLimit.value) return 'insufficient-limit';
            return '';
        }),

        canSign,
        sign,
    } as AssetTransferParams;
}

interface RetryOperationOptions {
    /**
     * The number of retries to attempt before giving up.
     * @default 3
     */
    retries?: number;
    /**
     * The delay between retries in milliseconds.
     * @default 1_000
     */
    delay?: number;
}

/**
 * Attempts to execute a given asynchronous operation with a specified number of retries.
 *
 * @template T - The return type of the operation.
 * @param operation - The asynchronous operation to be performed.
 * @param options - The options for retrying the operation.
 * @param _attempt - The current attempt count (used internally for recursion).
 * @returns A promise that resolves with the operation result, or null if all attempts fail.
 */
async function retryOperation<T>(
    operation: () => Promise<T>,
    { delay = 1_000, retries = 3 }: RetryOperationOptions = {},
    _attempt = 1,
): Promise<T | null> {
    try {
        return await operation();
    } catch (error) {
        if (_attempt > retries) {
            // eslint-disable-next-line no-console
            console.error(`Operation failed after ${retries} attempts:`, error);
            return null;
        }

        // eslint-disable-next-line no-console
        console.warn(`${_attempt} attempt failed, retrying in ${delay / 1000} seconds...`);
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        return retryOperation(operation, { delay, retries }, _attempt + 1);
    }
}

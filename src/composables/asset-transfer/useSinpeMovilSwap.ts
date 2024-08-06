import {
    FiatCurrency,
    CryptoCurrency,
    OASIS_CRC_DETECTION_DELAY,
    FIAT_CURRENCIES_OFFERED,
    ENV_MAIN,
} from '@/lib/Constants';
import { computed, ref, watch } from '@vue/composition-api';
import { selectedFiatCurrency,
    fiatFees,
    useCurrentLimitFiat,
    useCurrentLimitCrypto,
    calculateFees,
    getFiatSwapParameters,
    useSwapEstimate,
    capDecimals,
    FiatSwapCurrency,
} from '@/lib/swap/utils/CommonUtils';
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
import { useSinpeMovilStore } from '@/stores/SinpeMovil';
import router, { RouteName } from '@/router';
import { SwapLimits, useSwapLimits } from '../useSwapLimits';
import SinpeUserInfo from '../../components/SinpeUserInfo.vue';
import AddressSelector from '../../components/AddressSelector.vue';
import { AssetTransferOptions, AssetTransferParams } from './types';
import { useConfig } from '../useConfig';

// Union of all the possible fiat currencies that can be used with SinpeMovil
type SinpeFiatCurrencies = FiatCurrency.CRC;

function isCryptoCurrency(currency: any): currency is CryptoCurrency {
    return Object.values(CryptoCurrency).includes(currency.toLocaleLowerCase() as CryptoCurrency);
}

function isFiatCurrency(currency: any): currency is SinpeFiatCurrencies {
    return Object.values(FiatCurrency).includes(currency.toLocaleLowerCase() as FiatCurrency);
}

export async function useSinpeMovilSwap(options: AssetTransferOptions): Promise<AssetTransferParams> {
    const { label: sinpeLabel, phoneNumber, smsApiToken } = useSinpeMovilStore();
    if (!smsApiToken.value) {
        // eslint-disable-next-line no-console
        console.error('SinpeMovil API token not set. Redirecting to Mobile verification');
        router.push({ name: RouteName.SinpeMovilMobileVerification, params: { pair: JSON.stringify(options.pair) } });
    }

    const [leftAsset, rightAsset] = options.pair;
    const fiatCurrency = isFiatCurrency(leftAsset) ? leftAsset : rightAsset;
    const cryptoCurrency = isCryptoCurrency(leftAsset) ? leftAsset : rightAsset;

    // Code in the wallet rely on the global "selectedFiatCurrency" for swaps
    selectedFiatCurrency.value = fiatCurrency.toLocaleLowerCase() as FiatSwapCurrency;

    // Loading the CRC currency is lazy, we need to explicitly set it
    await useFiatStore().updateExchangeRates({ fiatCurrency: selectedFiatCurrency.value });

    const isSelling = leftAsset === cryptoCurrency;

    const { estimate } = useSwapEstimate();

    const fiatAmount = ref(0);
    const cryptoAmount = ref(0);

    // const decimalsCrypto = computed(() => calculateDisplayedDecimals(fiatAmount.value, cryptoCurrency));
    const decimalsCrypto = computed(() => 5);
    const decimalsFiat = computed(() => 0);

    const { activeAddress, accountBalance } = useAddressStore();

    const { exchangeRates } = useFiatStore();
    const exchangeRate = computed(() => {
        if (!FIAT_CURRENCIES_OFFERED.includes(selectedFiatCurrency.value)) {
            return 0; // No exchange rate available yet
        }

        const rate = exchangeRates.value[cryptoCurrency]?.[fiatCurrency] || 0;
        return rate;
    });

    const nimAddress = computed(() => activeAddress.value!);
    const { limits } = useSwapLimits({ nimAddress: nimAddress.value });
    const currentLimitUsd = useCurrentLimitFiat(limits);
    let a = 0;
    const currentLimitFiat = computed(() => {
        // TODO Remove this console.log
        console.log({currentLimitUsd: currentLimitUsd.value, a: a++});
        if (!currentLimitUsd.value) return 0;
        const usdRate = exchangeRates.value[CryptoCurrency.USDC][fiatCurrency] || 0;
        return currentLimitUsd.value * usdRate;
    });

    const insufficientBalance = computed(() => cryptoAmount.value > 0 && cryptoAmount.value > accountBalance.value);
    const currentLimitCrypto = useCurrentLimitCrypto(currentLimitFiat);
    const insufficientLimit = computed(() => {
        const cryptoLimit = currentLimitCrypto?.value || Number.POSITIVE_INFINITY;
        console.log({cryptoLimit});
        return (cryptoAmount.value > cryptoLimit || fiatAmount.value > currentLimitFiat.value);
    });

    const { activeAccountInfo } = useAccountStore();

    const addressListOpened = ref(false);

    const { activeSwap: swap, setActiveSwap, setSwap } = useSwapsStore();
    const { config } = useConfig();

    const swapError = ref<string>(null);

    const fetchingEstimate = ref(false);

    let timeoutId: number;

    let updateEstimateFn: (args: any) => Promise<void>;
    const estimateError = ref<string>(null);

    async function updateEstimate() {
        clearTimeout(timeoutId);

        fetchingEstimate.value = true;

        if (!updateEstimateFn) {
            updateEstimateFn = isSelling
                ? await import('@/lib/swap/utils/SellUtils').then((module) => module.updateSellEstimate)
                : await import('@/lib/swap/utils/BuyUtils').then((module) => module.updateBuyEstimate);
        }

        const args = fiatAmount.value
            ? { fiatAmount: fiatAmount.value, fiatAsset: fiatCurrency.toUpperCase() }
            : { cryptoAmount: cryptoAmount.value, fiatAsset: fiatCurrency.toUpperCase() };
        await updateEstimateFn!(args).then(() => {
            estimateError.value = null;
        }).catch((error: any) => {
            console.warn(error); // eslint-disable-line no-console
            estimateError.value = error.message;
        });

        fetchingEstimate.value = false;
    }

    const syncing = ref(false);

    watch([fiatAmount, cryptoAmount], ([newFiat, newCrypto], oldValues) => {
        if (syncing.value) return;
        if (!newFiat && !newCrypto) {
            estimate.value = null;
            estimateError.value = null;
            return;
        }

        const [oldFiat, oldCrypto] = oldValues || [undefined, undefined];
        syncing.value = true;
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            updateEstimate();
            syncing.value = false;
        }, 500);
        if (estimate.value && newFiat !== oldFiat) {
            cryptoAmount.value = capDecimals(
                estimate.value.from.amount + estimate.value.from.fee, estimate.value.from.asset);
        } else if (estimate.value && newCrypto !== oldCrypto) {
            fiatAmount.value = estimate.value.to.amount - estimate.value.to.fee;
        }
        fetchingEstimate.value = true;
    });

    const canSign = computed(() =>
        !!fiatAmount.value
        && estimateError.value === null
        && swapError.value === null
        && estimate.value !== null
        && sinpeLabel.value !== null && phoneNumber.value !== null
        && (limits.value?.current?.usd || 0) > 0
        && !fetchingEstimate.value
        && !insufficientBalance.value
        && !insufficientLimit.value,
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

            // TODO: Retry getting the swap if first time fails
            const swapOrPreSwap: Swap | PreSwap = await getSwap(swapId);
            if (!('contracts' in swapOrPreSwap)) {
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
        });

        // Fetch OASIS HTLC to get clearing instructions
        const crcContract = confirmedSwap.contracts[SwapAsset.CRC] as Contract<SwapAsset.CRC>;
        const oasisHtlc = await getHtlc(crcContract.htlc.address);
        if (!oasisHtlc || (oasisHtlc.status !== HtlcStatus.PENDING && oasisHtlc.status !== HtlcStatus.CLEARED)) {
            const error = new Error(`UNEXPECTED: OASIS HTLC is not 'pending'/'cleared' but '${oasisHtlc?.status}'`);
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
        currencyCrypto: isCryptoCurrency(rightAsset) ? rightAsset : leftAsset,

        fiatAmount,
        updateFiatAmount: (value: number) => fiatAmount.value = value,
        cryptoAmount,
        updateCryptoAmount: (value: number) => cryptoAmount.value = value,
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

        modalTitle: i18n.t('Sell Crypto') as string,

        swap,
        estimateError,

        detectionDelay: OASIS_CRC_DETECTION_DELAY,

        oasisSellLimitExceeded: true,

        invalidReason: computed(() => {
            if (insufficientBalance.value) return 'insufficient-balance';
            if (insufficientLimit.value) return 'insufficient-limit';
            return '';
        }),

        canSign,
        sign,
    } as AssetTransferParams;
}

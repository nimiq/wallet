import Config from 'config';
import { AssetList, Estimate, getAssets, RequestAsset, SwapAsset } from '@nimiq/fastspot-api';
import { CurrencyInfo } from '@nimiq/utils';
import { computed, onUnmounted, ref, getCurrentInstance } from '@vue/composition-api';
import { useSwapLimits } from '../../../composables/useSwapLimits';
import { useAccountStore } from '../../../stores/Account';
import { useAddressStore } from '../../../stores/Address';
import { useFiatStore } from '../../../stores/Fiat';
import { useSettingsStore } from '../../../stores/Settings';
import { CryptoCurrency, FiatCurrency } from '../../Constants';
import { calculateDisplayedDecimals } from '../../NumberFormatting';
import { estimateFees, selectOutputs } from '../../BitcoinTransactionUtils';
import { useBtcAddressStore } from '../../../stores/BtcAddress';
import { btcMaxSendableAmount } from './SellUtils';

const { activeAddress } = useAddressStore();
const { exchangeRates } = useFiatStore();
const { activeCurrency } = useAccountStore();
const { btcUnit } = useSettingsStore();
const { accountUtxos } = useBtcAddressStore();

const { limits } = useSwapLimits({ nimAddress: activeAddress.value! });

/**
 * Common - everything common to Buy and Sell crypto
 *  - Refs
 *  - Computeds
 *  - Functions
 */

/**
 * Common - Refs
 */

export const estimate = ref<Estimate>(null);
export const assets = ref<AssetList>(null);
// Currently there is only EUR available to swap, but it may change in the future.
export const selectedFiatCurrency = ref(FiatCurrency.EUR);

/**
 * Common - Computeds
 */

export const currentLimitFiat = computed(() => {
    if (!limits.value) return null;

    const nimRate = exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
    if (!nimRate) return null;

    return Math.floor((limits.value.current.luna / 1e5) * nimRate);
});

export const currentLimitCrypto = computed(() => {
    if (!currentLimitFiat.value) return null;

    const rate = exchangeRates.value[activeCurrency.value][selectedFiatCurrency.value];
    if (!rate) return null;

    return capDecimals(
        (currentLimitFiat.value / rate) * (activeCurrency.value === CryptoCurrency.NIM ? 1e5 : 1e8),
        activeCurrency.value.toUpperCase() as SwapAsset,
    );
});

export const fiatCurrencyInfo = computed(() =>
    new CurrencyInfo(selectedFiatCurrency.value),
);

export const eurPerNim = computed(() => {
    const data = estimate.value;

    if (data && data.from.asset === SwapAsset.NIM) {
        const eur = data.to.amount + data.to.serviceEscrowFee + data.to.serviceNetworkFee;
        const nim = data.from.amount - data.from.serviceNetworkFee;

        return (eur / 100) / (nim / 1e5);
    }

    if (data && data.to.asset === SwapAsset.NIM) {
        const eur = data.from.amount - data.from.serviceEscrowFee - data.from.serviceNetworkFee;
        const nim = data.to.amount + data.to.serviceNetworkFee;

        return (eur / 100) / (nim / 1e5);
    }

    return exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
});

export const eurPerBtc = computed(() => {
    const data = estimate.value;

    if (data && data.from.asset === SwapAsset.BTC) {
        const eur = data.to.amount + data.to.serviceEscrowFee + data.to.serviceNetworkFee;
        const btc = data.from.amount - data.from.serviceNetworkFee;

        return (eur / 100) / (btc / 1e8);
    }

    if (data && data.to.asset === SwapAsset.BTC) {
        const eur = data.from.amount - data.from.serviceEscrowFee - data.from.serviceNetworkFee;
        const btc = data.to.amount + data.to.serviceNetworkFee;

        return (eur / 100) / (btc / 1e8);
    }

    return exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value];
});

export const nimFeePerUnit = computed(() =>
    (estimate.value && estimate.value.from.asset === SwapAsset.NIM && estimate.value.from.feePerUnit)
    || (assets.value && assets.value[SwapAsset.NIM].feePerUnit)
    || 0, // Default zero fees for NIM
);

export const btcFeePerUnit = computed(() =>
    (estimate.value && estimate.value.from.asset === SwapAsset.BTC && estimate.value.from.feePerUnit)
    || (assets.value && assets.value[SwapAsset.BTC].feePerUnit)
    || 1,
);

type FundingFees = {
    sepaFeeFiat?: number,
    nimFeeFiat?: number,
    btcFeeFiat?: number,
    serviceSwapFeePercentage: number,
    serviceSwapFeeFiat: number,
    oasisFeeFiat: number,
    oasisFeePercentage: number,
    oasisMinFeeFiat?: number,
    total: number,
    isHigh: boolean,
}
type SettlementFees = {
    sepaFeeFiat?: number,
    nimFeeFiat?: number,
    btcFeeFiat?: number,
    serviceSwapFeePercentage: number,
    serviceSwapFeeFiat: number,
    oasisFeeFiat: number,
    oasisFeePercentage: number,
    oasisMinFeeFiat?: number,
    total: number,
    isHigh: boolean,
}
export const fiatFees = computed<{ funding: FundingFees, settlement: SettlementFees }>(() => {
    // Predict fees

    const defaultOasisFeeFiat = Config.oasis.minFee;
    const defaultOasisFeePercentage = Config.oasis.feePercentage * 100;
    const defaultOasisMinFeeFiat = Config.oasis.minFee;

    /* FUNDING */
    const defaultFunding: FundingFees = {} as FundingFees;

    defaultFunding.sepaFeeFiat = Config.fastspot.sepaFee > 0 ? Config.fastspot.sepaFee : undefined;

    if (activeCurrency.value === CryptoCurrency.NIM) {
        // Funding
        const myFee = nimFeePerUnit.value * 244; // 244 = NIM HTLC funding tx size
        const serviceFee = nimFeePerUnit.value * 233; // 233 = NIM HTLC settlement tx size)

        defaultFunding.nimFeeFiat = ((myFee + serviceFee) / 1e5)
            * (exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value] || 0);
    }

    if (activeCurrency.value === CryptoCurrency.BTC) {
        // Funding
        // 48 extra weight units for BTC HTLC funding tx
        const myFee = estimateFees(1, 2, btcFeePerUnit.value, 48);
        const serviceFee = btcFeePerUnit.value * 144; // The vsize Fastspot charges for a settlement tx

        defaultFunding.btcFeeFiat = ((myFee + serviceFee) / 1e8)
            * (exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value] || 0);
    }

    defaultFunding.serviceSwapFeePercentage = Config.fastspot.feePercentage * 100;
    defaultFunding.serviceSwapFeeFiat = 0;
    defaultFunding.oasisFeeFiat = defaultOasisFeeFiat;
    defaultFunding.oasisFeePercentage = defaultOasisFeePercentage;
    defaultFunding.oasisMinFeeFiat = defaultOasisMinFeeFiat;
    defaultFunding.total = (defaultFunding.btcFeeFiat || 0)
        + defaultFunding.oasisFeeFiat
        + (defaultFunding.sepaFeeFiat || 0)
        + (defaultFunding.nimFeeFiat || 0)
        + defaultFunding.serviceSwapFeeFiat;
    defaultFunding.isHigh = false;

    /* SETTLEMENT */
    const defaultSettlement: SettlementFees = {} as SettlementFees;

    if (activeCurrency.value === CryptoCurrency.NIM) {
        // Settlement
        const perFee = 0
            || (estimate.value && estimate.value.to.asset === SwapAsset.NIM
                && estimate.value.to.feePerUnit)
            || (assets.value && assets.value[SwapAsset.NIM].feePerUnit)
            || 0;
        // 135 extra weight units for BTC HTLC settlement tx
        const myFee = perFee * 233; // 233 = NIM HTLC settlement tx size);
        const serviceFee = perFee * 244; // 244 = NIM HTLC funding tx size

        defaultSettlement.nimFeeFiat = ((myFee + serviceFee) / 1e5)
            * (exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value] || 0);
    }

    if (activeCurrency.value === CryptoCurrency.BTC) {
        // Settlement
        const perFee = 0
            || (estimate.value && estimate.value.to.asset === SwapAsset.BTC
                && estimate.value.to.feePerUnit)
            || (assets.value && assets.value[SwapAsset.BTC].feePerUnit)
            || 1;
        // 135 extra weight units for BTC HTLC settlement tx
        const myFee = estimateFees(1, 1, perFee, 135);
        const serviceFee = perFee * 154; // The vsize Fastspot charges for a funding tx

        defaultSettlement.btcFeeFiat = ((myFee + serviceFee) / 1e8)
            * (exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value] || 0);
    }

    defaultSettlement.serviceSwapFeePercentage = Config.fastspot.feePercentage * 100;
    defaultSettlement.serviceSwapFeeFiat = 0;
    defaultSettlement.oasisFeeFiat = defaultOasisFeeFiat;
    defaultSettlement.oasisFeePercentage = defaultOasisFeePercentage;
    defaultSettlement.oasisMinFeeFiat = defaultOasisMinFeeFiat;

    defaultSettlement.total = (defaultSettlement.btcFeeFiat || 0)
        + defaultSettlement.oasisFeeFiat
        + (defaultSettlement.nimFeeFiat || 0)
        + defaultSettlement.serviceSwapFeeFiat;
    defaultSettlement.isHigh = false;

    const data = estimate.value;

    if (data && data.to.asset === SwapAsset.EUR) {
        const funding: FundingFees = {} as FundingFees;

        const myEurFee = data.to.fee;
        const theirOasisFee = data.to.serviceEscrowFee;
        const theirSepaFee = data.to.serviceNetworkFee;

        funding.oasisFeeFiat = (myEurFee + theirOasisFee) / 100;
        funding.oasisFeePercentage = funding.oasisFeeFiat === Config.oasis.minFee
            ? Config.oasis.feePercentage * 100
            : Math.round((funding.oasisFeeFiat / (data.to.amount / 100)) * 1000) / 10;
        funding.oasisMinFeeFiat = funding.oasisFeeFiat === Config.oasis.minFee ? Config.oasis.minFee : undefined;

        funding.sepaFeeFiat = theirSepaFee > 0 ? theirSepaFee / 100 : undefined;

        const myCryptoFee = data.from.fee;
        const theirCryptoFee = data.from.serviceNetworkFee;

        funding.btcFeeFiat = data.from.asset === SwapAsset.BTC
            ? ((myCryptoFee + theirCryptoFee) / 1e8)
                * exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value]!
            : undefined;
        funding.nimFeeFiat = data.from.asset === SwapAsset.NIM
            ? ((myCryptoFee + theirCryptoFee) / 1e5)
                * exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value]!
            : undefined;

        funding.serviceSwapFeePercentage = Math.round(data.serviceFeePercentage * 10000) / 100;

        const feeAmount = (data.from.amount - data.from.serviceNetworkFee) * data.serviceFeePercentage;
        funding.serviceSwapFeeFiat = data.from.asset === SwapAsset.NIM
            ? (feeAmount / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value] || 0)
            : (feeAmount / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value] || 0);

        return {
            funding: {
                ...funding,
                total: (funding.btcFeeFiat || 0)
                    + (funding.oasisFeeFiat || 0)
                    + (funding.sepaFeeFiat || 0)
                    + (funding.nimFeeFiat || 0)
                    + funding.serviceSwapFeeFiat,
                isHigh: false,
            },
            settlement: defaultSettlement,
        };
    }

    if (data && data.from.asset === SwapAsset.EUR) {
        const settlement: SettlementFees = {} as SettlementFees;

        const myEurFee = data.from.fee + data.from.serviceEscrowFee;
        const theirEurFee = data.from.serviceNetworkFee;

        settlement.oasisFeeFiat = (myEurFee + theirEurFee) / 100;
        settlement.oasisFeePercentage = settlement.oasisFeeFiat === Config.oasis.minFee
            ? Config.oasis.feePercentage * 100
            : Math.round((settlement.oasisFeeFiat / (data.from.amount / 100)) * 1000) / 10;
        settlement.oasisMinFeeFiat = settlement.oasisFeeFiat === Config.oasis.minFee ? Config.oasis.minFee : undefined;

        const myCryptoFee = data.to.fee;
        const theirCryptoFee = data.to.serviceNetworkFee;

        settlement.btcFeeFiat = data.to.asset === SwapAsset.BTC
            ? ((myCryptoFee + theirCryptoFee) / 1e8)
                * exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value]!
            : undefined;
        settlement.nimFeeFiat = data.to.asset === SwapAsset.NIM
            ? ((myCryptoFee + theirCryptoFee) / 1e5)
                * exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value]!
            : undefined;

        settlement.serviceSwapFeePercentage = Math.round(data.serviceFeePercentage * 10000) / 100;
        settlement.serviceSwapFeeFiat = ((data.from.amount - theirEurFee) * data.serviceFeePercentage) / 100;

        return {
            funding: defaultFunding,
            settlement: {
                ...settlement,
                total: (settlement.btcFeeFiat || 0)
                    + (settlement.oasisFeeFiat || 0)
                    + (settlement.nimFeeFiat || 0)
                    + settlement.serviceSwapFeeFiat,
                isHigh: false,
            },
        };
    }

    return { funding: defaultFunding, settlement: defaultSettlement };
});

/**
 * Common - Functions
 */

export async function fetchAssets() {
    assets.value = await getAssets();
}

export function capDecimals(amount: number, asset: SwapAsset) {
    if (!amount) return 0;

    const numberSign = amount / Math.abs(amount); // 1 or -1

    amount = Math.abs(amount);

    const currencyDecimals = asset === SwapAsset.NIM ? 5 : btcUnit.value.decimals;
    const displayDecimals = calculateDisplayedDecimals(amount, asset.toLowerCase() as CryptoCurrency);
    const roundingFactor = 10 ** (currencyDecimals - displayDecimals);

    return Math.floor(amount / roundingFactor) * roundingFactor * numberSign;
}

export function calculateFees(
    { to, from }: { to: FiatCurrency.EUR, from?: CryptoCurrency }
                | { to?: CryptoCurrency, from: FiatCurrency.EUR },
    feesPerUnit = { eur: 0, nim: 0, btc: 0 },
    amount?: number,
) {
    let fundingFee: number | null = null;
    let settlementFee: number | null = null;

    if (to === FiatCurrency.EUR) {
        if ((from || activeCurrency.value) === CryptoCurrency.NIM) {
            fundingFee = (feesPerUnit.nim || nimFeePerUnit.value) * 244; // 244 = NIM HTLC funding tx size
        }

        if ((from || activeCurrency.value) === CryptoCurrency.BTC) {
            const btcAmount = Math.min(amount || 1, btcMaxSendableAmount.value);
            const selected = selectOutputs(
                accountUtxos.value,
                btcAmount,
                (feesPerUnit.btc || btcFeePerUnit.value),
                48, // 48 extra weight units for BTC HTLC funding tx
            );
            fundingFee = selected.utxos
                .reduce((sum, utxo) => sum + utxo.witness.value, 0)
                - btcAmount
                - selected.changeAmount;
        }

        settlementFee = feesPerUnit.eur
            || (estimate.value && estimate.value.to.asset === SwapAsset.EUR
                && estimate.value.to.fee)
            || 0;
    } else { // from EUR
        fundingFee = feesPerUnit.eur
            || (estimate.value && estimate.value.from.asset === SwapAsset.EUR
                && estimate.value.from.fee)
            || 0;

        if ((to || activeCurrency.value) === CryptoCurrency.NIM) {
            const perFee = feesPerUnit.nim
                || (estimate.value && estimate.value.to.asset === SwapAsset.NIM
                    && estimate.value.to.feePerUnit)
                || (assets.value && assets.value[SwapAsset.NIM].feePerUnit)
                || 0;
            // 233 = NIM HTLC settlement tx size
            settlementFee = perFee * 233;
        }

        if ((to || activeCurrency.value) === CryptoCurrency.BTC) {
            const perFee = feesPerUnit.btc
                || (estimate.value && estimate.value.to.asset === SwapAsset.BTC
                    && estimate.value.to.feePerUnit)
                || (assets.value && assets.value[SwapAsset.BTC].feePerUnit)
                || 1;
            // 135 extra weight units for BTC HTLC settlement tx
            settlementFee = estimateFees(1, 1, perFee, 135);
        }
    }

    if (fundingFee === null || settlementFee === null) throw new Error('Invalid swap direction');

    return {
        fundingFee,
        settlementFee,
    };
}

export function getFiatSwapParameters({ from, to } : {
    from?: { asset: SwapAsset.EUR, amount: number }, // Buy
    to: { amount: number },
} | {
    from: { amount: number }, // Sell
    to?: { asset: SwapAsset.EUR, amount: number },
}) {
    if (!to && !from) return { to: null, from: null };

    if ((to && !('asset' in to) && to.amount)
    || (from && ('asset' in from) && from.asset === SwapAsset.EUR && from.amount)) { // Buy
        const fees = calculateFees({ from: FiatCurrency.EUR });
        const toSwapAsset = activeCurrency.value === CryptoCurrency.BTC
            ? SwapAsset.BTC
            : SwapAsset.NIM;

        if (from && ('asset' in from) && from.asset === SwapAsset.EUR && from.amount) {
            return {
                from: { [SwapAsset.EUR]: (from.amount - fees.fundingFee) / 100 },
                to: toSwapAsset,
            } as {
                from: RequestAsset<SwapAsset.EUR>,
                to: typeof toSwapAsset,
            };
        }

        return {
            from: SwapAsset.EUR,
            to: { [toSwapAsset]: (to!.amount + fees.settlementFee) / (
                toSwapAsset === SwapAsset.BTC
                    ? 1e8
                    : 1e5
            ) },
        } as {
            from: SwapAsset.EUR,
            to: RequestAsset<SwapAsset.BTC>,
        };
    }

    if ((from && !('asset' in from) && from.amount)
    || (to && ('asset' in to) && to.asset === SwapAsset.EUR && to.amount)) { // Sell
        const fees = calculateFees({ to: FiatCurrency.EUR }, undefined, to?.amount);
        const fromSwapAsset = activeCurrency.value === CryptoCurrency.BTC
            ? SwapAsset.BTC
            : SwapAsset.NIM;

        if ((from && !('asset' in from) && from.amount)) {
            return {
                from: { [fromSwapAsset]: (from.amount - fees.fundingFee) / (
                    fromSwapAsset === SwapAsset.BTC
                        ? 1e8
                        : 1e5
                ) },
                to: SwapAsset.EUR,
            } as {
                from: RequestAsset<SwapAsset.BTC>,
                to: SwapAsset.EUR,
            };
        }

        return {
            from: fromSwapAsset,
            to: { [SwapAsset.EUR]: (to!.amount + fees.settlementFee) / 100 },
        } as {
            from: typeof fromSwapAsset,
            to: RequestAsset<SwapAsset.EUR>,
        };
    }

    return { from: null, to: null };
}

export function useSwapEstimate() {
    if (getCurrentInstance()) {
        onUnmounted(() => estimate.value = null);
    }

    return { estimate };
}

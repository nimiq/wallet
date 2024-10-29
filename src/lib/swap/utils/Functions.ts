import { AssetList, Estimate, SwapAsset } from '@nimiq/fastspot-api';
import { estimateFees } from '../../BitcoinTransactionUtils';
import { CryptoCurrency, FiatCurrency } from '../../Constants';
import { useConfig } from '../../../composables/useConfig';

export type FundingFees = {
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

export type SettlementFees = {
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

export function getEurPerCrypto(
    asset: SwapAsset.NIM | SwapAsset.BTC | SwapAsset.USDC | SwapAsset.USDC_MATIC | SwapAsset.USDT,
    estimate: Estimate,
) {
    let coinFactor: number;
    switch (asset) { // eslint-disable-line default-case
        case SwapAsset.NIM: coinFactor = 1e5; break;
        case SwapAsset.BTC: coinFactor = 1e8; break;
        case SwapAsset.USDC: coinFactor = 1e6; break;
        case SwapAsset.USDC_MATIC: coinFactor = 1e6; break;
        case SwapAsset.USDT: coinFactor = 1e6; break;
    }

    if (estimate.from.asset === asset) {
        const eur = estimate.to.amount + estimate.to.serviceEscrowFee + estimate.to.serviceNetworkFee;
        const crypto = estimate.from.amount - estimate.from.serviceNetworkFee;

        return ((eur / 100) / (crypto / coinFactor)) * (1 + estimate.serviceFeePercentage);
    }

    if (estimate.to.asset === asset) {
        const eur = estimate.from.amount - estimate.from.serviceEscrowFee - estimate.from.serviceNetworkFee;
        const crypto = estimate.to.amount + estimate.to.serviceNetworkFee;

        return ((eur / 100) / (crypto / coinFactor)) * (1 - estimate.serviceFeePercentage);
    }

    throw new Error('Asset not part of estimate');
}

export function getFeePerUnit(asset: SwapAsset, estimate: Estimate | null, assetList: AssetList | null) {
    return (estimate && estimate.from.asset === asset && estimate.from.feePerUnit)
    || (estimate && estimate.to.asset === asset && estimate.to.feePerUnit)
    || (assetList && assetList[asset].feePerUnit)
    || (asset === SwapAsset.NIM ? 0 : 1);
}

export function getFiatFees(estimate: Estimate | null, cryptoCurrency: CryptoCurrency, exchangeRates: {
    [crypto: string]: {
        [fiat: string]: number | undefined,
    },
}, fiatCurrency: FiatCurrency, assetList: AssetList | null) {
    // Predict fees

    const { config } = useConfig();

    const defaultOasisFeeFiat = config.oasis.minFee;
    const defaultOasisFeePercentage = config.oasis.feePercentage * 100;
    const defaultOasisMinFeeFiat = config.oasis.minFee;

    /* FUNDING */
    const defaultFunding: FundingFees = {} as FundingFees;

    defaultFunding.sepaFeeFiat = config.fastspot.sepaFee > 0 ? config.fastspot.sepaFee : undefined;

    if (cryptoCurrency === CryptoCurrency.NIM) {
        // Funding
        const perFee = getFeePerUnit(SwapAsset.NIM, estimate, assetList);
        const myFee = perFee * 244; // 244 = NIM HTLC funding tx size
        const serviceFee = perFee * 233; // 233 = NIM HTLC settlement tx size)

        defaultFunding.nimFeeFiat = ((myFee + serviceFee) / 1e5)
            * (exchangeRates[CryptoCurrency.NIM][fiatCurrency] || 0);
    }

    if (cryptoCurrency === CryptoCurrency.BTC) {
        // Funding
        const perFee = getFeePerUnit(SwapAsset.BTC, estimate, assetList);
        // 48 extra weight units for BTC HTLC funding tx
        const myFee = estimateFees(1, 2, perFee, 48);
        const serviceFee = perFee * 144; // The vsize Fastspot charges for a settlement tx

        defaultFunding.btcFeeFiat = ((myFee + serviceFee) / 1e8)
            * (exchangeRates[CryptoCurrency.BTC][fiatCurrency] || 0);
    }

    defaultFunding.serviceSwapFeePercentage = config.fastspot.feePercentage * 100;
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

    if (cryptoCurrency === CryptoCurrency.NIM) {
        // Settlement
        const perFee = getFeePerUnit(SwapAsset.NIM, estimate, assetList);
        // 135 extra weight units for BTC HTLC settlement tx
        const myFee = perFee * 233; // 233 = NIM HTLC settlement tx size);
        const serviceFee = perFee * 244; // 244 = NIM HTLC funding tx size

        defaultSettlement.nimFeeFiat = ((myFee + serviceFee) / 1e5)
            * (exchangeRates[CryptoCurrency.NIM][fiatCurrency] || 0);
    }

    if (cryptoCurrency === CryptoCurrency.BTC) {
        // Settlement
        const perFee = getFeePerUnit(SwapAsset.BTC, estimate, assetList);
        // 135 extra weight units for BTC HTLC settlement tx
        const myFee = estimateFees(1, 1, perFee, 135);
        const serviceFee = perFee * 154; // The vsize Fastspot charges for a funding tx

        defaultSettlement.btcFeeFiat = ((myFee + serviceFee) / 1e8)
            * (exchangeRates[CryptoCurrency.BTC][fiatCurrency] || 0);
    }

    defaultSettlement.serviceSwapFeePercentage = config.fastspot.feePercentage * 100;
    defaultSettlement.serviceSwapFeeFiat = 0;
    defaultSettlement.oasisFeeFiat = defaultOasisFeeFiat;
    defaultSettlement.oasisFeePercentage = defaultOasisFeePercentage;
    defaultSettlement.oasisMinFeeFiat = defaultOasisMinFeeFiat;

    defaultSettlement.total = (defaultSettlement.btcFeeFiat || 0)
        + defaultSettlement.oasisFeeFiat
        + (defaultSettlement.nimFeeFiat || 0)
        + defaultSettlement.serviceSwapFeeFiat;
    defaultSettlement.isHigh = false;

    const data = estimate;

    if (data && data.to.asset === SwapAsset.EUR) {
        const funding: FundingFees = {} as FundingFees;

        const myEurFee = data.to.fee;
        const theirOasisFee = data.to.serviceEscrowFee;
        const theirSepaFee = data.to.serviceNetworkFee;

        funding.oasisFeeFiat = (myEurFee + theirOasisFee) / 100;
        funding.oasisFeePercentage = funding.oasisFeeFiat === config.oasis.minFee
            ? config.oasis.feePercentage * 100
            : Math.round((funding.oasisFeeFiat / (data.to.amount / 100)) * 1000) / 10;
        funding.oasisMinFeeFiat = funding.oasisFeeFiat === config.oasis.minFee ? config.oasis.minFee : undefined;

        funding.sepaFeeFiat = theirSepaFee > 0 ? theirSepaFee / 100 : undefined;

        const myCryptoFee = data.from.fee;
        const theirCryptoFee = data.from.serviceNetworkFee;

        funding.btcFeeFiat = data.from.asset === SwapAsset.BTC
            ? ((myCryptoFee + theirCryptoFee) / 1e8)
                * exchangeRates[CryptoCurrency.BTC][fiatCurrency]!
            : undefined;
        funding.nimFeeFiat = data.from.asset === SwapAsset.NIM
            ? ((myCryptoFee + theirCryptoFee) / 1e5)
                * exchangeRates[CryptoCurrency.NIM][fiatCurrency]!
            : undefined;

        funding.serviceSwapFeePercentage = Math.round(data.serviceFeePercentage * 10000) / 100;

        const feeAmount = (data.from.amount - data.from.serviceNetworkFee) * data.serviceFeePercentage;
        funding.serviceSwapFeeFiat = data.from.asset === SwapAsset.NIM
            ? (feeAmount / 1e5) * (exchangeRates[CryptoCurrency.NIM][fiatCurrency] || 0)
            : (feeAmount / 1e8) * (exchangeRates[CryptoCurrency.BTC][fiatCurrency] || 0);

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

        const myEurFee = data.from.serviceEscrowFee;
        const theirEurFee = data.from.serviceNetworkFee;

        settlement.oasisFeeFiat = (myEurFee + theirEurFee) / 100;
        settlement.oasisFeePercentage = settlement.oasisFeeFiat === config.oasis.minFee
            ? config.oasis.feePercentage * 100
            : Math.round((settlement.oasisFeeFiat / (data.from.amount / 100)) * 1000) / 10;
        settlement.oasisMinFeeFiat = settlement.oasisFeeFiat === config.oasis.minFee ? config.oasis.minFee : undefined;

        const myCryptoFee = data.to.fee;
        const theirCryptoFee = data.to.serviceNetworkFee;

        settlement.btcFeeFiat = data.to.asset === SwapAsset.BTC
            ? ((myCryptoFee + theirCryptoFee) / 1e8)
                * exchangeRates[CryptoCurrency.BTC][fiatCurrency]!
            : undefined;
        settlement.nimFeeFiat = data.to.asset === SwapAsset.NIM
            ? ((myCryptoFee + theirCryptoFee) / 1e5)
                * exchangeRates[CryptoCurrency.NIM][fiatCurrency]!
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
}

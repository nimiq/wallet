import { AssetList, Estimate, getAssets, RequestAsset, SwapAsset } from '@nimiq/fastspot-api';
import { CurrencyInfo } from '@nimiq/utils';
import { computed, onUnmounted, ref, getCurrentInstance, Ref } from 'vue';
import { useAccountStore } from '../../../stores/Account';
import { useFiatStore } from '../../../stores/Fiat';
import { useSettingsStore } from '../../../stores/Settings';
import { useBtcAddressStore } from '../../../stores/BtcAddress';
import { useKycStore } from '../../../stores/Kyc';
import { useConfig } from '../../../composables/useConfig';
import { SwapLimits } from '../../../composables/useSwapLimits';
import { CryptoCurrency, FiatCurrency } from '../../Constants';
import { calculateDisplayedDecimals } from '../../NumberFormatting';
import { estimateFees, selectOutputs } from '../../BitcoinTransactionUtils';
import { btcMaxSendableAmount } from './SellUtils';
import { FundingFees, getEurPerCrypto, getFeePerUnit, getFiatFees, SettlementFees } from './Functions';

const { exchangeRates } = useFiatStore();
const { activeCurrency } = useAccountStore();
const { btcUnit } = useSettingsStore();
const { accountUtxos } = useBtcAddressStore();
const { connectedUser: kycUser } = useKycStore();

/**
 * Common - everything common to Buy and Sell crypto
 *  - Refs
 *  - Computeds
 *  - Functions
 */

/**
 * Common - Refs
 */

export const estimate = ref<Estimate | null>(null);
export const assets = ref<AssetList | null>(null);
// Currently there is only EUR available to swap, but it may change in the future.
export const selectedFiatCurrency = ref(FiatCurrency.EUR);

/**
 * Common - Computeds
 */

export function useCurrentLimitFiat(limits: Ref<SwapLimits | undefined>) {
    return computed(() => {
        if (!limits.value) return null;

        const nimRate = exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
        if (!nimRate) return null;

        const { config } = useConfig();

        const regularLimitFiat = Math.min(
            Math.floor((limits.value.current.luna / 1e5) * nimRate),
            kycUser.value ? config.oasis.maxKycAmount : config.oasis.maxFreeAmount,
        );

        if (selectedFiatCurrency.value === FiatCurrency.EUR && limits.value.current.eur < Infinity) {
            return Math.min(regularLimitFiat, limits.value.current.eur);
        }

        return regularLimitFiat;
    });
}

export function useCurrentLimitCrypto(currentLimitFiat: Ref<number | null>) {
    return computed(() => {
        if (!currentLimitFiat.value) return null;

        const rate = exchangeRates.value[activeCurrency.value][selectedFiatCurrency.value];
        if (!rate) return null;

        return capDecimals(
            (currentLimitFiat.value / rate) * (activeCurrency.value === CryptoCurrency.NIM ? 1e5 : 1e8),
            activeCurrency.value.toUpperCase() as SwapAsset,
        );
    });
}

export const fiatCurrencyInfo = computed(() =>
    new CurrencyInfo(selectedFiatCurrency.value),
);

export const eurPerNim = computed(() => {
    const _estimate = estimate.value;
    if (!_estimate || ![_estimate.from.asset, _estimate.to.asset].includes(SwapAsset.NIM)) {
        return exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
    }
    return getEurPerCrypto(SwapAsset.NIM, _estimate);
});

export const eurPerBtc = computed(() => {
    const _estimate = estimate.value;
    if (!_estimate || ![_estimate.from.asset, _estimate.to.asset].includes(SwapAsset.BTC)) {
        return exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value];
    }
    return getEurPerCrypto(SwapAsset.BTC, _estimate);
});

export const nimFeePerUnit = computed(() => getFeePerUnit(
    SwapAsset.NIM, estimate.value, assets.value));

export const btcFeePerUnit = computed(() => getFeePerUnit(
    SwapAsset.BTC, estimate.value, assets.value));

export const fiatFees = computed<{ funding: FundingFees, settlement: SettlementFees }>(() => getFiatFees(
    estimate.value,
    activeCurrency.value,
    {
        [CryptoCurrency.NIM]: { [selectedFiatCurrency.value]: eurPerNim.value },
        [CryptoCurrency.BTC]: { [selectedFiatCurrency.value]: eurPerBtc.value },
    },
    selectedFiatCurrency.value,
    assets.value,
));

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
    { to, from }: { to: 'eur', from?: CryptoCurrency }
                | { to?: CryptoCurrency, from: 'eur' },
    amount?: number,
    feesPerUnit = { eur: 0, nim: 0, btc: 0 },
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
        const fees = calculateFees({ to: FiatCurrency.EUR }, to?.amount);
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

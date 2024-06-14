import { AssetList, Estimate, getAssets, RequestAsset, SwapAsset } from '@nimiq/fastspot-api';
import { CurrencyInfo } from '@nimiq/utils';
import { computed, onUnmounted, ref, getCurrentInstance, Ref } from '@vue/composition-api';
import { useSwapsStore } from '@/stores/Swaps';
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
import { FundingFees, getFiatPerCrypto, getFeePerUnit, getFiatFees, SettlementFees } from './Functions';
import { assetToCurrency } from './Assets';

const { exchangeRates } = useFiatStore();
const { activeCurrency } = useAccountStore();
const { btcUnit } = useSettingsStore();
const { accountUtxos } = useBtcAddressStore();
const { connectedUser: kycUser } = useKycStore();

export type FiatSwapAsset = SwapAsset.EUR | SwapAsset.CRC;
export type FiatSwapCurrency = FiatCurrency.EUR | FiatCurrency.CRC;

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
// By default we set EUR, but you need to change it if you swap to another fiat currency.
export const selectedFiatCurrency = ref<FiatSwapCurrency>(FiatCurrency.EUR);

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

        if (limits.value.current.fiat < Infinity) {
            return Math.min(regularLimitFiat, limits.value.current.fiat);
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

export const fiatPerNim = computed(() => {
    const _estimate = estimate.value;
    if (!_estimate || ![_estimate.from.asset, _estimate.to.asset].includes(SwapAsset.NIM)) {
        return exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
    }
    return getFiatPerCrypto(SwapAsset.NIM, _estimate);
});

export const fiatPerBtc = computed(() => {
    const _estimate = estimate.value;
    if (!_estimate || ![_estimate.from.asset, _estimate.to.asset].includes(SwapAsset.BTC)) {
        return exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value];
    }
    return getFiatPerCrypto(SwapAsset.BTC, _estimate);
});

export const nimFeePerUnit = computed(() => getFeePerUnit(
    SwapAsset.NIM, estimate.value, assets.value));

export const btcFeePerUnit = computed(() => getFeePerUnit(
    SwapAsset.BTC, estimate.value, assets.value));

export const fiatFees = computed<{ funding: FundingFees, settlement: SettlementFees }>(() => getFiatFees(
    estimate.value,
    activeCurrency.value,
    {
        [CryptoCurrency.NIM]: { [selectedFiatCurrency.value]: fiatPerNim.value },
        [CryptoCurrency.BTC]: { [selectedFiatCurrency.value]: fiatPerBtc.value },
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
    { to, from }: { to: FiatSwapCurrency, from?: CryptoCurrency }
        | { to?: CryptoCurrency, from: FiatSwapCurrency },
    amount?: number,
    feesPerUnit = { fiat: 0, nim: 0, btc: 0 },
) {
    let fundingFee: number | null = null;
    let settlementFee: number | null = null;

    if (to === FiatCurrency.EUR || to === FiatCurrency.CRC) {
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

        settlementFee = feesPerUnit.fiat
            || (estimate.value && useSwapsStore().isFiatAsset(estimate.value.to.asset)
                && estimate.value.to.fee)
            || 0;
    } else { // from Fiat
        fundingFee = feesPerUnit.fiat
            || (estimate.value && useSwapsStore().isFiatAsset(estimate.value.from.asset)
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

export function getFiatSwapParameters<FiatAsset extends FiatSwapAsset>(fiatAsset: FiatAsset, { from, to }: {
    from?: { asset: FiatAsset, amount: number }, // Buy crypto
    to: { amount: number },
} | {
    from: { amount: number }, // Sell crypto
    to?: { asset: FiatAsset, amount: number },
}) {
    if (!to && !from) return { to: null, from: null };

    if (to && (!('asset' in to) && to.amount)
        || (from && ('asset' in from) && useSwapsStore().isFiatAsset(from.asset) && from.amount)) { // Buy crypto
        const fees = calculateFees({ from: assetToCurrency(fiatAsset) });
        const toSwapAsset = activeCurrency.value === CryptoCurrency.BTC
            ? SwapAsset.BTC
            : SwapAsset.NIM;

        if (from && ('asset' in from) && useSwapsStore().isFiatAsset(from.asset) && from.amount) {
            return {
                from: { [fiatAsset]: (from.amount - fees.fundingFee) / 100 },
                to: toSwapAsset,
            } as {
                from: RequestAsset<FiatAsset>,
                to: typeof toSwapAsset,
            };
        }

        return {
            from: fiatAsset,
            to: {
                [toSwapAsset]: (to!.amount + fees.settlementFee) / (
                    toSwapAsset === SwapAsset.BTC ? 1e8 : 1e5
                ),
            },
        } as {
            from: FiatAsset,
            to: RequestAsset<SwapAsset.BTC>,
        };
    }

    if ((from && !('asset' in from) && from.amount)
        || (to && ('asset' in to) && useSwapsStore().isFiatAsset(to.asset) && to.amount)) { // Sell crypto
        const fees = calculateFees({ to: assetToCurrency(fiatAsset) }, to?.amount);
        const fromSwapAsset = activeCurrency.value === CryptoCurrency.BTC
            ? SwapAsset.BTC
            : SwapAsset.NIM;

        if ((from && !('asset' in from) && from.amount)) {
            return {
                from: {
                    [fromSwapAsset]: (from.amount - fees.fundingFee) / (
                        fromSwapAsset === SwapAsset.BTC ? 1e8 : 1e5
                    ),
                },
                to: fiatAsset,
            } as {
                from: RequestAsset<SwapAsset.BTC>,
                to: FiatAsset,
            };
        }

        return {
            from: fromSwapAsset,
            to: { [fiatAsset]: (to!.amount + fees.settlementFee) / 100 },
        } as {
            from: typeof fromSwapAsset,
            to: RequestAsset<FiatAsset>,
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

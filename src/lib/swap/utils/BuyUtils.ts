import { getEstimate, RequestAsset, SwapAsset } from '@nimiq/fastspot-api';
import {
    ClearingInfo,
    ClearingStatus,
    DeniedReason,
    Htlc as OasisHtlc,
    HtlcStatus,
} from '@nimiq/oasis-api';
import { computed } from '@vue/composition-api';
import { useAccountStore } from '../../../stores/Account';
import { useFiatStore } from '../../../stores/Fiat';
import { useSwapsStore } from '../../../stores/Swaps';
import { CryptoCurrency } from '../../Constants';
import { i18n } from '../../../i18n/i18n-setup';
import {
    calculateFees,
    FiatSwapAsset,
    getFiatSwapParameters,
    selectedFiatCurrency,
    useSwapEstimate,
} from './CommonUtils';
import { assetToCurrency } from './Assets';

const { activeSwap: swap } = useSwapsStore();
const { exchangeRates } = useFiatStore();
const { activeCurrency } = useAccountStore();
const { estimate } = useSwapEstimate();

/**
 * Buy - Buy crypto related things
 *  - Computeds
 *  - Functions
 */

/**
 * Buy - Computeds
 */

export const oasisBuyLimitExceeded = computed(() => {
    if (!swap.value) return false;
    if (!swap.value.fundingTx) return false;
    const htlc = swap.value.fundingTx as OasisHtlc;

    if (htlc.status !== HtlcStatus.PENDING) return false;
    const pendingHtlc = htlc as OasisHtlc<HtlcStatus.PENDING>;

    if (pendingHtlc.clearing.status !== ClearingStatus.DENIED) return false;
    const deniedClearingInfo = pendingHtlc.clearing as ClearingInfo<ClearingStatus.DENIED>;

    return deniedClearingInfo.detail.reason === DeniedReason.LIMIT_EXCEEDED;
});

/**
 * Buy - Functions
 */

export async function updateBuyEstimate({ fiatAmount, cryptoAmount, fiatAsset: _fiatAsset }
    : { fiatAmount: number, cryptoAmount?: number, fiatAsset?: FiatSwapAsset }
    | { fiatAmount?: number, cryptoAmount: number, fiatAsset?: FiatSwapAsset },
) {
    if (!fiatAmount && !cryptoAmount) return;
    const fiatAsset = _fiatAsset || SwapAsset.EUR; // To avoid breaking the code in the app, we default to EUR

    const { from, to } = getFiatSwapParameters(fiatAsset, fiatAmount
        ? { from: { asset: fiatAsset, amount: fiatAmount } }
        : { to: { amount: cryptoAmount! } },
    );

    const newEstimate = await getEstimate(
        // Need to force one of the function signatures
        from as RequestAsset<SwapAsset>,
        to as SwapAsset,
    );

    if (!newEstimate.from || !newEstimate.to) {
        throw new Error(`UNEXPECTED: ${fiatAsset} or crypto price not present in estimate`);
    }

    // Update local fees with latest feePerUnit values
    const { settlementFee } = calculateFees({ from: assetToCurrency(fiatAsset) }, undefined, {
        fiat: newEstimate.from.fee || 0,
        nim: activeCurrency.value === CryptoCurrency.NIM ? newEstimate.to.feePerUnit! : 0,
        btc: activeCurrency.value === CryptoCurrency.BTC ? newEstimate.to.feePerUnit! : 0,
    });

    newEstimate.from.fee = 0; // User's SEPA Instant fees are not considered
    newEstimate.to.fee = settlementFee;

    // Check against minimums
    if (!newEstimate.from.amount || (newEstimate.to.amount - newEstimate.to.fee) <= 0) {
        // If one of the two amounts is 0 or less, that means the fees are higher than the swap amount
        if (newEstimate.to.asset === SwapAsset.BTC) {
            // Note: This currently only checks BTC fees!
            const btcPrice = newEstimate.to;
            const toCoinsFactor = 1e8;
            const minimumFiat = ((btcPrice.fee + btcPrice.serviceNetworkFee) / toCoinsFactor)
                * exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value]!;
            throw new Error(i18n.t(
                'The fees (currently {amount}) determine the minimum amount.',
                { amount: `${selectedFiatCurrency.value.toUpperCase()} ${minimumFiat.toFixed(2)}` },
            ) as string);
        } else {
            throw new Error(i18n.t('The fees determine the minimum amount.') as string);
        }
    } // eslint-disable-line brace-style

    estimate.value = newEstimate;
}

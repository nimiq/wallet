import { getEstimate, RequestAsset, SwapAsset } from '@nimiq/fastspot-api';
import {
    DeniedReason,
    Htlc as OasisHtlc,
    HtlcStatus,
    SettlementInfo,
    SettlementStatus,
} from '@nimiq/oasis-api';
import { computed } from 'vue';
import { useAccountStore } from '../../../stores/Account';
import { useFiatStore } from '../../../stores/Fiat';
import { useSwapsStore } from '../../../stores/Swaps';
import { CryptoCurrency, FiatCurrency } from '../../Constants';
import { estimateFees } from '../../BitcoinTransactionUtils';
import { useBtcAddressStore } from '../../../stores/BtcAddress';
import { i18n } from '../../../i18n/i18n-setup';
import { assets, calculateFees, getFiatSwapParameters, selectedFiatCurrency, useSwapEstimate } from './CommonUtils';
import { getFeePerUnit } from './Functions';

const { activeSwap: swap } = useSwapsStore();
const { exchangeRates } = useFiatStore();
const { activeCurrency } = useAccountStore();
const { accountBalance: accountBtcBalance, accountUtxos } = useBtcAddressStore();

/**
 * Sell - Sell crypto related things
 *  - Computeds
 *  - Functions
 */

/**
 * Sell - Computeds
 */

export const oasisSellLimitExceeded = computed(() => {
    if (!swap.value) return false;
    if (!swap.value.settlementTx) return false;
    const htlc = swap.value.settlementTx as OasisHtlc;

    if (htlc.status !== HtlcStatus.SETTLED) return false;
    const settledHtlc = htlc as OasisHtlc<HtlcStatus.SETTLED>;

    if (settledHtlc.settlement.status !== SettlementStatus.DENIED) return false;
    const deniedSettlementInfo = settledHtlc.settlement as SettlementInfo<SettlementStatus.DENIED>;

    return deniedSettlementInfo.detail.reason === DeniedReason.LIMIT_EXCEEDED;
});

export const nimFeePerUnit = computed(() => {
    const { estimate } = useSwapEstimate();
    return getFeePerUnit(SwapAsset.NIM, estimate.value, assets.value);
});

export const btcFeePerUnit = computed(() => {
    const { estimate } = useSwapEstimate();
    return getFeePerUnit(SwapAsset.BTC, estimate.value, assets.value);
});

// 48 extra weight units for BTC HTLC funding tx
export const btcFeeForSendingAll = computed(() =>
    estimateFees(accountUtxos.value.length, 1, btcFeePerUnit.value, 48),
);

export const btcMaxSendableAmount = computed(() =>
    Math.max(accountBtcBalance.value - btcFeeForSendingAll.value, 0),
);

/**
 * Sell - Functions
 */

export async function updateSellEstimate({ fiatAmount, cryptoAmount }
    : { fiatAmount: number, cryptoAmount?: number }
    | { fiatAmount?: number, cryptoAmount: number },
) {
    const { from, to } = getFiatSwapParameters(fiatAmount
        ? { to: { asset: SwapAsset.EUR, amount: fiatAmount } }
        : { from: { amount: cryptoAmount! } },
    );

    const newEstimate = await getEstimate(
        // Need to force one of the function signatures
        from as RequestAsset<SwapAsset>,
        to as SwapAsset,
    );

    if (!newEstimate.from || !newEstimate.to) {
        throw new Error('UNEXPECTED: EUR or crypto price not present in estimate');
    }

    // Update local fees with latest feePerUnit values
    const { fundingFee } = calculateFees({ to: FiatCurrency.EUR }, newEstimate.from.amount, {
        eur: newEstimate.to.fee || 0,
        nim: activeCurrency.value === CryptoCurrency.NIM ? newEstimate.from.feePerUnit! : 0,
        btc: activeCurrency.value === CryptoCurrency.BTC ? newEstimate.from.feePerUnit! : 0,
    });

    newEstimate.from.fee = fundingFee;
    newEstimate.to.fee = 0; // OASIS' SEPA Instant fees are already included

    // Check against minimums
    if (!newEstimate.from.amount || (newEstimate.to.amount - newEstimate.to.fee) <= 0) {
        // If one of the two amounts is 0 or less, that means the fees are higher than the swap amount
        if (newEstimate.from.asset === SwapAsset.BTC) {
            // Note: This currently only checks BTC fees!
            const btcPrice = newEstimate.from;
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

    const { estimate } = useSwapEstimate();
    estimate.value = newEstimate;
}

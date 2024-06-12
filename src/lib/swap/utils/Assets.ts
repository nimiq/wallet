import { SwapAsset } from '@nimiq/fastspot-api';
import { CryptoCurrency, FiatCurrency } from '../../Constants';

export function assetToCurrency(asset: Exclude<SwapAsset, SwapAsset.EUR | SwapAsset.CRC>): CryptoCurrency;
export function assetToCurrency(asset: SwapAsset.EUR | SwapAsset.CRC): FiatCurrency;
export function assetToCurrency(asset: SwapAsset): CryptoCurrency | FiatCurrency;
export function assetToCurrency(asset: SwapAsset): CryptoCurrency | FiatCurrency {
    return {
        [SwapAsset.NIM]: CryptoCurrency.NIM,
        [SwapAsset.BTC]: CryptoCurrency.BTC,
        [SwapAsset.USDC]: CryptoCurrency.USDC,
        [SwapAsset.USDC_MATIC]: CryptoCurrency.USDC,
        [SwapAsset.EUR]: FiatCurrency.EUR,
        [SwapAsset.CRC]: FiatCurrency.CRC,

        // This is just to make the type checker happy
        // The BTC_LN only used in Nimiq Pay
        // So we don't need to handle it
        [SwapAsset.BTC_LN]: '000' as unknown as CryptoCurrency,
    }[asset];
}

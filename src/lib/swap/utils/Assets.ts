import { SwapAsset } from '@nimiq/fastspot-api';
import { CryptoCurrency, FiatCurrency } from '../../Constants';

export function assetToCurrency(asset: Exclude<SwapAsset, SwapAsset.EUR>): CryptoCurrency;
export function assetToCurrency(asset: SwapAsset.EUR): FiatCurrency;
export function assetToCurrency(asset: SwapAsset): CryptoCurrency | FiatCurrency;
export function assetToCurrency(asset: SwapAsset): CryptoCurrency | FiatCurrency {
    return {
        [SwapAsset.NIM]: CryptoCurrency.NIM,
        [SwapAsset.BTC]: CryptoCurrency.BTC,
        [SwapAsset.USDC]: CryptoCurrency.USDC,
        [SwapAsset.USDC_MATIC]: CryptoCurrency.USDC,
        [SwapAsset.EUR]: FiatCurrency.EUR,
    }[asset];
}

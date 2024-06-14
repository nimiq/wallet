import { SwapAsset } from '@nimiq/fastspot-api';
import { CryptoCurrency, FiatCurrency } from '../../Constants';
import { FiatSwapCurrency } from './CommonUtils';

export function assetToCurrency(asset: Exclude<SwapAsset, SwapAsset.EUR | SwapAsset.CRC>): CryptoCurrency;
export function assetToCurrency(asset: SwapAsset.EUR | SwapAsset.CRC): FiatSwapCurrency;
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
        // BTC_LN is not yet used in the Wallet
        [SwapAsset.BTC_LN]: '000' as unknown as CryptoCurrency,
    }[asset];
}

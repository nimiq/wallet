import { SwapAsset } from '@nimiq/fastspot-api';
import { CryptoCurrency, FiatCurrency } from '../../Constants';

export type SupportedSwapAsset =
    | SwapAsset.NIM
    | SwapAsset.BTC
    | SwapAsset.USDC
    | SwapAsset.USDC_MATIC
    | SwapAsset.USDT_MATIC
    | SwapAsset.EUR;

export function assetToCurrency(asset: Exclude<SupportedSwapAsset, SwapAsset.EUR>): CryptoCurrency;
export function assetToCurrency(asset: SwapAsset.EUR): FiatCurrency.EUR;
export function assetToCurrency(asset: SupportedSwapAsset): CryptoCurrency | FiatCurrency;
export function assetToCurrency(asset: SupportedSwapAsset): CryptoCurrency | FiatCurrency {
    return {
        [SwapAsset.NIM]: CryptoCurrency.NIM,
        [SwapAsset.BTC]: CryptoCurrency.BTC,
        [SwapAsset.USDC]: CryptoCurrency.USDC,
        [SwapAsset.USDC_MATIC]: CryptoCurrency.USDC,
        [SwapAsset.USDT_MATIC]: CryptoCurrency.USDT,
        [SwapAsset.EUR]: FiatCurrency.EUR,
        ['CRC']: FiatCurrency.CRC, // eslint-disable-line no-useless-computed-key
    }[asset];
}

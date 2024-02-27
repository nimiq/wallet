import { SwapAsset } from '@nimiq/fastspot-api';
import { CryptoCurrency, FiatCurrency } from '../../Constants';

export function assetToCurrency(asset: SwapAsset): string { // eslint-disable-line consistent-return
    switch (asset) { // eslint-disable-line default-case
        case SwapAsset.NIM:
            return CryptoCurrency.NIM;
        case SwapAsset.BTC:
            return CryptoCurrency.BTC;
        case SwapAsset.USDC:
        case SwapAsset.USDC_MATIC:
            return CryptoCurrency.USDC;
        case SwapAsset.EUR:
            return FiatCurrency.EUR;
        // The default case is unnecessary as TypeScript throws a compiler error if a case is missing
    }
}

import { SwapAsset } from '@nimiq/fastspot-api';
import { useConfig } from '../../../composables/useConfig';
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

/**
 * Swap assets enabled in the Wallet, which are to be displayed. These might differ from the swap assets enabled in
 * Fastspot, see Config.fastspot.enabledSwapAssets. For currencies enabled in the Wallet but disabled in Fastspot, a
 * maintenance message is shown in SwapModal. As a method instead of a const, to use latest config values.
 */
export function getWalletEnabledSwapAssets(): SwapAsset[] {
    const { config } = useConfig();
    return [
        ...(!config.disableNetworkInteraction ? [SwapAsset.NIM] : []),
        ...(config.enableBitcoin ? [SwapAsset.BTC] : []),
        ...(config.polygon.enabled && !config.polygon.isGasAbstractionUnderMaintenance
            ? [SwapAsset.USDC_MATIC, SwapAsset.USDT_MATIC]
            : []),
    ];
}

/**
 * Whether swaps are currently unusable altogether, either because the swap feature is disabled, or because fewer than
 * two of the Wallet's swap assets are currently enabled in Fastspot. Note that swaps can also be under maintenance for
 * only some of the assets, which is not covered here but handled within the SwapModal.
 */
export function areSwapsUnderMaintenance(): boolean {
    const { config } = useConfig();
    if (!config.fastspot.enabled) return true;
    const { enabledSwapAssets: fastspotEnabledAssets } = config.fastspot;
    return getWalletEnabledSwapAssets().filter((asset) => fastspotEnabledAssets.includes(asset)).length < 2;
}

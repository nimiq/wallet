import { SwapAsset } from '@nimiq/fastspot-api';
import { CryptoCurrency, ENV_MAIN } from './Constants';
import { useConfig } from '../composables/useConfig';

export function explorerTxLink(asset: CryptoCurrency, hash: string) {
    const { config } = useConfig();
    switch (asset) {
        case CryptoCurrency.NIM:
            return config.environment === ENV_MAIN
                ? `https://nimiq.watch/#${hash}`
                : `https://www.nimiqhub.com/tx/${hash}`;
        case CryptoCurrency.BTC:
            return `https://blockstream.info${config.environment === ENV_MAIN ? '' : '/testnet'}/tx/${hash}`;
        case CryptoCurrency.USDC:
            return `https://${config.environment === ENV_MAIN ? '' : 'mumbai.'}polygonscan.com/tx/${hash}`;
        default: throw new Error('Invalid asset');
    }
}

export function explorerAddrLink(asset: SwapAsset, address: string) {
    const { config } = useConfig();
    switch (asset) {
        case SwapAsset.NIM:
            return config.environment === ENV_MAIN
                ? `https://nimiq.watch/#${address}`
                : `https://www.nimiqhub.com/wallet/${address}`;
        case SwapAsset.BTC:
            return `https://blockstream.info${config.environment === ENV_MAIN ? '' : '/testnet'}/address/${address}`;
        case SwapAsset.USDC:
            return `https://${config.environment === ENV_MAIN ? '' : 'mumbai.'}polygonscan.com/address/${address}`;
        case SwapAsset.EUR:
            if (config.environment === ENV_MAIN) return `https://oasis.watch/?id=${address}`;
            return `${config.oasis.apiEndpoint}/htlc/${address}`;
        default: throw new Error('Invalid asset');
    }
}

import { SwapAsset } from '@nimiq/fastspot-api';
import Config from 'config';
import { CryptoCurrency, ENV_MAIN } from './Constants';

export function explorerTxLink(asset: CryptoCurrency, hash: string) {
    switch (asset) {
        case CryptoCurrency.NIM:
            return `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/#${hash}`;
        case CryptoCurrency.BTC:
            return `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}/tx/${hash}`;
        case CryptoCurrency.USDC:
            return `https://${Config.environment === ENV_MAIN ? '' : 'mumbai.'}polygonscan.com/tx/${hash}`;
        default: throw new Error('Invalid asset');
    }
}

export function explorerAddrLink(asset: SwapAsset, address: string) {
    switch (asset) {
        case SwapAsset.NIM:
            return `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/`
                + `#${address}`;
        case SwapAsset.BTC:
            return `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}`
                + `/address/${address}`;
        // case SwapAsset.USDC:
        //     return `https://${Config.environment === ENV_MAIN ? '' : 'mumbai.'}polygonscan.com/address/${address}`;
        case SwapAsset.EUR:
            if (Config.environment === ENV_MAIN) return `https://oasis.watch/?id=${address}`;
            return `${Config.oasis.apiEndpoint}/htlc/${address}`;
        default: throw new Error('Invalid asset');
    }
}

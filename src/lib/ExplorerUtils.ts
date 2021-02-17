import { SwapAsset } from '@nimiq/fastspot-api';
import Config from 'config';
import { ENV_MAIN } from './Constants';

export function explorerTxLink(asset: SwapAsset, hash: string) {
    switch (asset) {
        case SwapAsset.NIM:
            return `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/#${hash}`;
        case SwapAsset.BTC:
            return `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}/tx/${hash}`;
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
        case SwapAsset.EUR:
            return `${Config.oasis.apiEndpoint}/htlc/${address}`;
        default: throw new Error('Invalid asset');
    }
}

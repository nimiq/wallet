import Config from 'config';
import { ENV_MAIN } from './Constants';
import { SwapAsset } from './FastspotApi';


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
        default: throw new Error('Invalid asset');
    }
}

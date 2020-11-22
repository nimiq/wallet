import {
    TransactionDetails as NimiqTransactionDetails,
    NimiqClient,
} from './NimiqAssetAdapter';
import {
    TransactionDetails as BitcoinTransactionDetails,
    BitcoinClient,
} from './BitcoinAssetAdapter';

export enum SwapAsset {
    NIM = 'NIM',
    BTC = 'BTC',
    // EUR = 'EUR',
}

export type Transaction<TAsset extends SwapAsset> =
    TAsset extends SwapAsset.NIM ? NimiqTransactionDetails
    : TAsset extends SwapAsset.BTC ? BitcoinTransactionDetails
    : never;

export type Client<TAsset extends SwapAsset> =
    TAsset extends SwapAsset.NIM ? NimiqClient
    : TAsset extends SwapAsset.BTC ? BitcoinClient
    : never;

export interface AssetAdapter<TAsset extends SwapAsset> {
    // new (client: Client<TAsset>): IAssetAdapter<TAsset>;

    findTransaction(address: string, test: (tx: Transaction<TAsset>) => boolean): Promise<Transaction<TAsset>>;

    awaitHtlcCreation(
        address: string,
        value: number,
        data: string,
        onPending: (tx: Transaction<TAsset>) => any,
    ): Promise<Transaction<TAsset>>;

    createHtlc(serializedTx: string, onPending: (tx: Transaction<TAsset>) => any): Promise<Transaction<TAsset>>;

    awaitHtlcSettlement(address: string, data: string): Promise<Transaction<TAsset>>;

    awaitSwapSecret(address: string, data: string): Promise<string>;

    settleHtlc(serializedTx: string, secret: string, hash: string): Promise<Transaction<TAsset>>;
}

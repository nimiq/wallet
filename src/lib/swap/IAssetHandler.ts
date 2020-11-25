import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { SwapAsset } from '@nimiq/fastspot-api';

type NimTransactionDetails = ReturnType<import('@nimiq/core-web').Client.TransactionDetails['toPlain']>;

export type Transaction<TAsset extends SwapAsset> =
    TAsset extends SwapAsset.NIM ? NimTransactionDetails
    : TAsset extends SwapAsset.BTC ? BtcTransactionDetails
    : never;

export interface IAssetHandler<TAsset extends SwapAsset, TTransaction = Transaction<TAsset>> {
    // new (client: any): IAssetHandler;

    findTransaction(address: string, test: (tx: TTransaction) => boolean): Promise<TTransaction>;

    awaitHtlcCreation(
        address: string,
        value: number,
        data: string,
        onPending: (tx: TTransaction) => any,
    ): Promise<TTransaction>;

    createHtlc(serializedTx: string, onPending: (tx: TTransaction) => any): Promise<TTransaction>;

    awaitHtlcSettlement(address: string, data: string): Promise<TTransaction>;

    awaitSwapSecret(address: string, data: string): Promise<string>;

    settleHtlc(serializedTx: string, secret: string, hash: string): Promise<TTransaction>;
}

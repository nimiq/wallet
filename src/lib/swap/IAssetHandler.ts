export interface IAssetHandler<TTransaction> {
    // new (client: any): AssetChainInterface;

    findTransaction(address: string, test: (tx: TTransaction) => boolean): Promise<TTransaction>;

    awaitHtlcCreation(
        address: string,
        value: number,
        data: string,
        onPending: (tx: TTransaction) => any,
    ): Promise<TTransaction>;

    createHtlc(serializedTx: string): Promise<TTransaction>;

    awaitHtlcSettlement(address: string, data: string): Promise<TTransaction>;

    settleHtlc(serializedTx: string): Promise<TTransaction>;
}

export interface IAssetHandler<TTransaction> {
    // new (client: any): AssetChainInterface;

    findTransaction(
        address: string,
        test: (tx: TTransaction) => boolean,
    ): Promise<TTransaction>;
}

import { Swap, SwapAsset, Contract, NimHtlcDetails, BtcHtlcDetails } from '@nimiq/fastspot-api';
import { IAssetHandler, Transaction } from './IAssetHandler';
import { NimiqAssetHandler } from './NimiqAssetHandler';
import { BitcoinAssetHandler } from './BitcoinAssetHandler';

export class SwapHandler<FromAsset extends SwapAsset, ToAsset extends SwapAsset> {
    private swap: Swap;
    private fromAssetHandler: IAssetHandler<FromAsset>;
    private toAssetHandler: IAssetHandler<ToAsset>;

    private static makeAssetHandler<TAsset extends SwapAsset>(asset: TAsset, client: any): IAssetHandler<TAsset> {
        switch (asset) {
            case SwapAsset.NIM: return new NimiqAssetHandler(client);
            case SwapAsset.BTC: return new BitcoinAssetHandler(client);
            default: throw new Error(`Unsupported asset: ${asset}`);
        }
    }

    constructor(swap: Swap, fromClient: any, toClient: any) {
        this.swap = swap;

        this.fromAssetHandler = SwapHandler.makeAssetHandler(this.swap.from.asset, fromClient);
        this.toAssetHandler = SwapHandler.makeAssetHandler(this.swap.to.asset, toClient);
    }

    public async awaitIncoming(onPending: (tx: Transaction<ToAsset>) => any): Promise<Transaction<ToAsset>> {
        const contract = this.swap.contracts[this.swap.to.asset] as Contract<ToAsset>;

        return this.toAssetHandler.awaitHtlcCreation(
            contract.htlc.address,
            this.swap.to.amount,
            this.swap.to.asset === SwapAsset.NIM ? (contract.htlc as NimHtlcDetails).data : '',
            onPending,
        );
    }

    public async createOutgoing(
        serializedTx: string,
        onPending: (tx: Transaction<FromAsset>) => any,
    ): Promise<Transaction<FromAsset>> {
        return this.fromAssetHandler.createHtlc(serializedTx, onPending);
    }

    public async awaitSecret(): Promise<string> {
        const contract = this.swap.contracts[this.swap.from.asset] as Contract<ToAsset>;

        return this.fromAssetHandler.awaitSwapSecret(
            contract.htlc.address,
            this.swap.from.asset === SwapAsset.BTC ? (contract.htlc as BtcHtlcDetails).script : '',
        );
    }

    public async settleIncoming(
        serializedTx: string,
        secret: string,
    ): Promise<Transaction<ToAsset>> {
        return this.toAssetHandler.settleHtlc(
            serializedTx,
            secret,
            this.swap.hash,
        );
    }
}

import { Swap, SwapAsset, Contract, NimHtlcDetails, BtcHtlcDetails } from '@nimiq/fastspot-api';
import { IAssetHandler, Transaction, Client } from './IAssetHandler';
import { NimiqAssetHandler } from './NimiqAssetHandler';
import { BitcoinAssetHandler } from './BitcoinAssetHandler';

export class SwapHandler<FromAsset extends SwapAsset, ToAsset extends SwapAsset> {
    private swap: Swap;
    private fromAssetHandler: IAssetHandler<FromAsset>;
    private toAssetHandler: IAssetHandler<ToAsset>;

    private static makeAssetHandler<TAsset extends SwapAsset>(
        asset: TAsset,
        client: Client<TAsset>,
    ): IAssetHandler<TAsset> {
        switch (asset) {
            case SwapAsset.NIM:
                return new NimiqAssetHandler(client as Client<SwapAsset.NIM>) as IAssetHandler<SwapAsset>;
            case SwapAsset.BTC:
                return new BitcoinAssetHandler(client as Client<SwapAsset.BTC>) as IAssetHandler<SwapAsset>;
            default:
                throw new Error(`Unsupported asset: ${asset}`);
        }
    }

    constructor(swap: Swap, fromClient: Client<FromAsset>, toClient: Client<ToAsset>) {
        this.swap = swap;

        this.fromAssetHandler = SwapHandler.makeAssetHandler<FromAsset>(this.swap.from.asset as FromAsset, fromClient);
        this.toAssetHandler = SwapHandler.makeAssetHandler<ToAsset>(this.swap.to.asset as ToAsset, toClient);
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

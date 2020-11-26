import { AssetAdapter, SwapAsset, Transaction, Client } from './IAssetAdapter';
import { NimiqAssetAdapter } from './NimiqAssetAdapter';
import { BitcoinAssetAdapter } from './BitcoinAssetAdapter';
import { EuroAssetAdapter } from './EuroAssetAdapter';

// Re-export to centralize exports
export { SwapAsset };

export type Contract<TAsset extends SwapAsset> = {
    htlc: {
        address: string,
    }
    & (TAsset extends SwapAsset.NIM ? { data: string }
    : TAsset extends SwapAsset.BTC ? { script: string }
    : {}),
}

export type Swap<FromAsset extends SwapAsset, ToAsset extends SwapAsset> = {
    from: {
        asset: FromAsset,
        amount: number,
    },
    to: {
        asset: ToAsset,
        amount: number,
    },
    hash: string,
    contracts: { [asset in FromAsset | ToAsset]: Contract<FromAsset | ToAsset> },
}

export class SwapHandler<FromAsset extends SwapAsset, ToAsset extends SwapAsset> {
    private swap: Swap<FromAsset, ToAsset>;
    private fromAssetAdapter: AssetAdapter<FromAsset>;
    private toAssetAdapter: AssetAdapter<ToAsset>;

    private static makeAssetAdapter<TAsset extends SwapAsset>(
        asset: TAsset,
        client: Client<TAsset>,
    ): AssetAdapter<TAsset> {
        switch (asset) {
            case SwapAsset.NIM:
                return new NimiqAssetAdapter(client as Client<SwapAsset.NIM>) as AssetAdapter<SwapAsset>;
            case SwapAsset.BTC:
                return new BitcoinAssetAdapter(client as Client<SwapAsset.BTC>) as AssetAdapter<SwapAsset>;
            case SwapAsset.EUR:
                return new EuroAssetAdapter(client as Client<SwapAsset.EUR>) as AssetAdapter<SwapAsset>;
            default:
                throw new Error(`Unsupported asset: ${asset}`);
        }
    }

    constructor(swap: Swap<FromAsset, ToAsset>, fromClient: Client<FromAsset>, toClient: Client<ToAsset>) {
        this.swap = swap;

        this.fromAssetAdapter = SwapHandler.makeAssetAdapter(this.swap.from.asset, fromClient);
        this.toAssetAdapter = SwapHandler.makeAssetAdapter(this.swap.to.asset, toClient);
    }

    public async awaitIncoming(onPending: (tx: Transaction<ToAsset>) => any): Promise<Transaction<ToAsset>> {
        const contract = this.swap.contracts[this.swap.to.asset] as Contract<ToAsset>;

        return this.toAssetAdapter.awaitHtlcFunding(
            contract.htlc.address,
            this.swap.to.amount,
            this.swap.to.asset === SwapAsset.NIM ? (contract as Contract<SwapAsset.NIM>).htlc.data : '',
            onPending,
        );
    }

    public async createOutgoing(
        serializedTx: string,
        onPending: (tx: Transaction<FromAsset>) => any,
    ): Promise<Transaction<FromAsset>> {
        const contract = this.swap.contracts[this.swap.from.asset] as Contract<ToAsset>;
        return this.fromAssetAdapter.fundHtlc(contract.htlc.address, serializedTx, onPending);
    }

    public async awaitSecret(): Promise<string> {
        const contract = this.swap.contracts[this.swap.from.asset] as Contract<ToAsset>;

        return this.fromAssetAdapter.awaitSwapSecret(
            contract.htlc.address,
            this.swap.from.asset === SwapAsset.BTC ? (contract as Contract<SwapAsset.BTC>).htlc.script : '',
        );
    }

    public async settleIncoming(
        serializedTx: string,
        secret: string,
    ): Promise<Transaction<ToAsset>> {
        return this.toAssetAdapter.settleHtlc(
            serializedTx,
            secret,
            this.swap.hash,
        );
    }
}

import { Htlc, HtlcStatus, SettlementInstruction } from '../OasisApi';
import { AssetAdapter, SwapAsset } from './IAssetAdapter';

export type HtlcDetails = Htlc<HtlcStatus>;

export interface OasisClient {
    getHtlc(id: string): Promise<HtlcDetails>;
    settleHtlc(id: string, secret: string, settlementJWS: string): Promise<HtlcDetails>;
}

export class EuroAssetAdapter implements AssetAdapter<SwapAsset.EUR> {
    constructor(private client: OasisClient) {}

    public async findTransaction(
        id: string,
        test: (htlc: HtlcDetails) => boolean,
    ): Promise<HtlcDetails> {
        const check = async () => {
            try {
                const htlc = await this.client.getHtlc(id);
                if (test(htlc)) return htlc;
            } catch (error) {
                // Ignore
            }
            return null;
        };

        // Check now
        const htlc = await check();
        if (htlc) return htlc;

        // Keep checking on an interval
        return new Promise((resolve) => {
            const interval = window.setInterval(() => {
                check().then((htlc) => { // eslint-disable-line no-shadow
                    if (htlc) {
                        window.clearInterval(interval);
                        resolve(htlc);
                    }
                });
            }, 5 * 1000); // Every 5 seconds
        });
    }

    public async awaitHtlcFunding(
        id: string,
        value: number,
        data?: string,
        onPending?: (htlc: HtlcDetails) => any,
    ): Promise<HtlcDetails> {
        let calledOnPending = false;
        return this.findTransaction(
            id,
            (htlc) => {
                if (htlc.status === HtlcStatus.PENDING && !calledOnPending) {
                    if (typeof onPending === 'function') onPending(htlc);
                    calledOnPending = true;
                }
                if (htlc.status !== HtlcStatus.CLEARED) return false;
                if (htlc.amount !== value) return false;

                return true;
            },
        );
    }

    // eslint-disable-next-line class-methods-use-this
    public async fundHtlc(): Promise<HtlcDetails> {
        throw new Error('Method "fundHtlc" not available for EUR HTLCs');
    }

    public async awaitHtlcSettlement(id: string): Promise<Htlc<HtlcStatus.SETTLED>> {
        return this.findTransaction(
            id,
            (htlc) => typeof (htlc as Htlc<HtlcStatus.SETTLED>).preimage.value === 'string',
        ) as Promise<Htlc<HtlcStatus.SETTLED>>;
    }

    public async awaitSwapSecret(id: string): Promise<string> {
        const tx = await this.awaitHtlcSettlement(id);
        return tx.preimage.value;
    }

    public async settleHtlc(settlementJWS: string, secret: string): Promise<HtlcDetails> {
        const payload = JSON.parse(atob(settlementJWS.split('.')[1])) as SettlementInstruction;
        return this.client.settleHtlc(payload.contractId, secret, settlementJWS);
    }
}

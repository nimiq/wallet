import { captureException } from '@sentry/browser';
import Config from 'config';
import { Htlc, HtlcStatus, SettlementInstruction } from '../OasisApi';
import { AssetAdapter, SwapAsset } from './IAssetAdapter';

export type HtlcDetails = Htlc<HtlcStatus>;

export interface OasisClient {
    getHtlc(id: string): Promise<HtlcDetails>;
    settleHtlc(id: string, secret: string, settlementJWS: string): Promise<HtlcDetails>;
}

export class EuroAssetAdapter implements AssetAdapter<SwapAsset.EUR> {
    private cancelCallback: ((reason: Error) => void) | null = null;
    private stopped = false;

    constructor(private client: OasisClient) {}

    public async findTransaction(
        id: string,
        test: (htlc: HtlcDetails) => boolean,
    ): Promise<HtlcDetails> {
        const check = async (): Promise<Htlc<HtlcStatus> | null> => {
            try {
                const htlc = await this.client.getHtlc(id);
                if (test(htlc)) return htlc;
            } catch (error) {
                console.error(error); // eslint-disable-line no-console

                if (error.message !== 'HTLC not found') {
                    // TODO: Extract error handling from libswap to application
                    if (Config.reportToSentry) captureException(error);
                }
            }
            return null;
        };

        // Check now
        const htlc = await check();
        if (htlc) return htlc;

        // Keep checking on an interval
        return new Promise((resolve, reject) => {
            const interval = window.setInterval(() => {
                check().then((htlc) => { // eslint-disable-line no-shadow
                    if (htlc) {
                        window.clearInterval(interval);
                        this.cancelCallback = null;
                        resolve(htlc);
                    }
                });
            }, 5 * 1000); // Every 5 seconds

            this.cancelCallback = (reason: Error) => {
                window.clearInterval(interval);
                reject(reason);
            };
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
                if (htlc.amount !== value) return false;
                if (htlc.status !== HtlcStatus.CLEARED && htlc.status !== HtlcStatus.SETTLED) return false;

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

    public stop(reason: Error): void {
        if (this.cancelCallback) this.cancelCallback(reason);
        this.stopped = true;
    }

    public async settleHtlc(settlementJWS: string, secret: string): Promise<HtlcDetails> {
        if (this.stopped) throw new Error('EuroAssetAdapter called while stopped');
        const payload = JSON.parse(atob(settlementJWS.split('.')[1])) as SettlementInstruction;
        return this.client.settleHtlc(payload.contractId, secret, settlementJWS);
    }
}

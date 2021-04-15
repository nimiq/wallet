import { captureException } from '@sentry/vue';
import Config from 'config';
import { Htlc, HtlcStatus, SettlementInstruction, SettlementStatus } from '../OasisApi';
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
                check().then((htlc) => { // eslint-disable-line @typescript-eslint/no-shadow
                    if (!htlc) return;
                    cleanup();
                    resolve(htlc);
                });
            }, 5 * 1000); // Every 5 seconds

            const cleanup = () => {
                window.clearInterval(interval);
                this.cancelCallback = null;
            };

            this.cancelCallback = (reason: Error) => {
                cleanup();
                reject(reason);
            };
        });
    }

    public async awaitHtlcFunding(
        id: string,
        value: number,
        data?: string,
        onUpdate?: (htlc: HtlcDetails) => any,
    ): Promise<HtlcDetails> {
        return this.findTransaction(
            id,
            (htlc) => {
                if (htlc.amount + htlc.fee !== value) return false;

                if (htlc.status === HtlcStatus.CLEARED || htlc.status === HtlcStatus.SETTLED) return true;

                if (typeof onUpdate === 'function') onUpdate(htlc);

                return false;
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
            (htlc) => typeof htlc.preimage.value === 'string',
        ) as Promise<Htlc<HtlcStatus.SETTLED>>;
    }

    public async awaitSwapSecret(id: string): Promise<string> {
        const tx = await this.awaitHtlcSettlement(id);
        return tx.preimage.value;
    }

    public async settleHtlc(settlementJWS: string, secret: string): Promise<HtlcDetails> {
        if (this.stopped) throw new Error('EuroAssetAdapter called while stopped');

        const jwsBody = settlementJWS.split('.')[1];
        // JWS is encoded as Base64Url
        const jsonBody = atob(jwsBody.replace(/_/g, '/').replace(/-/g, '+'));
        const payload = JSON.parse(jsonBody) as SettlementInstruction;

        let htlc: HtlcDetails;
        try {
            htlc = await this.client.settleHtlc(payload.contractId, secret, settlementJWS);
        } catch (error) {
            console.error(error); // eslint-disable-line no-console
            htlc = await this.client.getHtlc(payload.contractId);
        }

        if (htlc.status !== HtlcStatus.SETTLED || htlc.settlement.status === SettlementStatus.WAITING) {
            throw new Error('Could not settle OASIS HTLC (invalid secret?)');
        }

        return htlc;
    }

    public async awaitSettlementConfirmation(id: string, onUpdate?: (tx: HtlcDetails) => any): Promise<HtlcDetails> {
        return this.findTransaction(id, (htlc) => {
            if (htlc.status !== HtlcStatus.SETTLED) return false;

            if (htlc.settlement.status === SettlementStatus.ACCEPTED
                || htlc.settlement.status === SettlementStatus.CONFIRMED) return true;

            if (typeof onUpdate === 'function') onUpdate(htlc);

            return false;
        });
    }

    public stop(reason: Error): void {
        if (this.cancelCallback) this.cancelCallback(reason);
        this.stopped = true;
    }
}

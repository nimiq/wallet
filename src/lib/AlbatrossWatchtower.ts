import { useConfig } from '@/composables/useConfig';

/* eslint-disable camelcase */
type StartUnstakePayload = {
    staker_address: string,
    transactions: {
        inactive_stake_tx_hash: string,
        retire_tx: string,
        unstake_tx: string,
    },
};
/* eslint-enable camelcase */

function toBasicAuth(username: string, password: string): string {
    // btoa expects binary string; credentials are ASCII
    return `Basic ${btoa(`${username}:${password}`)}`;
}

function strip0x(hex: string | undefined): string | undefined {
    if (!hex) return hex;
    return hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
}

export async function startUnstaking(payload: StartUnstakePayload): Promise<void> {
    const { config } = useConfig();
    const wt = (config as any).albatrossWatchtower as undefined | {
        endpoint: string,
    };

    if (!wt?.endpoint) {
        // eslint-disable-next-line no-console
        console.warn('watchtower: not configured, skipping startUnstaking');
        return; // Fail silently if not configured
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const username = process.env.VUE_APP_WT_USERNAME || process.env.WT_USERNAME;
    const password = process.env.VUE_APP_WT_PASSWORD || process.env.WT_PASSWORD;
    if (username && password) headers.Authorization = toBasicAuth(username, password);

    const url = `${wt.endpoint.replace(/\/$/, '')}/unstake`;
    // eslint-disable-next-line no-console
    console.debug('watchtower: POST /unstake', {
        url,
        staker: payload.staker_address,
        hasRetire: !!payload.transactions?.retire_tx,
        unstakeLen: payload.transactions?.unstake_tx?.length,
        inactiveStakeTxHash: payload.transactions?.inactive_stake_tx_hash,
    });
    let response: Response;
    try {
        const normalized = {
            staker_address: payload.staker_address,
            transactions: {
                inactive_stake_tx_hash: strip0x(payload.transactions.inactive_stake_tx_hash)!,
                retire_tx: strip0x(payload.transactions.retire_tx)!,
                unstake_tx: strip0x(payload.transactions.unstake_tx)!,
            },
        };
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(normalized),
        });
    } catch (networkError: any) {
        // eslint-disable-next-line no-console
        console.error('watchtower: network error', networkError?.message || networkError);
        throw networkError;
    }

    if (!response.ok) {
        let message = 'Watchtower request failed';
        try {
            const data = await response.json();
            message = data?.message || JSON.stringify(data);
        } catch (_) { /* ignore */ }
        // eslint-disable-next-line no-console
        console.error('watchtower: HTTP error', response.status, message);
        if (response.status === 406) {
            try {
                const txHash = strip0x(payload.transactions.inactive_stake_tx_hash)!;
                const statusRes = await fetch(`${wt.endpoint.replace(/\/$/, '')}/transaction/${txHash}`, {
                    headers: { Accept: 'application/json' },
                });
                if (statusRes.ok) {
                    const statusJson = await statusRes.json();
                    // eslint-disable-next-line no-console
                    console.debug('watchtower: transaction status', statusJson);
                } else {
                    // eslint-disable-next-line no-console
                    console.debug('watchtower: transaction status HTTP', statusRes.status);
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.debug('watchtower: transaction status probe failed');
            }
        }
        throw new Error(`HTTP ${response.status}: ${message}`);
    }
}

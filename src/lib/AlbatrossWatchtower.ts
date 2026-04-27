import { useConfig } from '@/composables/useConfig';

type StartUnstakeInput = {
    stakerAddress: string,
    inactiveStakeTxHash: string,
    retireTx: string,
    unstakeTx: string,
};

type StartSwitchValidatorInput = {
    stakerAddress: string,
    deactivationTxHash: string,
    updateStakerTx: string,
};

function toBasicAuth(username: string, password: string): string {
    // btoa expects binary string; credentials are ASCII
    return `Basic ${btoa(`${username}:${password}`)}`;
}

function strip0x(hex: string | undefined): string | undefined {
    if (!hex) return hex;
    return hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
}

function getWatchtowerEndpoint(): string | null {
    const { config } = useConfig();
    const wt = (config as any).albatrossWatchtower as undefined | { endpoint: string };
    return wt?.endpoint?.replace(/\/$/, '') || null;
}

function buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const username = process.env.VUE_APP_WT_USERNAME || process.env.WT_USERNAME;
    const password = process.env.VUE_APP_WT_PASSWORD || process.env.WT_PASSWORD;
    if (username && password) headers.Authorization = toBasicAuth(username, password);
    return headers;
}

/**
 * POST a body to a watchtower endpoint, throwing on any non-2xx response.
 * Returns silently (no throw) when the watchtower is not configured.
 */
async function postToWatchtower<T extends object>(path: string, body: T): Promise<void> {
    const endpoint = getWatchtowerEndpoint();
    if (!endpoint) {
        // eslint-disable-next-line no-console
        console.warn(`watchtower: not configured, skipping POST ${path}`);
        return;
    }

    const url = `${endpoint}${path}`;
    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: buildAuthHeaders(),
            body: JSON.stringify(body),
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
        throw new Error(`HTTP ${response.status}: ${message}`);
    }
}

/* eslint-disable camelcase */
export async function startUnstaking(input: StartUnstakeInput): Promise<void> {
    return postToWatchtower('/unstake', {
        staker_address: input.stakerAddress,
        transactions: {
            inactive_stake_tx_hash: strip0x(input.inactiveStakeTxHash)!,
            retire_tx: strip0x(input.retireTx)!,
            unstake_tx: strip0x(input.unstakeTx)!,
        },
    });
}

export async function startSwitchValidator(input: StartSwitchValidatorInput): Promise<void> {
    return postToWatchtower('/switch-validator', {
        staker_address: input.stakerAddress,
        transactions: {
            inactive_stake_tx_hash: strip0x(input.deactivationTxHash)!,
            update_tx: strip0x(input.updateStakerTx)!,
        },
    });
}
/* eslint-enable camelcase */

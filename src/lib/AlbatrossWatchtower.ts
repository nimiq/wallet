import { ValidationUtils } from '@nimiq/utils';
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

export type WatchtowerOperationKind = 'unstake' | 'switch';
export type WatchtowerJobStatus = 'pending' | 'confirmed' | 'failed';
export type WatchtowerJob = {
    id: string,
    kind: WatchtowerOperationKind,
    stakerAddress: string,
    status: WatchtowerJobStatus,
    // Height carried by the status of the failed transaction, else of the last one; it dates a failed
    // job, so a stale one is not taken for the current payout.
    atHeight?: number,
};

// The list endpoints answer with at most this many jobs, newest first (MAX_RETURN_ENTRIES in
// albatross-watchtower/src/state/db_types.rs). A full answer may have dropped an older job.
const WATCHTOWER_LIST_CAP = 100;

const OPERATION_PATHS: Record<WatchtowerOperationKind, string> = {
    unstake: '/unstake',
    switch: '/switch-validator',
};

/* eslint-disable camelcase */
// Serde's externally tagged enum: a unit variant is its bare name (`"Valid"`), any other variant a
// one-key object (`{ "Pending": 5 }`, `{ "Sent": [5, 2] }`).
type RawStatus = string | Record<string, unknown>;
type RawTransaction = { hash?: string, status?: RawStatus };
type RawJob = {
    id: string,
    staker_address: string,
    retire_transaction?: RawTransaction,
    unstake_transaction?: RawTransaction,
    update_transaction?: RawTransaction,
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
 * Send a request to the watchtower. Resolves with the response, or `null` (without throwing) when
 * the watchtower is not configured. Throws on network errors; status handling is up to the caller.
 */
async function requestWatchtower(path: string, init: RequestInit): Promise<Response | null> {
    const endpoint = getWatchtowerEndpoint();
    if (!endpoint) {
        // eslint-disable-next-line no-console
        console.warn(`watchtower: not configured, skipping ${init.method} ${path}`);
        return null;
    }
    try {
        return await fetch(`${endpoint}${path}`, { ...init, headers: buildAuthHeaders() });
    } catch (networkError: any) {
        // eslint-disable-next-line no-console
        console.error('watchtower: network error', networkError?.message || networkError);
        throw networkError;
    }
}

/**
 * POST a body to a watchtower endpoint, throwing on any non-2xx response. Resolves with the id of
 * the created job, or `undefined` when the watchtower answered without one (queued, but not
 * followable) or is not configured, in which case nothing was sent.
 */
async function postToWatchtower<T extends object>(path: string, body: T): Promise<string | undefined> {
    const response = await requestWatchtower(path, { method: 'POST', body: JSON.stringify(body) });
    if (!response) return undefined;

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

    try {
        const data = await response.json();
        return typeof data?.id === 'string' ? data.id : undefined;
    } catch (_) {
        return undefined;
    }
}

/**
 * GET a watchtower endpoint. Resolves with the parsed body, or `null` when the watchtower is not
 * configured or the resource is unknown (204/404). Throws on network errors and other non-2xx responses.
 */
async function getFromWatchtower<T>(path: string): Promise<T | null> {
    const response = await requestWatchtower(path, { method: 'GET' });
    if (!response || response.status === 204 || response.status === 404) return null;
    if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error('watchtower: HTTP error', response.status);
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
}

// `Sent` carries `[height, retries]`, the other variants a bare height, `Valid` nothing.
function parseStatus(status: RawStatus | undefined): { variant?: string, height?: number } {
    if (typeof status === 'string') return { variant: status };
    if (!status) return {};
    const [variant] = Object.keys(status);
    const value = status[variant];
    const height = Array.isArray(value) ? value[0] : value;
    return { variant, height: typeof height === 'number' ? height : undefined };
}

// Any failed transaction fails the job; the job is done only once its last transaction is confirmed.
// Anything unrecognised counts as pending — the safe reading, as it keeps the gates up.
function aggregateStatus(transactions: (RawTransaction | undefined)[]): Pick<WatchtowerJob, 'status' | 'atHeight'> {
    const parsed = transactions.map((tx) => parseStatus(tx?.status));
    const failed = parsed.find((p) => p.variant === 'Failed');
    if (failed) return { status: 'failed', atHeight: failed.height };
    const last = parsed[parsed.length - 1];
    return { status: last?.variant === 'Confirmed' ? 'confirmed' : 'pending', atHeight: last?.height };
}

function isRawJob(raw: unknown): raw is RawJob {
    return !!raw && typeof raw === 'object'
        && typeof (raw as RawJob).id === 'string'
        && typeof (raw as RawJob).staker_address === 'string';
}

function parseJob(kind: WatchtowerOperationKind, raw: RawJob): WatchtowerJob {
    const transactions = kind === 'unstake'
        ? [raw.retire_transaction, raw.unstake_transaction]
        : [raw.update_transaction];
    return {
        id: raw.id,
        kind,
        stakerAddress: raw.staker_address,
        ...aggregateStatus(transactions),
    };
}

export async function fetchWatchtowerJob(kind: WatchtowerOperationKind, id: string): Promise<WatchtowerJob | null> {
    const raw = await getFromWatchtower<unknown>(`${OPERATION_PATHS[kind]}/${encodeURIComponent(id)}`);
    return isRawJob(raw) ? parseJob(kind, raw) : null;
}

const STATUS_RANK: Record<WatchtowerJobStatus, number> = { pending: 0, failed: 1, confirmed: 2 };

/**
 * Every job the watchtower holds for a staker, pending ones first, then failed, then confirmed. Asked
 * for this staker via `?staker=`, so "not found" is conclusive; `complete` is false when there is no
 * watchtower, or when one ignoring the parameter answered at the cap and a job may be missing.
 */
export async function fetchWatchtowerJobsForStaker(
    stakerAddress: string,
): Promise<{ jobs: WatchtowerJob[], complete: boolean }> {
    const wanted = ValidationUtils.normalizeAddress(stakerAddress);
    // normalizeAddress spaces in blocks of four; the watchtower wants it unspaced
    const query = `?staker=${encodeURIComponent(wanted.replace(/ /g, ''))}`;
    const [unstakeList, switchList] = await Promise.all([
        getFromWatchtower<unknown[]>(`${OPERATION_PATHS.unstake}${query}`),
        getFromWatchtower<unknown[]>(`${OPERATION_PATHS.switch}${query}`),
    ]);
    if (!unstakeList || !switchList) return { jobs: [], complete: false }; // not configured
    const parsed = [
        ...unstakeList.filter(isRawJob).map((raw) => parseJob('unstake', raw)),
        ...switchList.filter(isRawJob).map((raw) => parseJob('switch', raw)),
    ];
    const jobs = parsed
        .filter((job) => ValidationUtils.normalizeAddress(job.stakerAddress) === wanted)
        .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]); // stable, keeps each list's order
    // A watchtower predating `?staker=` ignores it and answers with every staker's jobs; only then can
    // this staker's job lie beyond the cap. TODO: drop the filter and this check once every watchtower
    // honours the parameter (albatross-watchtower 672a1f0).
    const filterHonoured = jobs.length === parsed.length;
    const withinCap = unstakeList.length < WATCHTOWER_LIST_CAP && switchList.length < WATCHTOWER_LIST_CAP;
    return { jobs, complete: filterHonoured || withinCap };
}

/* eslint-disable camelcase */
export async function startUnstaking(input: StartUnstakeInput): Promise<string | undefined> {
    return postToWatchtower(OPERATION_PATHS.unstake, {
        staker_address: input.stakerAddress,
        transactions: {
            inactive_stake_tx_hash: strip0x(input.inactiveStakeTxHash)!,
            retire_tx: strip0x(input.retireTx)!,
            unstake_tx: strip0x(input.unstakeTx)!,
        },
    });
}

export async function startSwitchValidator(input: StartSwitchValidatorInput): Promise<string | undefined> {
    return postToWatchtower(OPERATION_PATHS.switch, {
        staker_address: input.stakerAddress,
        transactions: {
            inactive_stake_tx_hash: strip0x(input.deactivationTxHash)!,
            update_tx: strip0x(input.updateStakerTx)!,
        },
    });
}
/* eslint-enable camelcase */

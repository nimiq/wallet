let API_URL: string | undefined = 'https://api-sandbox.nimiqoasis.com/v1';

type OasisError = {
    type: string,
    title: string,
    status: number,
}

enum OasisAsset {
    EUR = 'eur',
}

export enum Asset {
    EUR = 'EUR',
}

export enum HtlcStatus {
    PENDING = 'pending',
    CLEARED = 'cleared',
    SETTLED = 'settled',
    EXPIRED = 'expired',
}

export enum ClearingStatus {
    WAITING = 'waiting',
    PARTIAL = 'partial',
    DENIED = 'denied',
}

export enum SettlementStatus {
    WAITING = 'waiting',
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DENIED = 'denied',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
}

export enum DeniedReason {
    LIMIT_EXCEEDED = 'limit-exceeded',
}

export enum TransactionType {
    SEPA = 'sepa',
    MOCK = 'mock', // Only available in Sandbox environment
}

export type SepaRecipient = {
    iban: string,
    name: string,
    bic?: string,
    address?: {
        line1: string,
        line2?: string,
        city: string,
        state: string,
        postalCode: string,
        country: string,
    },
}

export type SepaClearingInstruction = {
    type: TransactionType.SEPA,
    amount: number,
    recipient: SepaRecipient,
    purpose?: string,
}

export type MockClearingInstruction = {
    type: TransactionType.MOCK,
    description: string,
}

export type ClearingInstruction = SepaClearingInstruction | MockClearingInstruction;

export type ClearingInfo<CStatus extends ClearingStatus> = {
    status: CStatus,
    type?: TransactionType,
    options: ClearingInstruction[],
    detail: CStatus extends ClearingStatus.PARTIAL ? {
        amount: number,
    } : CStatus extends ClearingStatus.DENIED ? {
        reason: string,
    } : never,
}

export type SettlementInfo<SStatus extends SettlementStatus> = {
    status: SStatus,
    type?: TransactionType,
    options: SStatus extends SettlementStatus.PENDING | SettlementStatus.DENIED | SettlementStatus.FAILED
        ? SettlementDescriptor[] : never,
    detail: SStatus extends SettlementStatus.DENIED | SettlementStatus.FAILED ? {
        reason: string,
    } : never,
}

export type SettlementDescriptor = {
    type: TransactionType,
}

export type SepaSettlementInstruction = {
    type: TransactionType.SEPA,
    contractId: string,
    recipient: SepaRecipient,
}

export type MockSettlementInstruction = {
    type: TransactionType.MOCK,
    contractId: string,
}

export type SettlementInstruction = SepaSettlementInstruction | MockSettlementInstruction;

export enum KeyType {
    OCTET_KEY_PAIR = 'OKP',
    ELLIPTIC_CURVE = 'EC',
}

export type OctetKeyPair = {
    kty: KeyType.OCTET_KEY_PAIR,
    crv: 'Ed25519',
    x: string,
}

export type EllipticCurveKey = {
    kty: KeyType.ELLIPTIC_CURVE,
    crv: 'P-256',
    x: string,
    y: string,
}

type OasisHtlc<TStatus extends HtlcStatus> = Omit<Htlc<TStatus>, 'asset' | 'expires'> & {
    asset: OasisAsset,
    expires: string,
};

export type Htlc<TStatus extends HtlcStatus> = {
    id: string,
    status: TStatus,
    asset: Asset,
    amount: number,
    fee: number,
    beneficiary: OctetKeyPair | EllipticCurveKey,
    hash: {
        algorithm: 'sha256' | 'blake2b', // 'sha512' excluded for now, as it requires a different preimage size
        value: string,
    },
    preimage: {
        size: 32,
        value: TStatus extends HtlcStatus.SETTLED ? string : never,
    },
    expires: number,
    clearing: TStatus extends HtlcStatus.PENDING ? ClearingInfo<ClearingStatus> : never,
    settlement: TStatus extends HtlcStatus.CLEARED | HtlcStatus.SETTLED ? SettlementInfo<SettlementStatus> : never,
}

export function init(url: string) {
    if (!url) throw new Error('url must be provided');
    API_URL = url;
}

async function api(
    path: string,
    method: 'POST' | 'GET' | 'DELETE',
    body?: Record<string, unknown>,
): Promise<OasisHtlc<HtlcStatus>> {
    if (!API_URL) throw new Error('API URL not set, call init() first');

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
        const error = await response.json() as OasisError;
        throw new Error(error.title);
    }
    return response.json();
}

export async function createHtlc(
    contract: Pick<OasisHtlc<HtlcStatus>, 'asset' | 'amount' | 'beneficiary' | 'hash' | 'preimage' | 'expires'> & {
        includeFee: boolean,
    },
): Promise<Htlc<HtlcStatus.PENDING>> {
    if (contract.beneficiary.kty === KeyType.OCTET_KEY_PAIR || contract.beneficiary.kty === KeyType.ELLIPTIC_CURVE) {
        const { x } = contract.beneficiary;
        if (x.length === 64) {
            contract.beneficiary.x = hexToBase64(x);
        } else if (fromBase64Url(x).length !== 32) {
            throw new Error('Beneficiary x must be in HEX or Base64Url format');
        }
        while (contract.beneficiary.x.slice(-1) === '.') {
            contract.beneficiary.x = contract.beneficiary.x.slice(0, -1);
        }
    }

    if (contract.beneficiary.kty === KeyType.ELLIPTIC_CURVE) {
        const { y } = contract.beneficiary;
        if (y.length === 64) {
            contract.beneficiary.y = hexToBase64(y);
        } else if (fromBase64Url(y).length !== 32) {
            throw new Error('Beneficiary y must be in HEX or Base64Url format');
        }
        while (contract.beneficiary.y.slice(-1) === '.') {
            contract.beneficiary.y = contract.beneficiary.y.slice(0, -1);
        }
    }

    if (contract.hash.value.length === 64) {
        contract.hash.value = hexToBase64(contract.hash.value);
    } else if (fromBase64Url(contract.hash.value).length !== 32) {
        throw new Error('Hash value must be in HEX or Base64Url format');
    }
    while (contract.hash.value.slice(-1) === '.') {
        contract.hash.value = contract.hash.value.slice(0, -1);
    }

    if (typeof contract.expires === 'number') {
        const expires = contract.expires * (contract.expires < 1e12 ? 1000 : 1);
        contract.expires = new Date(expires).toISOString();
    }

    const htlc = await api('/htlc', 'POST', contract) as OasisHtlc<HtlcStatus.PENDING>;
    return convertHtlc(htlc);
}

export async function getHtlc(id: string): Promise<Htlc<HtlcStatus>> {
    const htlc = await api(`/htlc/${id}`, 'GET');
    return convertHtlc(htlc);
}

export async function settleHtlc(
    id: string,
    secret: string,
    settlementJWS: string,
): Promise<Htlc<HtlcStatus.SETTLED>> {
    if (secret.length === 64) {
        secret = hexToBase64(secret);
    } else if (fromBase64Url(secret).length !== 32) {
        throw new Error('Secret must be in HEX or Base64Url format');
    }
    while (secret.slice(-1) === '.') {
        secret = secret.slice(0, -1);
    }

    if ((settlementJWS.split('.') || []).length !== 3) {
        throw new Error('Invalid settlement instruction JWS');
    }

    const htlc = await api(`/htlc/${id}/settle`, 'POST', {
        preimage: secret,
        settlement: settlementJWS,
    }) as OasisHtlc<HtlcStatus.SETTLED>;
    return convertHtlc(htlc);
}

export async function sandboxMockClearHtlc(id: string): Promise<boolean> {
    if (!API_URL) throw new Error('API URL not set, call init() first');

    return fetch(`${API_URL}/mock/clear/${id}`, {
        method: 'POST',
        mode: 'no-cors',
    }).then(async (res) => {
        if (!res.ok) {
            throw new Error('Mock-clearing failed');
        }
        return true;
    });
}

function convertHtlc<TStatus extends HtlcStatus>(htlc: OasisHtlc<TStatus>): Htlc<TStatus> {
    const contract: Htlc<TStatus> = {
        id: htlc.id,
        status: htlc.status,
        asset: htlc.asset.toUpperCase() as Asset,
        amount: coinsToUnits(htlc.asset, htlc.amount),
        fee: coinsToUnits(htlc.asset, htlc.fee, true),
        beneficiary: {
            ...htlc.beneficiary,
            x: base64ToHex(htlc.beneficiary.x),
            ...(htlc.beneficiary.kty === KeyType.ELLIPTIC_CURVE ? {
                y: base64ToHex(htlc.beneficiary.y),
            } : {}),
        },
        hash: {
            ...htlc.hash,
            value: base64ToHex(htlc.hash.value),
        },
        // @ts-expect-error Type string is not assignable to type TStatus extends HtlcStatus.SETTLED ? string : never
        preimage: {
            ...htlc.preimage,
            ...('value' in htlc.preimage ? {
                value: base64ToHex((htlc as unknown as OasisHtlc<HtlcStatus.SETTLED>).preimage.value),
            } : {}),
        },
        expires: Math.floor(Date.parse(htlc.expires) / 1000),
        ...('clearing' in htlc ? {
            clearing: {
                ...htlc.clearing,
                options: htlc.clearing.options.map((instructions) => ({
                    ...instructions,
                    ...('amount' in instructions ? {
                        amount: coinsToUnits(htlc.asset, instructions.amount),
                    } : {}),
                })),
                ...(htlc.clearing.status === ClearingStatus.PARTIAL ? {
                    detail: {
                        amount: coinsToUnits(
                            htlc.asset,
                            (htlc.clearing as ClearingInfo<ClearingStatus.PARTIAL>).detail.amount,
                        ),
                    },
                } : {}),
            },
        } : {}),
        ...('settlement' in htlc ? {
            settlement: htlc.settlement,
        } : {}),
    };

    return contract;
}

function coinsToUnits(asset: OasisAsset, value: string | number, roundUp = false): number {
    let decimals: number;
    switch (asset) {
        case OasisAsset.EUR: decimals = 2; break;
        default: throw new Error(`Invalid asset ${asset}`);
    }
    const parts = value.toString().split('.');
    parts[1] = (parts[1] || '').substr(0, decimals + 1).padEnd(decimals + 1, '0');
    const units = parseInt(parts.join(''), 10) / 10;

    if (roundUp) {
        return Math.ceil(units);
    }

    return Math.floor(units);
}

function base64ToHex(base64: string): string {
    return toHex(fromBase64Url(base64));
}

function hexToBase64(hex: string): string {
    return toBase64Url(fromHex(hex));
}

function fromBase64Url(base64: string): Uint8Array {
    base64 = base64.replace(/_/g, '/').replace(/-/g, '+').replace(/\./g, '=');
    return new Uint8Array(atob(base64).split('').map((c) => c.charCodeAt(0)));
}

function toBase64Url(buffer: Uint8Array): string {
    let byteString = '';
    for (let i = 0; i < buffer.length; i++) {
        const code = buffer[i];
        byteString += String.fromCharCode(code);
    }
    return btoa(byteString).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
}

function fromHex(hex: string): Uint8Array {
    return new Uint8Array((hex.trim().match(/.{2}/g) || []).map((byte) => parseInt(byte, 16)));
}

function toHex(buffer: Uint8Array): string {
    const HEX_ALPHABET = '0123456789abcdef';
    let hex = '';
    for (let i = 0; i < buffer.length; i++) {
        const code = buffer[i];
        hex += HEX_ALPHABET[code >>> 4]; // eslint-disable-line no-bitwise
        hex += HEX_ALPHABET[code & 0x0F]; // eslint-disable-line no-bitwise
    }
    return hex;
}

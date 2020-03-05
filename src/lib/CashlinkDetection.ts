// const FUNDING_CASHLINK = new Uint8Array([0, 130, 128, 146, 135]);
// const CLAIMING_CASHLINK = new Uint8Array([0, 139, 136, 141, 138]);

export const FUNDING_CASHLINK_HEX = '0082809287';
export const CLAIMING_CASHLINK_HEX = '008b888d8a';

export function isFundingCashlink(data: string | Readonly<string>) {
    return data.toLowerCase() === FUNDING_CASHLINK_HEX;
}

export function isClaimingCashlink(data: string | Readonly<string>) {
    return data.toLowerCase() === CLAIMING_CASHLINK_HEX;
}

export function isCashlinkData(data: string | Readonly<string>): boolean {
    return isFundingCashlink(data) || isClaimingCashlink(data);
}
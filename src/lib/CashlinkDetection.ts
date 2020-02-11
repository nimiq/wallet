function arrayEquals(a: Readonly<Uint8Array>, b: Readonly<Uint8Array>) {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

const FUNDING_CASHLINK = new Uint8Array([0, 130, 128, 146, 135]);
const CLAIMING_CASHLINK = new Uint8Array([0, 139, 136, 141, 138]);

export function isFundingCashlink(data: Readonly<Uint8Array>) {
    return arrayEquals(data, FUNDING_CASHLINK);
}

export function isClaimingCashlink(data: Readonly<Uint8Array>) {
    return arrayEquals(data, CLAIMING_CASHLINK);
}

import { Utf8Tools } from '@nimiq/utils';
import { isFundingCashlink, isClaimingCashlink } from './CashlinkDetection';

export function hex2Bytes(hexString: string): Uint8Array {
    return hexString
        ? new Uint8Array(hexString.match(/.{1,2}/g)!.map((hex) => parseInt(hex, 16)))
        : new Uint8Array(0);
}

export function parseDataBytes(dataBytes: Uint8Array | Readonly<Uint8Array>): string {
    if (!dataBytes.length) return '';

    if (isFundingCashlink(dataBytes)) return 'Funding Cashlink';
    if (isClaimingCashlink(dataBytes)) return 'Claiming Cashlink';

    // @ts-ignore Readonly<Uint8Array> is not assignable to Utf8Tools functions
    if (Utf8Tools.isValidUtf8(dataBytes, true)) return Utf8Tools.utf8ByteArrayToString(dataBytes);
    return '<DATA>';
}

export function isCashlinkBytes(dataBytes: Uint8Array | Readonly<Uint8Array>): boolean {
    return isFundingCashlink(dataBytes) || isClaimingCashlink(dataBytes);
}

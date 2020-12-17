import { Utf8Tools } from '@nimiq/utils';
import { isProxyData, ProxyType, ProxyTransactionDirection } from './ProxyDetection';

function hex2Bytes(hexString: string): Uint8Array {
    return hexString
        ? new Uint8Array(hexString.match(/.{1,2}/g)!.map((hex) => parseInt(hex, 16)))
        : new Uint8Array(0);
}

export function parseData(data: string | Readonly<string>): string {
    if (!data) return '';

    if (isProxyData(data, ProxyType.CASHLINK, ProxyTransactionDirection.FUND)) return 'Funding Cashlink';
    if (isProxyData(data, ProxyType.CASHLINK, ProxyTransactionDirection.REDEEM)) return 'Claiming Cashlink';

    const dataBytes = hex2Bytes(data);
    if (Utf8Tools.isValidUtf8(dataBytes, true)) return Utf8Tools.utf8ByteArrayToString(dataBytes);

    return '<DATA>';
}
